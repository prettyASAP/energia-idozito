"""Az API hálózatot nem igénylő végpontjai."""
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="module")
def kliens():
    return TestClient(app)


def test_fooldal_a_klienst_szolgalja_ki(kliens):
    r = kliens.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]


def test_eszkozprofilok(kliens):
    r = kliens.get("/api/devices")
    assert r.status_code == 200
    adat = r.json()
    assert adat["count"] == len(adat["devices"]) > 0
    nevek = {d["name"] for d in adat["devices"]}
    assert {"Mosógép", "Bojler"} <= nevek


def test_varosok(kliens):
    r = kliens.get("/api/cities")
    assert r.status_code == 200
    varosok = r.json()["cities"]
    assert varosok and all({"key", "name", "lat", "lon"} <= set(v) for v in varosok)
    assert all(45.5 < v["lat"] < 48.7 and 16 < v["lon"] < 23 for v in varosok)
