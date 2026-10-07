"""A backend/src kerül a sys.path-ra, ugyanúgy, ahogy a start.sh és az api.main is importál."""
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend" / "src"))


@pytest.fixture
def ket_nap():
    """Két nap óránkénti ára (EUR/MWh): 2–4 óra között a legolcsóbb, 18–20 óra között a legdrágább."""
    idx = pd.date_range("2026-03-02", periods=48, freq="h", tz="Europe/Budapest")
    ar = []
    for ts in idx:
        h = ts.hour
        if 2 <= h < 5:
            ar.append(20.0)
        elif 18 <= h < 21:
            ar.append(200.0)
        else:
            ar.append(80.0 + h)
    return pd.Series(ar, index=idx, name="price_eur_mwh")
