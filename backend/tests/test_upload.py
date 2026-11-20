import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_upload_template():
    with TestClient(app) as client:
        r = client.get("/api/upload/template")
        assert r.status_code == 200
        assert "area_name" in r.text
        assert "stunting" in r.text

def test_upload_valid_csv():
    csv_data = (
        "area_name,state,stunting,wasting,underweight,anaemia_children,anaemia_women,low_bmi_women,overweight_women\n"
        + "\n".join([f"Block_{i},State_{i % 3},{20 + i % 15},{10 + i % 10},{25 + i % 12},{50 + i % 20},{45 + i % 15},{15 + i % 8},{20 + i % 10}" for i in range(25)])
    )
    with TestClient(app) as client:
        files = {"file": ("test.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
        r = client.post("/api/upload/analyse", files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["summary"]["valid_observations"] == 25
        assert len(data["groups"]) >= 2
        assert len(data["records"]) == 25

def test_upload_pii_rejection():
    # Table containing identifiable PII column like 'aadhaar'
    pii_csv = (
        "aadhaar,name,stunting,wasting,underweight\n"
        + "\n".join([f"12345678{i:04d},Person_{i},{20 + i},{10 + i},{25 + i}" for i in range(15)])
    )
    with TestClient(app) as client:
        files = {"file": ("test_pii.csv", io.BytesIO(pii_csv.encode("utf-8")), "text/csv")}
        r = client.post("/api/upload/analyse", files=files)
        assert r.status_code == 400
        assert "personal information detected" in r.json()["detail"].lower()

def test_upload_too_few_rows():
    tiny_csv = (
        "area_name,stunting,wasting,underweight\n"
        "Block 1,25,12,30\n"
        "Block 2,20,10,24\n"
    )
    with TestClient(app) as client:
        files = {"file": ("tiny.csv", io.BytesIO(tiny_csv.encode("utf-8")), "text/csv")}
        r = client.post("/api/upload/analyse", files=files)
        assert r.status_code == 400
        assert "at least 10" in r.json()["detail"].lower()
