import os
import re
import pandas as pd
import numpy as np

def clean_val(val):
    if pd.isna(val) or val == "-" or str(val).strip() in ["-", "", "nan", "NaN"]:
        return np.nan
    try:
        return float(val)
    except (ValueError, TypeError):
        return np.nan

def load_country_universe(raw_dir: str) -> pd.DataFrame:
    """Loads 202 countries from UNICEF-WHO-LBW-estimates-2023.xlsx.
    
    Country prevalence sheet, header on 9th row (0-indexed 8).
    Filter: Estimate == 'LBW estimate'.
    """
    lbw_path = os.path.join(raw_dir, "UNICEF-WHO-LBW-estimates-2023.xlsx")
    df = pd.read_excel(lbw_path, sheet_name="country prevalence", header=8)
    
    # Filter to Estimate == 'LBW estimate'
    df = df[df["Estimate"] == "LBW estimate"].copy()
    
    # Standardize column names
    df["iso3"] = df["ISO3"].astype(str).str.strip().str.upper()
    df["country_name"] = df["Countries and areas"].astype(str).str.strip()
    df["income_group"] = df["World Bank Income Classification (FY 2022)"].astype(str).str.strip()
    df["region"] = df["World Bank Regions"].astype(str).str.strip()
    
    # 2020 low birth weight estimate
    col_2020 = 2020 if 2020 in df.columns else "2020"
    df["low_birth_weight"] = df[col_2020].apply(clean_val)
    df["low_birth_weight_year"] = df["low_birth_weight"].apply(lambda v: 2020 if pd.notna(v) else np.nan)
    
    universe = df[["iso3", "country_name", "income_group", "region", "low_birth_weight", "low_birth_weight_year"]].copy()
    universe = universe.drop_duplicates(subset=["iso3"])
    return universe

def load_jme(raw_dir: str) -> tuple[pd.DataFrame, dict]:
    """Loads stunting and child overweight from JME_Country_Estimates_March_2026.xlsx.
    
    Returns:
      - 2024 features dataframe (iso3, stunting, stunting_year, child_overweight, child_overweight_year)
      - trends dictionary: {iso3: [{'year': int, 'stunting': float|None, 'child_overweight': float|None}, ...]}
    """
    jme_path = os.path.join(raw_dir, "JME_Country_Estimates_March_2026.xlsx")
    
    df_stunt = pd.read_excel(jme_path, sheet_name="Stunting Prevalence")
    df_overweight = pd.read_excel(jme_path, sheet_name="Overweight Prevalence")
    
    for df in [df_stunt, df_overweight]:
        df["iso3"] = df["ISO Code"].astype(str).str.strip().str.upper()
        df["point_est"] = df["Both Sexes - Point Estimates"].apply(clean_val)
        df["year_int"] = pd.to_numeric(df["Year"], errors="coerce")
    
    # 2024 point estimates (no backfilling)
    s_2024 = df_stunt[df_stunt["year_int"] == 2024].copy()
    s_2024["stunting"] = s_2024["point_est"]
    s_2024["stunting_year"] = s_2024["stunting"].apply(lambda v: 2024 if pd.notna(v) else np.nan)
    s_feats = s_2024[["iso3", "stunting", "stunting_year"]].drop_duplicates(subset=["iso3"])
    
    o_2024 = df_overweight[df_overweight["year_int"] == 2024].copy()
    o_2024["child_overweight"] = o_2024["point_est"]
    o_2024["child_overweight_year"] = o_2024["child_overweight"].apply(lambda v: 2024 if pd.notna(v) else np.nan)
    o_feats = o_2024[["iso3", "child_overweight", "child_overweight_year"]].drop_duplicates(subset=["iso3"])
    
    jme_feats = pd.merge(s_feats, o_feats, on="iso3", how="outer")
    
    # Trends 2000-2024
    trends = {}
    all_iso3 = set(df_stunt["iso3"]).union(set(df_overweight["iso3"]))
    
    stunt_by_iso = df_stunt.groupby("iso3")
    over_by_iso = df_overweight.groupby("iso3")
    
    for iso in all_iso3:
        years_dict = {y: {"year": y, "stunting": None, "child_overweight": None} for y in range(2000, 2025)}
        if iso in stunt_by_iso.groups:
            sub = stunt_by_iso.get_group(iso)
            for _, r in sub.iterrows():
                y = r["year_int"]
                if pd.notna(y) and int(y) in years_dict:
                    val = r["point_est"]
                    years_dict[int(y)]["stunting"] = round(float(val), 2) if pd.notna(val) else None
        if iso in over_by_iso.groups:
            sub = over_by_iso.get_group(iso)
            for _, r in sub.iterrows():
                y = r["year_int"]
                if pd.notna(y) and int(y) in years_dict:
                    val = r["point_est"]
                    years_dict[int(y)]["child_overweight"] = round(float(val), 2) if pd.notna(val) else None
        trends[iso] = sorted(years_dict.values(), key=lambda x: x["year"])
        
    return jme_feats, trends

