import pytest

from algorithms.coloring.dsatur import DSATUR
from algorithms.coloring.greedy_coloring import GreedyColoring
from cases.scenario_loader import ScenarioLoader
from config.settings import CASES_DIR

SCENARIO = CASES_DIR / "case_20_asap_sate.yaml"


@pytest.fixture
def loader():
    return ScenarioLoader(SCENARIO)


def _event_data(loader):
    ev = loader.get_execution_plan()["events"][0]
    return {"node": ev["target_node"], "radius": ev["smoke_radius_m"]}


@pytest.mark.parametrize("cls", [GreedyColoring, DSATUR])
def test_pewarnaan_awal_tanpa_konflik(cls, loader):
    solver = cls(loader.build_graph_model())
    colors = solver.run()
    assert all(c is not None for c in colors.values())  # semua titik dapat slot
    assert solver.conflicts() == []                      # tidak ada tetangga satu slot


@pytest.mark.parametrize("cls", [GreedyColoring, DSATUR])
def test_setelah_asap_tetap_tanpa_konflik(cls, loader):
    solver = cls(loader.build_graph_model())
    solver.run()
    _, info = solver.handle_dynamic_event(_event_data(loader))
    assert info["conflicts"] == []
    assert all(c is not None for c in solver.colors.values())


def test_dsatur_tidak_lebih_banyak_dari_greedy(loader):
    hasil = {}
    for cls in (GreedyColoring, DSATUR):
        solver = cls(loader.build_graph_model())
        solver.run()
        solver.handle_dynamic_event(_event_data(loader))
        hasil[cls.__name__] = solver.num_colors()
    print(hasil)
    assert hasil["DSATUR"] <= hasil["GreedyColoring"]