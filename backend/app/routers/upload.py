import io
import re
import csv
import math
from typing import Any
import numpy as np
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score
from app.services.data_store import store

router = APIRouter(prefix="/upload", tags=["Upload Your Data"])

PII_KEYWORDS = [
    "name", "first_name", "last_name", "full_name", "patient", "patient_id",
    "phone", "mobile", "cell", "contact", "email", "aadhaar", "aadhar",
    "uid", "ssn", "dob", "birth_date", "birthdate", "date_of_birth",
    "address", "street", "house", "ip_address", "mrn"
]

STANDARD_FEATURE_ALIASES = {
    "stunting": ["stunt", "stunting", "height_for_age", "low_height"],
    "wasting": ["waste", "wasting", "weight_for_height", "low_weight_height"],
    "underweight": ["underweight", "weight_for_age", "low_weight"],
    "anaemia_children": ["anaemia_child", "child_anaemia", "anemia_child", "anaemic_child"],
    "anaemia_women": ["anaemia_women", "women_anaemia", "anemia_women", "anaemic_women", "maternal_anaemia"],
    "low_bmi_women": ["low_bmi", "thinness_women", "underweight_women", "bmi_below_normal"],
    "overweight_women": ["overweight_women", "obese_women", "women_overweight", "bmi_above_normal"]
}

@router.get("/template")
def get_csv_template() -> Response:
    """Returns a sample CSV template for area-level nutrition data upload."""
    sample_csv = (
        "area_name,state,stunting,wasting,underweight,anaemia_children,anaemia_women,low_bmi_women,overweight_women\n"
        "Sample Block 1,Sample State,32.4,18.5,29.1,65.2,54.8,19.2,22.4\n"
        "Sample Block 2,Sample State,24.1,12.0,20.4,45.8,42.1,12.5,31.8\n"
        "Sample Block 3,Sample State,41.2,24.6,38.9,72.1,63.4,26.8,14.2\n"
        "Sample Block 4,Sample State,18.7,9.8,15.2,38.4,36.5,9.4,38.2\n"
        "Sample Block 5,Sample State,35.8,20.1,33.7,68.9,58.2,22.1,18.9\n"
    )
    return Response(
        content=sample_csv,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="nutrition_upload_template.csv"'
        }
    )

def _generate_plain_descriptor(centroid_mean: pd.Series, overall_mean: pd.Series) -> str:
    diffs = centroid_mean - overall_mean
    higher = [col.replace("_", " ").title() for col, diff in diffs.items() if diff > 1.5]
    lower = [col.replace("_", " ").title() for col, diff in diffs.items() if diff < -1.5]
    
    parts = []
    if higher:
        parts.append(f"Higher {', '.join(higher[:2])}")
    if lower:
        parts.append(f"Lower {', '.join(lower[:2])}")
    
    if not parts:
        return "Typical across measured indicators"
    return "; ".join(parts)

