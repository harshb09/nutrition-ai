import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_store import store

@pytest.fixture(scope="module", autouse=True)
def init_store():
    store.load_artifacts()

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["artifacts_loaded"] is True
    assert data["total_countries"] == 202
    assert data["analyzed_countries"] == 156

def test_api_meta(client):
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "features" in data
    assert "thresholds_75th_percentile" in data

def test_api_countries_list(client):
    res = client.get("/api/countries")
    assert res.status_code == 200
    countries = res.json()
    assert len(countries) == 202
    
    # Filter by group_id
    res_a = client.get("/api/countries?group_id=A")
    assert res_a.status_code == 200
    assert len(res_a.json()) > 0
    assert all(c["group_id"] == "A" for c in res_a.json())
    
    # Filter by search
    res_search = client.get("/api/countries?search=india")
    assert res_search.status_code == 200
    results = res_search.json()
    assert any(c["iso3"] == "IND" for c in results)

def test_api_country_detail(client):
    # Valid analyzed country
    res = client.get("/api/countries/IND")
    assert res.status_code == 200
    data = res.json()
    assert data["iso3"] == "IND"
    assert "indicators" in data
    assert "group_means" in data
    assert "dataset_medians" in data
    
    # Excluded country
    res_ex = client.get("/api/countries/AIA")
    assert res_ex.status_code == 200
    data_ex = res_ex.json()
    assert data_ex["status"] == "insufficient_data"
    assert data_ex["notice"] == "Insufficient data for grouping"
    
    # Unknown country 404
    res_404 = client.get("/api/countries/XYZ")
    assert res_404.status_code == 404

def test_api_country_peers(client):
    res = client.get("/api/countries/IND/peers")
    assert res.status_code == 200
    peers = res.json()
    assert len(peers) == 5
    for p in peers:
        assert "distance" in p
        assert "differences" in p
        
    # Unknown country 404
    res_404 = client.get("/api/countries/XYZ/peers")
    assert res_404.status_code == 404

def test_api_country_trends(client):
    res = client.get("/api/countries/IND/trends")
    assert res.status_code == 200
    trends = res.json()
    assert trends["iso3"] == "IND"
    assert len(trends["series"]) == 25
    assert "peers" in trends
    assert "group_average" in trends
    
    # Unknown country 404
    res_404 = client.get("/api/countries/XYZ/trends")
    assert res_404.status_code == 404

def test_api_groups(client):
    res = client.get("/api/groups")
    assert res.status_code == 200
    groups = res.json()
    assert len(groups) == 3
    assert [g["id"] for g in groups] == ["A", "B", "C"]
    
    # Detail valid
    res_a = client.get("/api/groups/A")
    assert res_a.status_code == 200
    grp_a = res_a.json()
    assert grp_a["id"] == "A"
    assert "descriptor" in grp_a
    assert len(grp_a["member_countries"]) > 0
    
    # Detail 404
    res_404 = client.get("/api/groups/UNKNOWN")
    assert res_404.status_code == 404

def test_api_methodology(client):
    res = client.get("/api/methodology")
    assert res.status_code == 200
    meth = res.json()
    assert "preprocessing_log" in meth
    assert "model_evaluations" in meth
    assert "pca_analysis" in meth
    assert "hierarchical_analysis" in meth
    assert "stability_audit" in meth
    assert "sensitivity_analyses" in meth
    assert "limitations" in meth

def test_api_dataset_csv(client):
    res = client.get("/api/dataset.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    text = res.text
    assert "iso3,country_name" in text

def test_api_pdf_brief(client):
    # PDF for valid analyzed country
    res = client.get("/api/countries/IND/brief.pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    assert res.content.startswith(b"%PDF")
    
    # PDF for country with missing data
    res_ex = client.get("/api/countries/AIA/brief.pdf")
    assert res_ex.status_code == 200
    assert res_ex.headers["content-type"] == "application/pdf"
    assert len(res_ex.content) > 1000
    
    # PDF for unknown country 404
    res_404 = client.get("/api/countries/XYZ/brief.pdf")
    assert res_404.status_code == 404

