from typing import Iterable, Set

from algorithms.coloring.coloring_base import ColoringBase
from algorithms.registry import AlgorithmRegistry


class DSATUR(ColoringBase):
    """DSATUR: selalu warnai dulu titik yang paling 'terjepit'.

    Saturasi = jumlah slot berbeda yang sudah dipakai tetangga.
    Kalau seri: pilih yang jalannya paling banyak (derajat), lalu ID terkecil.
    """

    NAME = "DSATUR"

    def saturation(self, n: int) -> int:
        return len(self.used_colors(n))

    def pick_next(self, candidates: Set[int]) -> int:
        return max(candidates, key=lambda n: (self.saturation(n), self.ug.degree(n), -n))

    def _color_all(self, nodes: Iterable[int]) -> None:
        todo = set(nodes)
        while todo:
            n = self.pick_next(todo)
            sat = self.saturation(n)
            todo.remove(n)
            self.assign_color(
                n,
                extra_text=f" Dipilih duluan: saturasi {sat}, jalan {self.ug.degree(n)}.",
                saturation=sat,
            )

    def run(self, start_node=None, goal_node=None) -> dict:
        self.start_log()
        self._color_all(self.ug.nodes())
        self.finish_log("DSATUR selesai")
        return self.colors

    def _recolor(self, nodes: Iterable[int]) -> None:
        self._color_all(nodes)


AlgorithmRegistry.register("dsatur", DSATUR)