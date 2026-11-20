from fastapi.testclient import TestClient
from app.main import app

def test_india_endpoints():
    with TestClient(app) as client:
        # Meta
        r = client.get("/api/india/meta")
        assert r.status_code == 200
        data = r.json()
        assert data["total_districts"] == 707
        assert data["total_states"] == 36

        # States
        r = client.get("/api/india/states")
        assert r.status_code == 200
        states = r.json()
        assert len(states) == 36

        # Districts filter
        r = client.get("/api/india/districts?state=Bihar")
        assert r.status_code == 200
        dists = r.json()
        assert len(dists) == 38

        # District detail
        r = client.get("/api/india/districts/Bihar/Patna")
        assert r.status_code == 200
        d = r.json()
        assert d["district"] == "Patna"
        assert d["state"] == "Bihar"

        # District peers
        r = client.get("/api/india/districts/Bihar/Patna/like")
        assert r.status_code == 200
        peers = r.json()
        assert len(peers) == 10

        # State summary
        r = client.get("/api/india/state/Bihar/summary")
        assert r.status_code == 200
        st_sum = r.json()
        assert st_sum["state"] == "Bihar"
        assert len(st_sum["districts"]) == 38

        # District brief PDF
        r = client.get("/api/india/district-brief.pdf?state=Bihar&district=Patna")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert len(r.content) > 1000

        # World map
        r = client.get("/api/world/map")
        assert r.status_code == 200

        # Analysis endpoints
        r = client.get("/api/analysis/india/methodology")
        assert r.status_code == 200
        r = client.get("/api/analysis/india/correlation")
        assert r.status_code == 200
        r = client.get("/api/analysis/india/model-selection")
        assert r.status_code == 200
        r = client.get("/api/analysis/india/join-report")
        assert r.status_code == 200
        r = client.get("/api/analysis/india/preprocessing-log")
        assert r.status_code == 200