def _get_latest_indicator_value(df_rows: pd.DataFrame, prefix: str) -> tuple[float, int]:
    """Extracts the most recent non-null year and value from columns matching <prefix>_<year>."""
    year_cols = []
    for col in df_rows.columns:
        m = re.match(rf"^{prefix}_(\d{{4}})$", col)
        if m:
            year_cols.append((int(m.group(1)), col))
    year_cols.sort(key=lambda x: x[0], reverse=True)
    
    for yr, col in year_cols:
        for _, r in df_rows.iterrows():
            val = clean_val(r[col])
            if pd.notna(val):
                return val, yr
    return np.nan, np.nan

def load_gnr(raw_dir: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Loads wasting, adult obesity, adult diabetes, adult anaemia, and exclusive breastfeeding.
    
    Returns:
      - main GNR features dataframe (iso3, wasting, wasting_year, adult_obesity, adult_obesity_year,
                                     adult_diabetes, adult_diabetes_year, anaemia_women, anaemia_women_year)
      - sensitivity features dataframe (iso3, exclusive_breastfeeding, exclusive_breastfeeding_year)
    """
    gnr_path = os.path.join(raw_dir, "Country-Nutrition-Profiles-data_February_2023.xlsx")
    df_burden = pd.read_excel(gnr_path, sheet_name="Country burden")
    df_burden["iso3"] = df_burden["iso3"].astype(str).str.strip().str.upper()
    
    # 1. Wasting: disaggregation == 'sex' and disagg.value == 'Both'
    df_wasting = df_burden[(df_burden["disaggregation"] == "sex") & (df_burden["disagg.value"] == "Both")]
    wasting_records = []
    for iso, grp in df_wasting.groupby("iso3"):
        val, yr = _get_latest_indicator_value(grp, "wasting")
        wasting_records.append({"iso3": iso, "wasting": val, "wasting_year": yr})
    df_w_res = pd.DataFrame(wasting_records)
    
    # 2. Adult obesity: disaggregation == 'sex', disagg.value in {'Female', 'Male'}
    # Feature = mean of latest female and male values
    df_obesity = df_burden[(df_burden["disaggregation"] == "sex") & (df_burden["disagg.value"].isin(["Female", "Male"]))]
    obesity_records = []
    for iso, grp in df_obesity.groupby("iso3"):
        f_sub = grp[grp["disagg.value"] == "Female"]
        m_sub = grp[grp["disagg.value"] == "Male"]
        f_val, f_yr = _get_latest_indicator_value(f_sub, "adult_obesity")
        m_val, m_yr = _get_latest_indicator_value(m_sub, "adult_obesity")
        
        if pd.notna(f_val) and pd.notna(m_val):
            val = (f_val + m_val) / 2.0
            yr = max(f_yr, m_yr)
        elif pd.notna(f_val):
            val = f_val
            yr = f_yr
        elif pd.notna(m_val):
            val = m_val
            yr = m_yr
        else:
            val, yr = np.nan, np.nan
        obesity_records.append({"iso3": iso, "adult_obesity": val, "adult_obesity_year": yr})
    df_ob_res = pd.DataFrame(obesity_records)
    
    # 3. Adult diabetes: disaggregation == 'sex', disagg.value in {'Female', 'Male'}
    # Feature = mean of latest female and male values
    df_diabetes = df_burden[(df_burden["disaggregation"] == "sex") & (df_burden["disagg.value"].isin(["Female", "Male"]))]
    diabetes_records = []
    for iso, grp in df_diabetes.groupby("iso3"):
        f_sub = grp[grp["disagg.value"] == "Female"]
        m_sub = grp[grp["disagg.value"] == "Male"]
        f_val, f_yr = _get_latest_indicator_value(f_sub, "adult_diabetes")
        m_val, m_yr = _get_latest_indicator_value(m_sub, "adult_diabetes")
        
        if pd.notna(f_val) and pd.notna(m_val):
            val = (f_val + m_val) / 2.0
            yr = max(f_yr, m_yr)
        elif pd.notna(f_val):
            val = f_val
            yr = f_yr
        elif pd.notna(m_val):
            val = m_val
            yr = m_yr
        else:
            val, yr = np.nan, np.nan
        diabetes_records.append({"iso3": iso, "adult_diabetes": val, "adult_diabetes_year": yr})
    df_diab_res = pd.DataFrame(diabetes_records)
    
    # 4. Anaemia in women: disaggregation == 'pregnancy' and disagg.value == 'All women'
    df_anaemia = df_burden[(df_burden["disaggregation"] == "pregnancy") & (df_burden["disagg.value"] == "All women")]
    anaemia_records = []
    for iso, grp in df_anaemia.groupby("iso3"):
        val, yr = _get_latest_indicator_value(grp, "adult_anaemia")
        anaemia_records.append({"iso3": iso, "anaemia_women": val, "anaemia_women_year": yr})
    df_anaem_res = pd.DataFrame(anaemia_records)
    
    # Merge main GNR
    gnr_main = pd.merge(df_w_res, df_ob_res, on="iso3", how="outer")
    gnr_main = pd.merge(gnr_main, df_diab_res, on="iso3", how="outer")
    gnr_main = pd.merge(gnr_main, df_anaem_res, on="iso3", how="outer")
    
    # 5. Sensitivity indicator: exclusive breastfeeding from Country diet
    df_diet = pd.read_excel(gnr_path, sheet_name="Country diet")
    df_diet["iso3"] = df_diet["iso3"].astype(str).str.strip().str.upper()
    df_ebf = df_diet[(df_diet["disaggregation"] == "sex") & (df_diet["disagg.value"] == "Both")]
    ebf_records = []
    for iso, grp in df_ebf.groupby("iso3"):
        val, yr = _get_latest_indicator_value(grp, "exclusive_breastfeeding")
        ebf_records.append({"iso3": iso, "exclusive_breastfeeding": val, "exclusive_breastfeeding_year": yr})
    df_ebf_res = pd.DataFrame(ebf_records)
    
    return gnr_main, df_ebf_res

def load_wdi_child_anaemia(raw_dir: str, universe_iso3: set) -> pd.DataFrame:
    """Loads child anaemia from WB_WDI_SH_ANM_CHLD_ZS.csv (or .xlsx).
    
    Restricted to ISO3 codes in universe_iso3. Extracts latest non-null value per country.
    """
    csv_path = os.path.join(raw_dir, "WB_WDI_SH_ANM_CHLD_ZS.csv")
    xlsx_path = os.path.join(raw_dir, "WB_WDI_SH_ANM_CHLD_ZS.xlsx")
    
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    elif os.path.exists(xlsx_path):
        df = pd.read_excel(xlsx_path)
    else:
        raise FileNotFoundError("Neither WB_WDI_SH_ANM_CHLD_ZS.csv nor .xlsx found in raw directory.")
        
    df["iso3"] = df["REF_AREA"].astype(str).str.strip().str.upper()
    df = df[df["iso3"].isin(universe_iso3)].copy()
    
    df["val"] = df["OBS_VALUE"].apply(clean_val)
    df["year"] = pd.to_numeric(df["TIME_PERIOD"], errors="coerce")
    df = df.dropna(subset=["val", "year"])
    
    # Latest value per country
    df = df.sort_values(by=["iso3", "year"], ascending=[True, False])
    latest = df.drop_duplicates(subset=["iso3"], keep="first").copy()
    
    latest["child_anaemia"] = latest["val"]
    latest["child_anaemia_year"] = latest["year"].astype(int)
    
    return latest[["iso3", "child_anaemia", "child_anaemia_year"]]

def ingest_all(raw_dir: str = "data/raw") -> tuple[pd.DataFrame, dict, pd.DataFrame]:
    """Ingests and unifies all datasets joined on ISO3 into the 202-country universe."""
    universe = load_country_universe(raw_dir)
    universe_iso3 = set(universe["iso3"])
    
    jme_feats, trends = load_jme(raw_dir)
    gnr_main, gnr_ebf = load_gnr(raw_dir)
    wdi_child_anaemia = load_wdi_child_anaemia(raw_dir, universe_iso3)
    
    # Merge onto universe
    merged = pd.merge(universe, jme_feats, on="iso3", how="left")
    merged = pd.merge(merged, gnr_main, on="iso3", how="left")
    merged = pd.merge(merged, wdi_child_anaemia, on="iso3", how="left")
    merged = pd.merge(merged, gnr_ebf, on="iso3", how="left")
    
    return merged, trends, universe

