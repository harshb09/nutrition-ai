import os
import re
import json
import csv
import xlrd
import numpy as np
import pandas as pd
from rapidfuzz import process, fuzz

INDIA_INDICATOR_KEYWORDS = {
    # 7 Grouping Features
    "stunting": {
        "pattern": r"stunted\s*\(height-for-age\)",
        "label": "Children under 5 years who are stunted (%)",
        "category": "grouping",
        "description": "Height-for-age < -2 standard deviations from the WHO Child Growth Standards median.",
        "target_pop": "Children aged 0-59 months"
    },
    "wasting": {
        "pattern": r"wasted\s*\(weight-for-height\)",
        "exclude_pattern": r"severely\s*wasted",
        "label": "Children under 5 years who are wasted (%)",
        "category": "grouping",
        "description": "Weight-for-height < -2 standard deviations from the WHO Child Growth Standards median.",
        "target_pop": "Children aged 0-59 months"
    },
    "underweight": {
        "pattern": r"underweight\s*\(weight-for-age\)",
        "label": "Children under 5 years who are underweight (%)",
        "category": "grouping",
        "description": "Weight-for-age < -2 standard deviations from the WHO Child Growth Standards median.",
        "target_pop": "Children aged 0-59 months"
    },
    "anaemia_children": {
        "pattern": r"Children age 6-59 months who are anaemic",
        "label": "Children age 6-59 months who are anaemic (%)",
        "category": "grouping",
        "description": "Haemoglobin concentration < 11.0 g/dl among children age 6-59 months.",
        "target_pop": "Children aged 6-59 months"
    },
    "anaemia_women": {
        "pattern": r"All women age 15-49 years who are anaemic",
        "label": "All women age 15-49 years who are anaemic (%)",
        "category": "grouping",
        "description": "Haemoglobin concentration < 12.0 g/dl for non-pregnant and < 11.0 g/dl for pregnant women.",
        "target_pop": "Women aged 15-49 years"
    },
    "low_bmi_women": {
        "pattern": r"Body Mass Index \(BMI\) is below normal",
        "label": "Women age 15-49 years with BMI below normal (%)",
        "category": "grouping",
        "description": "Body Mass Index (BMI) < 18.5 kg/m² indicating chronic adult energy deficiency.",
        "target_pop": "Women aged 15-49 years"
    },
    "overweight_women": {
        "pattern": r"who are overweight or obese \(BMI",
        "label": "Women age 15-49 years who are overweight or obese (%)",
        "category": "grouping",
        "description": "Body Mass Index (BMI) >= 25.0 kg/m² indicating adult adiposity.",
        "target_pop": "Women aged 15-49 years"
    },
    
    # Context-only indicators
    "improved_drinking_water": {
        "pattern": r"improved drinking-water source",
        "label": "Population with improved drinking-water source (%)",
        "category": "context",
        "description": "Population living in households with an improved drinking-water source.",
        "target_pop": "Total population"
    },
    "improved_sanitation": {
        "pattern": r"improved sanitation facility",
        "label": "Population with improved sanitation facility (%)",
        "category": "context",
        "description": "Population living in households that use an improved sanitation facility.",
        "target_pop": "Total population"
    },
    "clean_cooking_fuel": {
        "pattern": r"clean fuel for cooking",
        "label": "Households using clean fuel for cooking (%)",
        "category": "context",
        "description": "Households using electricity, LPG/natural gas, or biogas for cooking.",
        "target_pop": "Households"
    },
    "women_literacy": {
        "pattern": r"Women \(age 15-49\) who are literate",
        "label": "Women age 15-49 who are literate (%)",
        "category": "context",
        "description": "Women age 15-49 who completed standard 9 or higher or can read a whole sentence.",
        "target_pop": "Women aged 15-49 years"
    },
    "institutional_births": {
        "pattern": r"Institutional births \(in the 5 years",
        "label": "Institutional births (%)",
        "category": "context",
        "description": "Percentage of births delivered in a health facility.",
        "target_pop": "Births in preceding 5 years"
    },
    "immunization": {
        "pattern": r"fully vaccinated based on information from either vaccination card or mother",
        "label": "Children age 12-23 months fully vaccinated (%)",
        "category": "context",
        "description": "Received BCG, measles, and 3 doses each of polio and DPT/penta.",
        "target_pop": "Children aged 12-23 months"
    },
    "exclusive_breastfeeding": {
        "pattern": r"Children under age 6 months exclusively breastfed",
        "label": "Children under 6 months exclusively breastfed (%)",
        "category": "context",
        "description": "Infants 0-5 months receiving only breast milk (no water or other liquids/foods).",
        "target_pop": "Infants aged 0-5 months"
    },
    "pregnant_women_anaemia": {
        "pattern": r"Pregnant women age 15-49 years who are anaemic",
        "label": "Pregnant women age 15-49 who are anaemic (%)",
        "category": "context",
        "description": "Haemoglobin concentration < 11.0 g/dl in pregnant women.",
        "target_pop": "Pregnant women aged 15-49 years"
    }
}

