import pandas as pd
import pytest

from analysis.price_analyzer import analyze_prices, daily_summary, weekly_pattern
from analysis.recommender import _find_windows, recommend


def test_analyze_prices_jeloli_az_olcso_es_draga_orakat(ket_nap):
    orak = analyze_prices(ket_nap, eur_huf=400.0)
    assert len(orak) == 48
    olcso = {pd.Timestamp(o.timestamp).hour for o in orak if o.is_cheap}
    draga = {pd.Timestamp(o.timestamp).hour for o in orak if o.is_expensive}
    assert {2, 3, 4} <= olcso
    assert {18, 19, 20} <= draga
    assert not olcso & draga
    assert orak[0].price_huf_mwh == round(orak[0].price_eur_mwh * 400.0)


def test_ures_bemenet_ures_kimenet():
    ures = pd.Series(dtype=float)
    assert analyze_prices(ures) == []
    assert daily_summary(ures) == []
    assert weekly_pattern(ures) == {}


def test_daily_summary_napi_szelsoertekek(ket_nap):
    napok = daily_summary(ket_nap)
    assert [n.date for n in napok] == ["2026-03-02", "2026-03-03"]
    for n in napok:
        assert n.min_price == 20.0
        assert n.max_price == 200.0
        assert {2, 3, 4} <= set(n.cheapest_hours)
        assert {18, 19, 20} <= set(n.most_expensive_hours)


def test_weekly_pattern_atlagok(ket_nap):
    minta = weekly_pattern(ket_nap)
    assert minta["overall_min"] == 20.0
    assert minta["overall_max"] == 200.0
    assert minta["hourly_avg"][3] == 20.0
    assert set(minta["daily_avg"]) == {"Hétfő", "Kedd"}


def test_find_windows_minden_ablakot_megtalal(ket_nap):
    nap = ket_nap[ket_nap.index.date == ket_nap.index[0].date()]
    ablakok = _find_windows(nap, window_hours=3, eur_huf=400.0)
    assert len(ablakok) == 22
    legolcsobb = min(ablakok, key=lambda a: a["avg_price_eur"])
    assert (legolcsobb["start_hour"], legolcsobb["end_hour"]) == (2, 5)
    assert legolcsobb["avg_price_eur"] == 20.0


def test_recommend_a_legolcsobb_savot_ajanlja(ket_nap):
    ajanlasok = recommend(ket_nap, power_kw=2.0, operation_hours_per_day=3, eur_huf=400.0)
    assert len(ajanlasok) == 2
    a = ajanlasok[0]
    legjobb, legrosszabb = a.best_windows[0], a.worst_window
    assert (legjobb.start_hour, legjobb.end_hour) == (2, 5)
    assert (legrosszabb.start_hour, legrosszabb.end_hour) == (18, 21)
    # 2 kW * 3 óra = 0,006 MWh; 20 vs 200 EUR/MWh 400 Ft-os árfolyamon
    assert legjobb.total_cost_huf == pytest.approx(20 * 400 * 0.006, abs=1)
    assert a.potential_daily_saving_huf == pytest.approx((200 - 20) * 400 * 0.006, abs=1)
    assert legjobb.savings_vs_worst_pct == 90.0
    assert a.annual_saving_huf == pytest.approx(a.potential_daily_saving_huf * 365, abs=365)
    assert len(a.best_windows) == 3
