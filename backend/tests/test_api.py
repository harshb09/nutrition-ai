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

def test_api_learn_peers(client):
    res = client.get("/api/countries/IND/learn-peers")
    assert res.status_code == 200
    peers = res.json()
    assert len(peers) == 5
    for p in peers:
        assert "stunting_change_2000_2024" in p
        assert "series" in p

def test_api_simulate_bounds_clamping(client):
    # Send extreme values well beyond min/max
    extreme_payload = {
        "stunting": 999.0,
        "child_overweight": -50.0,
        "wasting": 100.0,
        "adult_obesity": -10.0,
        "adult_diabetes": 150.0,
        "anaemia_women": -5.0,
        "low_birth_weight": 90.0
    }
    res = client.post("/api/simulate", json=extreme_payload)
    assert res.status_code == 200
    data = res.json()
    clamped = data["clamped_inputs"]
    
    # Check that inputs were clamped to realistic observed ranges
    assert clamped["stunting"] < 100.0
    assert clamped["child_overweight"] >= 0.0
    assert clamped["wasting"] <= 25.0
    assert clamped["adult_obesity"] >= 0.0
    assert "closest_group" in data
    assert "group_closeness" in data
    assert len(data["closest_countries"]) == 5

def test_api_simulate_closest_group_correctness(client):
    # Test for several existing countries: simulated values should recover their own group
    for test_iso in ["IND", "USA", "EGY"]:
        c_res = client.get(f"/api/countries/{test_iso}")
        if c_res.status_code == 200:
            c_data = c_res.json()
            if c_data.get("status") == "analyzed" and c_data.get("group_id"):
                payload = {f: c_data["indicators"][f] for f in [
                    "stunting", "child_overweight", "wasting", "adult_obesity",
                    "adult_diabetes", "anaemia_women", "low_birth_weight"
                ]}
                sim_res = client.post("/api/simulate", json=payload)
                assert sim_res.status_code == 200
                sim_data = sim_res.json()
                assert sim_data["closest_group"]["id"] == c_data["group_id"]
                # The country itself should be among the closest countries
                closest_isos = [cc["iso3"] for cc in sim_data["closest_countries"]]
                assert test_iso in closest_isos

def test_api_simulate_no_model_jargon(client):
    payload = {
        "stunting": 20.0,
        "child_overweight": 5.0,
        "wasting": 5.0,
        "adult_obesity": 15.0,
        "adult_diabetes": 8.0,
        "anaemia_women": 25.0,
        "low_birth_weight": 10.0
    }
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    text_repr = res.text.lower()
    
    # Assert NO machine learning jargon appears in the public simulator response
    forbidden_terms = ["centroid", "cluster", "kmeans", "inertia", "scaler", "loss", "embedding"]
    for term in forbidden_terms:
        assert term not in text_repr, f"Forbidden model jargon '{term}' found in simulation response"

def test_api_burden_and_csv_export(client):
    # Test burden endpoint
    res = client.get("/api/burden?sort_by=stunting_count&sort_order=desc")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total_count"] == 202
    assert "population size" in data["note"].lower()
    
    # Verify no judgmental words in response
    text_repr = res.text.lower()
    for word in ["worst", "best", "most deserving"]:
        assert word not in text_repr, f"Judgmental word '{word}' found in burden response"
        
    # Verify top stunting counts are sorted descending
    valid_counts = [item["stunting_count_thousands"] for item in data["items"] if item["stunting_count_thousands"] is not None]
    assert valid_counts == sorted(valid_counts, reverse=True)
    
    # Test burden CSV export
    csv_res = client.get("/api/burden/csv?sort_by=stunting_count&sort_order=desc")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "iso3,country_name" in csv_res.text
    assert "stunting_count_thousands" in csv_res.text