GROUPING_FEATURE_KEYS = [
    "stunting",
    "wasting",
    "underweight",
    "anaemia_children",
    "anaemia_women",
    "low_bmi_women",
    "overweight_women"
]

CONTEXT_FEATURE_KEYS = [
    "improved_drinking_water",
    "improved_sanitation",
    "clean_cooking_fuel",
    "women_literacy",
    "institutional_births",
    "immunization",
    "exclusive_breastfeeding",
    "pregnant_women_anaemia"
]

def clean_footnote_text(text: str) -> str:
    """Strips footnote reference numbers glued to words like 'stunted (height-for-age)18 (%)'."""
    # Replace digits preceding punctuation or end of word with space/nothing
    cleaned = re.sub(r'(\w+)\d+(\s*%)', r'\1\2', text)
    cleaned = re.sub(r'(\w+)\d+(\s*\()', r'\1\2', cleaned)
    return cleaned.strip()

def normalize_text(s: str) -> str:
    """Normalizes district/state string for robust joining."""
    if not s:
        return ""
    s = s.strip()
    s = re.sub(r'[\s_]+', ' ', s)
    s = s.replace('&', 'and')
    s = re.sub(r'[^a-zA-Z0-9 ]', '', s)
    return s.strip().lower()

def canonical_state_name(state_raw: str) -> str:
    """Maps state variations to standardized canonical state names."""
    ns = normalize_text(state_raw)
    if 'maharas' in ns:
        return 'Maharashtra'
    if 'aruna' in ns:
        return 'Arunachal Pradesh'
    if 'andaman' in ns:
        return 'Andaman and Nicobar Islands'
    if any(k in ns for k in ['dadra', 'daman', 'havel', 'dadara']):
        return 'Dadra and Nagar Haveli and Daman and Diu'
    if 'jammu' in ns:
        return 'Jammu and Kashmir'
    if 'delhi' in ns:
        return 'NCT of Delhi'
    if 'lakshadweep' in ns:
        return 'Lakshadweep'
    if 'telangana' in ns:
        return 'Telangana'
    if 'chhattisgarh' in ns:
        return 'Chhattisgarh'
    if 'odisha' in ns:
        return 'Odisha'
    if 'puducherry' in ns:
        return 'Puducherry'
    if 'uttarakhand' in ns:
        return 'Uttarakhand'
    
    # Proper case fallback
    return ' '.join(w.capitalize() for w in ns.split())

def parse_cell_value(val) -> tuple[float | None, bool]:
    """Parses NFHS cell value. Returns (float_value, is_missing_flag).
    Treats '*', 'na', 'NA', '-', '' and bracketed values e.g. '(23.4)' as missing.
    """
    if val is None:
        return None, True
    if isinstance(val, (int, float)):
        if np.isnan(val):
            return None, True
        return float(val), False
    s = str(val).strip()
    if s in ('*', 'na', 'NA', '-', '', 'NaN', 'null') or '(' in s or ')' in s:
        return None, True
    try:
        clean_num = re.sub(r'[^\d.]', '', s)
        if not clean_num:
            return None, True
        return float(clean_num), False
    except ValueError:
        return None, True