@router.post("/analyse")
async def analyse_uploaded_data(
    file: UploadFile = File(...),
    area_col: str | None = Form(None),
    state_col: str | None = Form(None)
) -> dict[str, Any]:
    """Processes user uploaded area-level dataset purely in-memory.
    Detects PII, validates dimensions, standardizes features, clusters dynamically,
    and returns plain-language summaries.
    """
    # 1. Enforce size limit (max 5 MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Parse file into DataFrame
    filename = (file.filename or "").lower()
    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            # Try utf-8, fallback to latin-1
            try:
                df = pd.read_csv(io.StringIO(content.decode("utf-8")))
            except UnicodeDecodeError:
                df = pd.read_csv(io.StringIO(content.decode("latin-1")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse uploaded table: {str(e)}")

    # 3. Dimensionality checks
    n_rows, n_cols = df.shape
    if n_rows > 5000:
        raise HTTPException(status_code=400, detail="Table exceeds 5,000 rows limit.")
    if n_cols > 40:
        raise HTTPException(status_code=400, detail="Table exceeds 40 columns limit.")
    if n_rows < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Too few observations ({n_rows} rows). At least 10 areas/observations are required to identify patterns."
        )

    # 4. PII Guard: Inspect column headers
    cols_lower = [str(c).strip().lower() for c in df.columns]
    for c in cols_lower:
        cleaned_c = re.sub(r"[^a-z_]", "", c)
        for pii in PII_KEYWORDS:
            # Exact match or surrounded by underscores
            if cleaned_c == pii or f"_{pii}" in cleaned_c or f"{pii}_" in cleaned_c:
                # Allow area_name or district_name or state_name
                if any(ok in cleaned_c for ok in ["area", "district", "state", "region", "block", "cluster"]):
                    continue
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Potential personal information detected in column '{c}'. "
                        "This tool only accepts aggregated area-level nutrition estimates (e.g. district or block rates), "
                        "not individual or clinical records."
                    )
                )

    # 5. Identify area and state columns
    resolved_area_col = None
    resolved_state_col = None

    if area_col and area_col in df.columns:
        resolved_area_col = area_col
    else:
        for c in df.columns:
            c_low = c.lower()
            if any(k in c_low for k in ["district", "area", "block", "subdivision", "taluk", "region", "location"]):
                resolved_area_col = c
                break

    if state_col and state_col in df.columns:
        resolved_state_col = state_col
    else:
        for c in df.columns:
            c_low = c.lower()
            if "state" in c_low or "province" in c_low or "ut" in c_low:
                resolved_state_col = c
                break

    # 6. Extract candidate numeric feature columns
    warnings = []
    if n_rows < 30:
        warnings.append(
            f"Small sample size ({n_rows} rows). Identified patterns should be treated as indicative rather than conclusive."
        )

    feature_cols = []
    for c in df.columns:
        if c in [resolved_area_col, resolved_state_col]:
            continue
        # Check if numeric
        numeric_series = pd.to_numeric(df[c], errors="coerce")
        valid_count = numeric_series.notna().sum()
        if valid_count / n_rows >= 0.5:  # At least 50% non-missing
            feature_cols.append(c)

    if len(feature_cols) < 2:
        raise HTTPException(
            status_code=400,
            detail="Could not find at least 2 numeric indicator columns with sufficient data."
        )

    # 7. Clean and prepare feature matrix
    X_raw = df[feature_cols].apply(pd.to_numeric, errors="coerce")
    
    # Drop rows missing > 1/3 of selected feature columns
    missing_ratio_per_row = X_raw.isna().mean(axis=1)
    keep_mask = missing_ratio_per_row <= (1.0 / 3.0)
    dropped_count = int((~keep_mask).sum())
    
    if keep_mask.sum() < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Too many missing values. Only {keep_mask.sum()} rows had sufficient data across the selected indicators."
        )

    if dropped_count > 0:
        warnings.append(f"{dropped_count} rows were excluded due to missing more than one-third of the indicators.")

    df_valid = df[keep_mask].copy().reset_index(drop=True)
    X_valid = X_raw[keep_mask].copy().reset_index(drop=True)

    # Median imputation for remaining missing cells
    imputed_cells = int(X_valid.isna().sum().sum())
    if imputed_cells > 0:
        for col in X_valid.columns:
            median_val = X_valid[col].median()
            X_valid[col] = X_valid[col].fillna(median_val)
        warnings.append(f"{imputed_cells} missing values were filled with the group median.")

    # 8. Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_valid.values)

    # 9. Dynamic K evaluation
    n_samples = len(X_valid)
    max_k = min(8, max(2, n_samples // 4))
    k_range = list(range(2, max_k + 1))

    best_k = 2
    best_score = -1.0
    best_labels = None
    best_kmeans = None

    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        try:
            sil = silhouette_score(X_scaled, labels)
        except Exception:
            sil = 0.0
        if sil > best_score:
            best_score = sil
            best_k = k
            best_labels = labels
            best_kmeans = km

    # Confidence rating
    if best_score >= 0.35 and n_samples >= 50:
        confidence = "High Confidence"
        confidence_desc = "Clear, well-separated patterns observed across areas."
    elif best_score >= 0.22 and n_samples >= 30:
        confidence = "Moderate Confidence"
        confidence_desc = "Plausible distinctions with some overlapping profiles."
    else:
        confidence = "Indicative Only"
        confidence_desc = "Patterns are diffuse; use as exploratory guidance alongside local knowledge."

    # 10. Build Group Summaries
    df_valid["assigned_group"] = best_labels
    overall_mean = X_valid.mean()
    groups_summary = []

    for gid in range(best_k):
        sub_df = X_valid[best_labels == gid]
        g_size = len(sub_df)
        centroid = sub_df.mean()
        descriptor = _generate_plain_descriptor(centroid, overall_mean)
        
        groups_summary.append({
            "group_id": gid + 1,
            "group_name": f"Area Group {gid + 1}",
            "descriptor": descriptor,
            "count": g_size,
            "share_percent": round(100.0 * g_size / n_samples, 1),
            "means": {col: round(float(val), 2) for col, val in centroid.items()}
        })

    # Sort groups by size descending
    groups_summary.sort(key=lambda g: g["count"], reverse=True)
    # Re-map IDs for clean 1..K display
    id_map = {g["group_id"]: i + 1 for i, g in enumerate(groups_summary)}
    for g in groups_summary:
        g["group_id"] = id_map[g["group_id"]]
        g["group_name"] = f"Area Group {g['group_id']}"

    # 11. Records array
    records = []
    centers = best_kmeans.cluster_centers_
    matched_boundary_count = 0

    import rapidfuzz
    known_districts = list(store.india_districts_by_state_dist.keys())

    for idx, row in df_valid.iterrows():
        orig_gid = int(row["assigned_group"])
        remapped_gid = id_map[orig_gid + 1]
        a_name = str(row[resolved_area_col]) if resolved_area_col else f"Area {idx + 1}"
        s_name = str(row[resolved_state_col]) if resolved_state_col else ""
        
        # Calculate distance to group center
        dist = float(np.linalg.norm(X_scaled[idx] - centers[orig_gid]))
        
        # Check boundary match
        matched_id = None
        if s_name:
            cand_key = f"{s_name.strip().lower()}::{a_name.strip().lower()}"
            if cand_key in store.india_districts_by_state_dist:
                matched_id = store.india_districts_by_state_dist[cand_key]["district_id"]
                matched_boundary_count += 1
            else:
                fuzzy = rapidfuzz.process.extractOne(cand_key, known_districts, score_cutoff=88)
                if fuzzy:
                    matched_id = store.india_districts_by_state_dist[fuzzy[0]]["district_id"]
                    matched_boundary_count += 1

        rec = {
            "area_name": a_name,
            "state": s_name,
            "group_id": remapped_gid,
            "group_name": f"Area Group {remapped_gid}",
            "distance_to_center": round(dist, 2),
            "matched_district_id": matched_id,
            "values": {col: round(float(row[col]), 2) for col in feature_cols}
        }
        records.append(rec)

    match_rate = round(100.0 * matched_boundary_count / max(1, n_samples), 1)

    return {
        "summary": {
            "total_rows_received": n_rows,
            "valid_observations": n_samples,
            "excluded_rows": dropped_count,
            "feature_columns_used": feature_cols,
            "groups_discovered": best_k,
            "confidence": confidence,
            "confidence_explanation": confidence_desc,
            "boundary_match_rate": match_rate,
            "can_render_map": match_rate >= 50.0
        },
        "warnings": warnings,
        "groups": groups_summary,
        "records": records
    }
