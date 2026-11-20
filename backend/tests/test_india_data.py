import json
from pathlib import Path
import pytest
from app.services.data_store import store

def test_india_artifacts_loaded():
    store.load_artifacts()
    assert len(store.india_districts) == 707
    assert len(store.india_states) == 36
    assert len(store.india_groups) == 3
    assert len(store.india_districts_like) == 707

def test_join_counts():
    store.load_artifacts()
    rep = store.india_join_report
    assert rep.get("total_nfhs_districts") == 707
    assert rep.get("exact_matches") == 604
    assert rep.get("close_matches") == 15
    assert rep.get("unmatched_districts") == 88

def test_tertile_bands():
    store.load_artifacts()
    d = store.india_districts[0]
    inds = d["indicators"]
    for k in ["stunting", "wasting", "underweight", "anaemia_children"]:
        assert k in inds
        band = inds[k]["band"]
        assert band in ["higher_than_most", "about_typical", "lower_than_most"]

def test_district_state_join_uniqueness():
    store.load_artifacts()
    # Check that ambiguous district names are distinguished by state
    bilaspur_cg = store.get_district_detail("Chhattisgarh", "Bilaspur")
    bilaspur_hp = store.get_district_detail("Himachal Pradesh", "Bilaspur")
    assert bilaspur_cg["district_id"] != bilaspur_hp["district_id"]
    assert bilaspur_cg["state"] == "Chhattisgarh"
    assert bilaspur_hp["state"] == "Himachal Pradesh"
