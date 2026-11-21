from typing import Iterable

from algorithms.coloring.coloring_base import ColoringBase
from algorithms.registry import AlgorithmRegistry


class GreedyColoring(ColoringBase):
    """Greedy: proses node berurutan sesuai ID, kasih slot terkecil yang masih kosong."""

    NAME = "Greedy"

    def run(self, start_node=None, goal_node=None) -> dict:
        self.start_log()
        for n in sorted(self.ug.nodes()):  # urutan ID, tanpa mikir apa-apa
            self.assign_color(n)
        self.finish_log("Greedy selesai")
        return self.colors

    def _recolor(self, nodes: Iterable[int]) -> None:
        for n in sorted(nodes):
            self.assign_color(n)


AlgorithmRegistry.register("greedy_coloring", GreedyColoring)
AlgorithmRegistry.register_alias("coloring", "greedy_coloring")