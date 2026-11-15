import pytest
import pandas as pd
import numpy as np
from pipeline.preprocess import preprocess_data, CLUSTERING_FEATURES
from pipeline.interpretation import check_relative_flags

def test_preprocessing_exclusion_and_imputation():
    # Synthetic dataframe with 4 countries
    # C1: 0 missing (complete)
    # C2: 1 missing (eligible for imputation)
    # C3: 2 missing (excluded)
    # C4: 3 missing (excluded)
    data = []
    rng = np.random.RandomState(42)
    
    for i in range(10):
        row = {"iso3": f"C{i:02d}", "country_name": f"Country {i}", "income_group": "Low", "region": "Region A"}
        for f in CLUSTERING_FEATURES:
            row[f] = float(rng.uniform(5, 30))
        data.append(row)
        
    # Introduce missing values
    data[1]["stunting"] = np.nan  # 1 missing
    data[2]["stunting"] = np.nan
    data[2]["wasting"] = np.nan   # 2 missing -> excluded
    
    df = pd.DataFrame(data)
    res = preprocess_data(df)
    
    df_eligible = res["df_eligible"]
    df_excluded = res["df_excluded"]
    
    assert len(df_eligible) == 9
    assert len(df_excluded) == 1
    assert df_excluded.iloc[0]["iso3"] == "C02"
    # Ensure C01 stunting is imputed
    c01_row = df_eligible[df_eligible["iso3"] == "C01"].iloc[0]
    assert pd.notna(c01_row["stunting"])

def test_relative_flags_double_burden():
    p75 = {
        "stunting": 25.0,
        "child_overweight": 8.0,
        "wasting": 7.0,
        "adult_obesity": 20.0,
        "adult_diabetes": 10.0,
        "anaemia_women": 30.0,
        "low_birth_weight": 14.0
    }
    
    # Case 1: High stunting (under) + High adult obesity (over) -> Double Burden
    vals_db = {
        "stunting": 28.0,
        "child_overweight": 5.0,
        "wasting": 4.0,
        "adult_obesity": 25.0,
        "adult_diabetes": 7.0,
        "anaemia_women": 20.0,
        "low_birth_weight": 10.0
    }
    res_db = check_relative_flags(vals_db, p75)
    assert res_db["is_double_burden"] is True
    assert res_db["indicator_flags"]["stunting"] is True
    assert res_db["indicator_flags"]["adult_obesity"] is True
    assert res_db["indicator_flags"]["child_overweight"] is False
    
    # Case 2: Only High stunting (under) -> No Double Burden
    vals_no_db = {
        "stunting": 30.0,
        "child_overweight": 4.0,
        "wasting": 3.0,
        "adult_obesity": 12.0,
        "adult_diabetes": 6.0,
        "anaemia_women": 25.0,
        "low_birth_weight": 11.0
    }
    res_no_db = check_relative_flags(vals_no_db, p75)
    assert res_no_db["is_double_burden"] is False