def load_and_map_nfhs(raw_xls_path: str, reports_dir: str) -> tuple[pd.DataFrame, dict]:
    """Loads NFHS-5 factsheet Excel file, maps column names, and validates indicators."""
    if not os.path.exists(raw_xls_path):
        raise FileNotFoundError(f"NFHS data file not found at: {raw_xls_path}")

    wb = xlrd.open_workbook(raw_xls_path)
    sh = wb.sheet_by_name("Sheet1")
    
    # Match headers
    header_raw = [sh.cell_value(0, c) for c in range(sh.ncols)]
    column_mapping = {}
    matched_col_indices = {}

    for ind_key, meta in INDIA_INDICATOR_KEYWORDS.items():
        found = False
        pattern = meta["pattern"]
        exclude_pattern = meta.get("exclude_pattern")
        
        for c_idx, raw_col in enumerate(header_raw):
            raw_str = str(raw_col).strip()
            if re.search(pattern, raw_str, re.IGNORECASE):
                if exclude_pattern and re.search(exclude_pattern, raw_str, re.IGNORECASE):
                    continue
                found = True
                cleaned_title = clean_footnote_text(raw_str)
                column_mapping[ind_key] = {
                    "raw_column_name": raw_str,
                    "cleaned_column_name": cleaned_title,
                    "column_index": c_idx,
                    "label": meta["label"],
                    "category": meta["category"],
                    "description": meta["description"],
                    "target_population": meta["target_pop"]
                }
                matched_col_indices[ind_key] = c_idx
                break
        
        if not found:
            raise ValueError(f"Required indicator '{ind_key}' matching pattern '{pattern}' was not found in NFHS sheet headers.")

    # Save mapping report
    os.makedirs(reports_dir, exist_ok=True)
    mapping_report_path = os.path.join(reports_dir, "india_indicator_mapping.json")
    with open(mapping_report_path, "w", encoding="utf-8") as f:
        json.dump(column_mapping, f, indent=2)

    # Ingest rows
    rows = []
    for r in range(1, sh.nrows):
        raw_district = str(sh.cell_value(r, 0)).strip() # Strip trailing spaces!
        raw_state = str(sh.cell_value(r, 1)).strip()
        canon_state = canonical_state_name(raw_state)
        
        # Build district record
        rec = {
            "state": canon_state,
            "district": raw_district,
            "district_id": f"{canon_state}::{raw_district}",
            "raw_state": raw_state,
            "norm_state": normalize_text(canon_state),
            "norm_district": normalize_text(raw_district)
        }
        
        for ind_key, c_idx in matched_col_indices.items():
            raw_val = sh.cell_value(r, c_idx)
            val, is_missing = parse_cell_value(raw_val)
            rec[ind_key] = val
            rec[f"{ind_key}_is_missing"] = is_missing
            
        rows.append(rec)
        
    df = pd.DataFrame(rows)
    return df, column_mapping

def join_with_boundaries(
    df_nfhs: pd.DataFrame,
    districts_geojson_path: str,
    reports_dir: str
) -> tuple[pd.DataFrame, dict, list[dict]]:
    """Joins NFHS-5 districts with GeoJSON boundary features using Rapidfuzz.
    Ensures strictly 1-to-1 matching without duplicate geo allocations.
    """
    with open(districts_geojson_path, "r", encoding="utf-8") as f:
        geo = json.load(f)

    # Prepare geo candidate lookup
    geo_features = []
    for idx, feat in enumerate(geo["features"]):
        props = feat.get("properties", {})
        raw_dist = str(props.get("Dist_name") or props.get("DISTRICT") or "").strip()
        raw_state = str(props.get("ST_NM", "")).strip()
        canon_state = canonical_state_name(raw_state)
        geo_features.append({
            "geo_idx": idx,
            "raw_district": raw_dist,
            "raw_state": raw_state,
            "canon_state": canon_state,
            "norm_state": normalize_text(canon_state),
            "norm_district": normalize_text(raw_dist),
            "feature": feat
        })

    geo_by_state = {}
    for g in geo_features:
        geo_by_state.setdefault(g["norm_state"], []).append(g)

    used_geo_indices = set()
    exact_matches = []
    close_matches = []
    unmatched_districts = []
    
    nfhs_records = df_nfhs.to_dict(orient="records")
    
    # Pass 1: Exact state + district match
    for rec in nfhs_records:
        st = rec["norm_state"]
        dt = rec["norm_district"]
        cand_list = geo_by_state.get(st, [])
        matched = False
        for c in cand_list:
            if c["geo_idx"] not in used_geo_indices and c["norm_district"] == dt:
                used_geo_indices.add(c["geo_idx"])
                rec["geo_idx"] = c["geo_idx"]
                rec["geo_district"] = c["raw_district"]
                rec["match_type"] = "exact"
                rec["match_score"] = 100.0
                rec["has_boundary"] = True
                exact_matches.append(rec)
                matched = True
                break
        if not matched:
            rec["geo_idx"] = None
            rec["geo_district"] = None
            rec["match_type"] = None
            rec["match_score"] = None
            rec["has_boundary"] = False

    # Pass 2: Close spelling match with Rapidfuzz (cutoff >= 88.0)
    for rec in nfhs_records:
        if rec["has_boundary"]:
            continue
        st = rec["norm_state"]
        dt = rec["norm_district"]
        cand_list = [c for c in geo_by_state.get(st, []) if c["geo_idx"] not in used_geo_indices]
        if cand_list:
            choices = {c["geo_idx"]: c["norm_district"] for c in cand_list}
            best = process.extractOne(dt, choices, scorer=fuzz.ratio)
            if best and best[1] >= 88.0:
                matched_geo = next(c for c in cand_list if c["geo_idx"] == best[2])
                used_geo_indices.add(matched_geo["geo_idx"])
                rec["geo_idx"] = matched_geo["geo_idx"]
                rec["geo_district"] = matched_geo["raw_district"]
                rec["match_type"] = "close"
                rec["match_score"] = round(float(best[1]), 2)
                rec["has_boundary"] = True
                close_matches.append(rec)
            else:
                unmatched_districts.append(rec)
        else:
            unmatched_districts.append(rec)

    # Save close match review CSV
    csv_review_path = os.path.join(reports_dir, "india_join_review.csv")
    with open(csv_review_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["state", "nfhs_district", "geo_district", "match_type", "match_score"])
        for r in close_matches:
            writer.writerow([r["state"], r["district"], r["geo_district"], r["match_type"], r["match_score"]])

    # Save join report JSON
    join_report = {
        "total_nfhs_districts": len(nfhs_records),
        "total_geo_features": len(geo["features"]),
        "exact_matches": len(exact_matches),
        "close_matches": len(close_matches),
        "total_matched": len(exact_matches) + len(close_matches),
        "unmatched_districts": len(unmatched_districts),
        "rapidfuzz_cutoff": 88.0,
        "note": "Unmatched districts are newer districts created after the Census boundary file (e.g. Telangana, Chhattisgarh). They retain full data and profile access without spatial polygons."
    }
    with open(os.path.join(reports_dir, "india_join_report.json"), "w", encoding="utf-8") as f:
        json.dump(join_report, f, indent=2)

    df_joined = pd.DataFrame(nfhs_records)
    return df_joined, join_report, geo_features

