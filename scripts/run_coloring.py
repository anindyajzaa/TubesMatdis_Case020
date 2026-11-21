"""Case 20: bandingkan Greedy vs DSATUR, lalu export trace JSON + data untuk web.

Jalankan dari root proyek:
    python -m scripts.run_coloring
Setelah itu buka visualizer/index.html di browser.
"""
import json
import statistics
import time

from algorithms.coloring.dsatur import DSATUR
from algorithms.coloring.greedy_coloring import GreedyColoring
from cases.scenario_loader import ScenarioLoader
from config.settings import BASE_DIR, CASES_DIR

SCENARIO = CASES_DIR / "case_20_asap_sate.yaml"
WEB_DATA = BASE_DIR / "visualizer" / "assets" / "js" / "trace-data.js"
SAMPLE_JSON = BASE_DIR / "visualizer" / "samples" / "case20_trace.json"

# (key, judul di web, kelas)
ALGOS = [
    ("greedy", "Greedy (urut ID)", GreedyColoring),
    ("dsatur", "DSATUR", DSATUR),
]
REPEAT = 200  # jumlah ulangan untuk ukur waktu (diambil median)


def run_once(cls, loader, node, radius):
    """Jalankan 1 algoritma: pewarnaan awal + event asap. Return solver, info, waktu (ms)."""
    solver = cls(loader.build_graph_model())
    t0 = time.perf_counter()
    solver.run()
    t1 = time.perf_counter()
    _, info = solver.handle_dynamic_event({"node": node, "radius": radius})
    t2 = time.perf_counter()
    return solver, info, (t1 - t0) * 1000, (t2 - t1) * 1000


def summarize(solver, info, ms_awal, ms_event):
    done = [l for l in solver.delta_logs if l["event_type"] == "DONE"]
    awal, akhir = done[0], done[-1]
    return {
        "slots_awal": awal["mutations"]["num_colors"],
        "slots_event": akhir["mutations"]["num_colors"],
        "steps_awal": awal["step"],
        "steps_total": solver.step_count,
        "recolored": info["recolored"],
        "conflicts": len(info["conflicts"]),
        "ms_awal": round(ms_awal, 4),
        "ms_event": round(ms_event, 4),
        "sizes_awal": awal["mutations"]["slot_sizes"],
        "sizes_event": akhir["mutations"]["slot_sizes"],
    }


def sweep(loader, node_ids, radius):
    """Coba asap di SETIAP titik, supaya perbandingan tidak cuma bergantung pada 1 lokasi."""
    rows = []
    for n in node_ids:
        row = {"node": n}
        for key, _, cls in ALGOS:
            s = cls(loader.build_graph_model())
            s.run()
            _, info = s.handle_dynamic_event({"node": n, "radius": radius})
            row[key] = {"slots": s.num_colors(), "recolored": len(info["recolored"])}
        rows.append(row)
    return rows


def build_frames(solver, node, radius):
    """Ubah log solver jadi 'frame' yang gampang diputar ulang oleh web."""
    frames = []
    for l in solver.delta_logs:
        m = l["mutations"]
        frames.append({
            "step": l["step"],
            "type": l["event_type"],
            "phase": m["phase"],
            "text": m["action_narrative"],
            "colors": m["colors"],
            "current": m.get("current_node", m.get("target_node")),
            "uncolored": m.get("uncolored", []),
            "reach": m.get("reach", {}),
            "conflict_edges": m["conflict_edges"],
            "smoke": {"node": node, "radius": radius} if m["phase"] == "event" else None,
        })
    return frames


def main():
    loader = ScenarioLoader(SCENARIO)
    meta = loader.get_metadata()
    event = loader.get_execution_plan()["events"][0]
    node, radius = event["target_node"], event["smoke_radius_m"]
    topo = loader.build_graph_model().get_topology_dict()
    names = {n["id"]: n["label"] for n in topo["nodes"]}

    print(f"=== {meta['title']} ===")
    print(f"Event: asap di {names[node]} (node {node}), menyebar {radius:g} m\n")

    algos_out = []
    for key, title, cls in ALGOS:
        solver, info, _, _ = run_once(cls, loader, node, radius)
        runs = [run_once(cls, loader, node, radius) for _ in range(REPEAT)]
        ms_awal = statistics.median(r[2] for r in runs)
        ms_event = statistics.median(r[3] for r in runs)
        summary = summarize(solver, info, ms_awal, ms_event)

        saved = solver.export_trace_json(
            f"output_{meta['case_id']}_{key}.json",
            metadata={**meta, "algorithm": cls.__name__},
        )
        print(f"[{title}] slot awal={summary['slots_awal']} -> setelah asap={summary['slots_event']} | "
              f"langkah={summary['steps_total']} | diwarnai ulang={len(summary['recolored'])} | "
              f"konflik={summary['conflicts']} | {summary['ms_awal']} ms + {summary['ms_event']} ms")
        print(f"   trace -> {saved}")

        algos_out.append({
            "key": key, "title": title, "summary": summary,
            "frames": build_frames(solver, node, radius),
        })

    rows = sweep(loader, [n["id"] for n in topo["nodes"]], radius)
    menang_d = sum(r["dsatur"]["slots"] < r["greedy"]["slots"] for r in rows)
    menang_g = sum(r["greedy"]["slots"] < r["dsatur"]["slots"] for r in rows)
    seri = len(rows) - menang_d - menang_g
    print(f"\nAsap di tiap titik (radius {radius:g} m): DSATUR lebih sedikit slot di {menang_d} titik, "
          f"Greedy di {menang_g} titik, sama di {seri} titik.")

    payload = {
        "meta": meta,
        "nodes": topo["nodes"],
        "edges": topo["edges"],
        "event": {"node": node, "radius": radius, "description": event["description"]},
        "algorithms": algos_out,
        "sweep": rows,
    }

    text = json.dumps(payload, ensure_ascii=False)
    WEB_DATA.parent.mkdir(parents=True, exist_ok=True)
    WEB_DATA.write_text(f"window.TRACE_DATA = {text};\n", encoding="utf-8")
    SAMPLE_JSON.parent.mkdir(parents=True, exist_ok=True)
    SAMPLE_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[OK] Data web -> {WEB_DATA}")


if __name__ == "__main__":
    main()