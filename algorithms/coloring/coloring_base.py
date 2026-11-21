from typing import Any, Dict, Iterable, List

import networkx as nx

from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel


class ColoringBase(BaseGraphAlgorithm):
    """Induk Greedy & DSATUR: graf 2 arah, pencatatan log, cek konflik, dan event asap.

    Anak kelas cukup mengisi: NAME, run(), dan _recolor().
    """

    SUPPORTED_EVENT_TYPES = frozenset({"CONFLICT_NODE_TRIGGER"})
    NAME = "Coloring"

    def __init__(self, model: SpatialGraphModel):
        super().__init__(model)
        # Loader membuat DiGraph (searah), padahal konflik itu 2 arah -> pakai Graph biasa
        self.ug = nx.Graph()
        self.ug.add_nodes_from(self.graph.nodes(data=True))
        for u, v, d in self.graph.edges(data=True):
            self.ug.add_edge(u, v, weight=d.get("weight", 1.0), virtual=False)

        self.colors: Dict[int, Any] = {n: None for n in sorted(self.ug.nodes())}  # None = belum dapat slot
        self.phase = "awal"  # "awal" = pewarnaan pertama, "event" = setelah asap

    # ---------- helper kecil ----------
    def name(self, n: int) -> str:
        return self.ug.nodes[n].get("label") or f"Node {n}"

    def used_colors(self, n: int) -> set:
        """Slot yang sudah dipakai tetangga n."""
        return {self.colors[nb] for nb in self.ug.neighbors(n) if self.colors[nb] is not None}

    def smallest_free_color(self, n: int) -> int:
        used = self.used_colors(n)
        c = 0
        while c in used:
            c += 1
        return c

    def conflicts(self) -> List[List[int]]:
        """Pasangan titik bertetangga yang slot-nya sama (harus kosong)."""
        return [[u, v] for u, v in self.ug.edges
                if self.colors[u] is not None and self.colors[u] == self.colors[v]]

    def num_colors(self) -> int:
        return len({c for c in self.colors.values() if c is not None})

    def slot_sizes(self) -> Dict[int, int]:
        """Jumlah titik di tiap slot (indeks slot mulai dari 0)."""
        sizes: Dict[int, int] = {}
        for c in self.colors.values():
            if c is not None:
                sizes[c] = sizes.get(c, 0) + 1
        return dict(sorted(sizes.items()))

    def virtual_edges(self) -> List[List[int]]:
        """Garis konflik buatan akibat asap."""
        return [[u, v] for u, v, d in self.ug.edges(data=True) if d.get("virtual")]

    def log(self, event_type: str, narrative: str, **extra: Any) -> None:
        """Catat 1 langkah + snapshot warna, supaya web gampang memutar ulang."""
        self.log_step(
            event_type=event_type,
            state_mutations={
                "phase": self.phase,
                "action_narrative": narrative,
                "colors": self.colors.copy(),
                "conflict_edges": self.virtual_edges(),
                **extra,
            },
        )

    # ---------- dipakai anak kelas ----------
    def assign_color(self, n: int, extra_text: str = "", **extra: Any) -> None:
        """Beri titik n slot terkecil yang belum dipakai tetangganya, lalu catat."""
        used = self.used_colors(n)
        c = self.smallest_free_color(n)
        self.colors[n] = c
        used_txt = ", ".join(f"Slot {u + 1}" for u in sorted(used)) or "belum ada"
        self.log(
            "COLOR_ASSIGNED" if self.phase == "awal" else "RECOLOR",
            f"{self.name(n)} dapat Slot {c + 1}. Slot yang sudah dipakai tetangganya: {used_txt}.{extra_text}",
            current_node=n,
            assigned_color=c,
            neighbor_colors=sorted(used),
            **extra,
        )

    def start_log(self) -> None:
        self.log(
            "INITIALIZATION",
            f"Mulai {self.NAME}: {self.ug.number_of_nodes()} titik dan "
            f"{self.ug.number_of_edges()} jalan, semua titik belum punya slot.",
            total_nodes=self.ug.number_of_nodes(),
            total_edges=self.ug.number_of_edges(),
        )

    def finish_log(self, label: str) -> None:
        self.log(
            "DONE",
            f"{label}: {self.num_colors()} slot dipakai, konflik tersisa {len(self.conflicts())}.",
            num_colors=self.num_colors(),
            conflicts=len(self.conflicts()),
            slot_sizes=self.slot_sizes(),
        )

    # ---------- diisi anak kelas ----------
    def run(self, start_node=None, goal_node=None):
        raise NotImplementedError

    def _recolor(self, nodes: Iterable[int]) -> None:
        raise NotImplementedError

    # ---------- event asap sate (sama untuk semua algoritma) ----------
    def handle_dynamic_event(self, event_data: Dict[str, Any]):
        """event_data = {"node": ID lokasi asap, "radius": jangkauan asap (meter)}.

        Titik yang jaraknya <= radius (lewat jalan) dianggap bentrok dengan lokasi asap.
        Titik yang ternyata satu slot dengan lokasi asap dicabut slot-nya, lalu diwarnai ulang.
        """
        self.phase = "event"
        x, radius = event_data["node"], event_data["radius"]

        # Jarak asap dihitung lewat jalan asli (meter), bukan lewat garis konflik buatan
        real = nx.Graph()
        real.add_nodes_from(self.ug.nodes)
        real.add_weighted_edges_from(
            (u, v, d["weight"]) for u, v, d in self.ug.edges(data=True) if not d["virtual"]
        )
        dist = nx.single_source_dijkstra_path_length(real, x, cutoff=radius)
        reach = {n: d for n, d in dist.items() if n != x}

        # Tetangga langsung sudah bentrok dari awal; yang baru = titik dalam radius yang belum terhubung
        new = sorted(n for n in reach if not self.ug.has_edge(x, n))
        for n in new:
            self.ug.add_edge(x, n, weight=reach[n], virtual=True)

        reach_txt = ", ".join(f"{self.name(n)} ({d:g} m)" for n, d in sorted(reach.items(), key=lambda kv: kv[1]))
        self.log(
            "EVENT_SMOKE",
            f"Asap sate muncul di {self.name(x)} (Slot {self.colors[x] + 1}), menyebar {radius:g} m. "
            f"Titik dalam jangkauan: {reach_txt or 'tidak ada'}. "
            f"{len(new)} titik baru dianggap bentrok dengannya.",
            target_node=x,
            radius=radius,
            reach=reach,
            new_conflicts=new,
            slots_before=self.num_colors(),
        )

        # Yang slot-nya sama dengan lokasi asap harus dihitung ulang (lokasi asap tetap)
        clash = [n for n in new if self.colors[n] == self.colors[x]]
        for n in clash:
            self.colors[n] = None
        if clash:
            self.log(
                "UNCOLOR",
                "Slot dicabut dari: " + ", ".join(self.name(n) for n in clash)
                + f" (sama-sama Slot {self.colors[x] + 1} dengan {self.name(x)}).",
                uncolored=clash,
            )
            self._recolor(clash)
        else:
            self.log("NO_CLASH", "Tidak ada titik yang bentrok, semua slot tetap.")

        self.finish_log("Selesai setelah asap")
        return self.colors, {"recolored": clash, "conflicts": self.conflicts()}