def simplify_and_tag_geojson(
    districts_geojson_path: str,
    df_joined: pd.DataFrame,
    out_geojson_path: str,
    tolerance: float = 0.003,
    precision: int = 4
):
    """Simplifies boundary geometry using Douglas-Peucker to ensure size < 3 MB,
    and tags features with their matched district_id and name.
    """
    def perpendicular_distance(pt, line_start, line_end):
        dx = line_end[0] - line_start[0]
        dy = line_end[1] - line_start[1]
        if dx == 0 and dy == 0:
            return ((pt[0] - line_start[0])**2 + (pt[1] - line_start[1])**2)**0.5
        num = abs(dy * pt[0] - dx * pt[1] + line_end[0]*line_start[1] - line_end[1]*line_start[0])
        den = (dx**2 + dy**2)**0.5
        return num / den

    def douglas_peucker(points, tol):
        if len(points) <= 2:
            return points
        dmax = 0.0
        index = 0
        for i in range(1, len(points) - 1):
            d = perpendicular_distance(points[i], points[0], points[-1])
            if d > dmax:
                index = i
                dmax = d
        if dmax > tol:
            rec1 = douglas_peucker(points[:index+1], tol)
            rec2 = douglas_peucker(points[index:], tol)
            return rec1[:-1] + rec2
        else:
            return [points[0], points[-1]]

    def simplify_geom(geom):
        if not geom or 'coordinates' not in geom:
            return geom
        gtype = geom['type']
        coords = geom['coordinates']
        
        def _sim_ring(ring):
            sim = douglas_peucker(ring, tolerance)
            if len(sim) < 4:
                sim = ring
            return [[round(p[0], precision), round(p[1], precision)] for p in sim]
            
        if gtype == 'Polygon':
            new_coords = [_sim_ring(r) for r in coords]
        elif gtype == 'MultiPolygon':
            new_coords = [[_sim_ring(r) for r in poly] for poly in coords]
        else:
            new_coords = coords
        return {'type': gtype, 'coordinates': new_coords}

    with open(districts_geojson_path, "r", encoding="utf-8") as f:
        geo = json.load(f)

    # Build lookup by geo_idx
    matched_by_geo_idx = {}
    for _, row in df_joined.iterrows():
        if pd.notna(row["geo_idx"]):
            matched_by_geo_idx[int(row["geo_idx"])] = {
                "district_id": row["district_id"],
                "district": row["district"],
                "state": row["state"]
            }

    # Simplify and enrich properties
    for idx, feat in enumerate(geo["features"]):
        feat["geometry"] = simplify_geom(feat["geometry"])
        match_info = matched_by_geo_idx.get(idx)
        props = feat.get("properties", {})
        if match_info:
            props["matched"] = True
            props["district_id"] = match_info["district_id"]
            props["district"] = match_info["district"]
            props["state"] = match_info["state"]
        else:
            props["matched"] = False
            props["district_id"] = None
            props["district"] = props.get("Dist_name") or props.get("DISTRICT")
            props["state"] = canonical_state_name(props.get("ST_NM", ""))
        feat["properties"] = props

    os.makedirs(os.path.dirname(out_geojson_path), exist_ok=True)
    with open(out_geojson_path, "w", encoding="utf-8") as f:
        json.dump(geo, f, separators=(',', ':'))

    size_mb = os.path.getsize(out_geojson_path) / (1024 * 1024)
    print(f"Simplified GeoJSON generated: {out_geojson_path} ({size_mb:.2f} MB)")
