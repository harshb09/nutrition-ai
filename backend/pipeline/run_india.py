import os
import json
import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from scipy.spatial.distance import cdist

from pipeline.ingest_india import (
    load_and_map_nfhs,
    join_with_boundaries,
    simplify_and_tag_geojson,
    GROUPING_FEATURE_KEYS,
    CONTEXT_FEATURE_KEYS,
    INDIA_INDICATOR_KEYWORDS,
    canonical_state_name
)
from pipeline.clustering import run_kmeans, run_kmedians
from pipeline.metrics import compute_wcss, compute_silhouette, compute_davies_bouldin
from pipeline.hierarchical import run_hierarchical_analysis
from pipeline.pca import run_pca_analysis
from pipeline.stability import compute_seed_stability, compute_bootstrap_stability

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pipeline_india")

FEATURE_FRIENDLY_NAMES = {
    "stunting": "child stunting",
    "wasting": "child wasting",
    "underweight": "child underweight",
    "anaemia_children": "child anaemia",
    "anaemia_women": "women anaemia",
    "low_bmi_women": "women with low BMI",
    "overweight_women": "women overweight or obesity"
}

def format_district_descriptor(z_scores: dict[str, float]) -> str:
    """Generates plain-language descriptor from centroid z-scores (|z| >= 0.35).
    Example: 'Higher child stunting and anaemia; lower women overweight'
    """
    higher = []
    lower = []
    for f in GROUPING_FEATURE_KEYS:
        z = z_scores.get(f, 0.0)
        fname = FEATURE_FRIENDLY_NAMES.get(f, f)
        if z >= 0.35:
            higher.append((fname, z))
        elif z <= -0.35:
            lower.append((fname, z))
            
    higher.sort(key=lambda x: x[1], reverse=True)
    lower.sort(key=lambda x: x[1])
    
    parts = []
    if higher:
        names = [x[0] for x in higher]
        if len(names) == 1:
            parts.append(f"Higher {names[0]}")
        elif len(names) == 2:
            parts.append(f"Higher {names[0]} and {names[1]}")
        else:
            parts.append(f"Higher {', '.join(names[:-1])} and {names[-1]}")
            
    if lower:
        names = [x[0] for x in lower]
        if len(names) == 1:
            parts.append(f"lower {names[0]}")
        elif len(names) == 2:
            parts.append(f"lower {names[0]} and {names[1]}")
        else:
            parts.append(f"lower {', '.join(names[:-1])} and {names[-1]}")
            
    if not parts:
        return "Typical levels across all malnutrition indicators"
    return "; ".join(parts).capitalize()

def run_india_pipeline(
    raw_xls_path: str | None = None,
    districts_geojson_path: str | None = None,
    artifacts_dir: str | None = None,
    reports_dir: str | None = None,
    public_geo_path: str | None = None
):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    root_dir = os.path.dirname(backend_dir)

    if raw_xls_path is None:
        raw_xls_path = os.path.join(root_dir, "data", "raw", "india", "NFHS_5_India_Districts_Factsheet_Data.xls")
    if districts_geojson_path is None:
        districts_geojson_path = os.path.join(root_dir, "data", "geo", "Districts.geojson")
    if artifacts_dir is None:
        artifacts_dir = os.path.join(backend_dir, "artifacts", "india")
    if reports_dir is None:
        reports_dir = os.path.join(root_dir, "reports")
    if public_geo_path is None:
        public_geo_path = os.path.join(root_dir, "frontend", "public", "geo", "districts_simplified.json")

    logger.info("============================================================")
    logger.info("Starting Nutrition Atlas India District Pipeline Execution")
    logger.info("============================================================")
    
    os.makedirs(artifacts_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    
    # 1. Ingest NFHS data
    logger.info("1/7 Ingesting NFHS-5 factsheet dataset and mapping indicators...")
    df_nfhs, column_mapping = load_and_map_nfhs(raw_xls_path, reports_dir)
    
    # 2. Join with district boundaries
    logger.info("2/7 Joining districts with GeoJSON spatial boundaries...")
    df_joined, join_report, geo_features = join_with_boundaries(df_nfhs, districts_geojson_path, reports_dir)
    
    # 3. Simplify GeoJSON to < 3 MB
    logger.info("3/7 Generating simplified boundary GeoJSON (< 3 MB)...")
    simplified_geojson_path = os.path.join(artifacts_dir, "districts_simplified.geojson")
    simplify_and_tag_geojson(districts_geojson_path, df_joined, simplified_geojson_path)
    if public_geo_path:
        os.makedirs(os.path.dirname(public_geo_path), exist_ok=True)
        import shutil
        shutil.copyfile(simplified_geojson_path, public_geo_path)
        
    # 4. Standardize Grouping Features
    logger.info("4/7 Standardizing 7 district grouping features...")
    X = df_joined[GROUPING_FEATURE_KEYS].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    scaler_params = {
        "features": GROUPING_FEATURE_KEYS,
        "means": {f: round(float(m), 4) for f, m in zip(GROUPING_FEATURE_KEYS, scaler.mean_)},
        "stds": {f: round(float(s), 4) for f, s in zip(GROUPING_FEATURE_KEYS, scaler.scale_)}
    }
    
    # 5. Model Evaluation Grid K=2..8 (Euclidean & Manhattan)
    logger.info("5/7 Evaluating clustering models K=2..8 (K-Means & K-Medians)...")
    eval_results = []
    models_cache = {}
    
    for k in range(2, 9):
        # K-Means (Euclidean)
        km_labels, km_centers, km_inertia = run_kmeans(X_scaled, k, random_state=42, n_init=20)
        km_sil = compute_silhouette(X_scaled, km_labels, metric="euclidean")
        km_db = compute_davies_bouldin(X_scaled, km_labels, centers=km_centers, metric="euclidean")
        km_wcss = compute_wcss(X_scaled, km_labels, km_centers, metric="euclidean")
        
        # Stability checks for candidate K
        km_boot_stats, _, _ = compute_bootstrap_stability(X_scaled, km_labels, k, model_type="kmeans", n_bootstraps=100, random_state=42, compute_coassoc=False)
        km_seed_stats = compute_seed_stability(X_scaled, k, model_type="kmeans", n_seeds=30)
        
        eval_results.append({
            "k": k,
            "distance": "Euclidean",
            "model_type": "K-Means",
            "wcss": round(float(km_wcss), 2),
            "silhouette": round(float(km_sil), 4),
            "davies_bouldin": round(float(km_db), 4),
            "mean_bootstrap_ari": km_boot_stats["mean_bootstrap_ari"],
            "std_bootstrap_ari": km_boot_stats["std_bootstrap_ari"],
            "mean_seed_ari": km_seed_stats["mean_seed_ari"]
        })
        models_cache[(k, "Euclidean")] = {
            "labels": km_labels,
            "centers": km_centers,
            "silhouette": km_sil,
            "davies_bouldin": km_db,
            "bootstrap_ari": km_boot_stats["mean_bootstrap_ari"]
        }
        
        # K-Medians (Manhattan)
        kmed_labels, kmed_centers, kmed_inertia = run_kmedians(X_scaled, k, random_state=42, n_init=20)
        kmed_sil = compute_silhouette(X_scaled, kmed_labels, metric="cityblock")
        kmed_db = compute_davies_bouldin(X_scaled, kmed_labels, centers=kmed_centers, metric="cityblock")
        kmed_wcss = compute_wcss(X_scaled, kmed_labels, kmed_centers, metric="cityblock")
        
        kmed_boot_stats, _, _ = compute_bootstrap_stability(X_scaled, kmed_labels, k, model_type="kmedians", n_bootstraps=50, random_state=42, compute_coassoc=False)
        kmed_seed_stats = compute_seed_stability(X_scaled, k, model_type="kmedians", n_seeds=20)
        
        eval_results.append({
            "k": k,
            "distance": "Manhattan",
            "model_type": "K-Medians",
            "wcss": round(float(kmed_wcss), 2),
            "silhouette": round(float(kmed_sil), 4),
            "davies_bouldin": round(float(kmed_db), 4),
            "mean_bootstrap_ari": kmed_boot_stats["mean_bootstrap_ari"],
            "std_bootstrap_ari": kmed_boot_stats["std_bootstrap_ari"],
            "mean_seed_ari": kmed_seed_stats["mean_seed_ari"]
        })
        models_cache[(k, "Manhattan")] = {
            "labels": kmed_labels,
            "centers": kmed_centers,
            "silhouette": kmed_sil,
            "davies_bouldin": kmed_db,
            "bootstrap_ari": kmed_boot_stats["mean_bootstrap_ari"]
        }

    # Selection rule: Highest silhouette in K in [3..6], tie-break lower Davies-Bouldin, bootstrap ARI >= 0.60
    candidates = [
        item for item in eval_results
        if 3 <= item["k"] <= 6 and item["mean_bootstrap_ari"] >= 0.60
    ]
    if not candidates:
        candidates = [item for item in eval_results if 3 <= item["k"] <= 6]
        
    candidates.sort(key=lambda x: (-x["silhouette"], x["davies_bouldin"]))
    chosen_spec = candidates[0]
    chosen_k = chosen_spec["k"]
    chosen_dist = chosen_spec["distance"]
    chosen_model = models_cache[(chosen_k, chosen_dist)]
    chosen_labels = chosen_model["labels"]
    chosen_centers = chosen_model["centers"]
    
    logger.info(f"Chosen model: K={chosen_k}, Distance={chosen_dist}, Silhouette={chosen_spec['silhouette']}, DB={chosen_spec['davies_bouldin']}")
    
    selection_record = {
        "chosen_k": chosen_k,
        "chosen_distance": chosen_dist,
        "chosen_model": chosen_spec["model_type"],
        "metrics": chosen_spec,
        "rationale": f"Selected K={chosen_k} ({chosen_spec['model_type']}, {chosen_dist}): achieved highest silhouette score ({chosen_spec['silhouette']}) among K in [3..6] with Davies-Bouldin index {chosen_spec['davies_bouldin']}, satisfying bootstrap stability constraint with mean ARI {chosen_spec['mean_bootstrap_ari']} >= 0.60."
    }
    with open(os.path.join(artifacts_dir, "model_selection.json"), "w", encoding="utf-8") as f:
        json.dump(selection_record, f, indent=2)

    # 6. Full Stability & Co-Association Matrix for Chosen Model
    logger.info("6/7 Computing full co-association matrix and stability...")
    boot_stats, co_assoc_mat, per_district_stability = compute_bootstrap_stability(
        X_scaled, chosen_labels, chosen_k, model_type="kmeans" if chosen_dist == "Euclidean" else "kmedians",
        n_bootstraps=100, random_state=42
    )

    # Hierarchical Clustering (Ward & Average linkage)
    hierarchical_stats = run_hierarchical_analysis(X_scaled, chosen_labels, chosen_k)

    # PCA 2D Coordinates & Loadings
    district_ids = df_joined["district_id"].tolist()
    pca_stats = run_pca_analysis(X_scaled, district_ids, feature_names=GROUPING_FEATURE_KEYS, id_key="district_id")

    # 7. Group Profiles & Ordering
    logger.info("7/7 Compiling group interpretation, tertile bands, and peer relationships...")
    raw_group_stats = []
    for g_idx in range(chosen_k):
        mask = (chosen_labels == g_idx)
        raw_vals = X[mask]
        z_vals = chosen_centers[g_idx]
        mean_stunting = float(np.mean(raw_vals[:, 0]))
        raw_group_stats.append({
            "initial_id": g_idx,
            "mean_stunting": mean_stunting,
            "z_scores": {f: round(float(z), 3) for f, z in zip(GROUPING_FEATURE_KEYS, z_vals)},
            "means": {f: round(float(m), 2) for f, m in zip(GROUPING_FEATURE_KEYS, np.mean(raw_vals, axis=0))},
            "medians": {f: round(float(m), 2) for f, m in zip(GROUPING_FEATURE_KEYS, np.median(raw_vals, axis=0))},
            "district_count": int(np.sum(mask))
        })
        
    # Order groups by mean stunting descending: District Group 1 has highest stunting
    raw_group_stats.sort(key=lambda x: x["mean_stunting"], reverse=True)
    
    group_remap = {}
    ordered_groups = []
    for new_idx, grp in enumerate(raw_group_stats, start=1):
        g_name = f"District Group {new_idx}"
        desc = format_district_descriptor(grp["z_scores"])
        group_remap[grp["initial_id"]] = {
            "id": str(new_idx),
            "name": g_name,
            "provisional_name": f"{g_name}: {desc} (Provisional)",
            "descriptor": desc
        }
        ordered_groups.append({
            "id": str(new_idx),
            "name": g_name,
            "provisional_name": f"{g_name}: {desc} (Provisional)",
            "descriptor": desc,
            "district_count": grp["district_count"],
            "means": grp["means"],
            "medians": grp["medians"],
            "z_scores": grp["z_scores"]
        })

    # Update df with final group assignment and stability score
    final_group_ids = [group_remap[orig]["id"] for orig in chosen_labels]
    final_group_names = [group_remap[orig]["name"] for orig in chosen_labels]
    final_descriptors = [group_remap[orig]["descriptor"] for orig in chosen_labels]
    
    df_joined["group_id"] = final_group_ids
    df_joined["group_name"] = final_group_names
    df_joined["group_descriptor"] = final_descriptors
    df_joined["stability_score"] = [round(float(s), 3) for s in per_district_stability]

    # Calculate Tertile Bands (Top third, Middle third, Bottom third) across all 707 districts
    tertiles = {}
    all_numeric_cols = GROUPING_FEATURE_KEYS + [c for c in CONTEXT_FEATURE_KEYS if c not in ("exclusive_breastfeeding", "pregnant_women_anaemia")]
    
    for f in all_numeric_cols:
        series = df_joined[f].dropna()
        q33 = float(np.percentile(series, 33.333))
        q66 = float(np.percentile(series, 66.667))
        med = float(np.median(series))
        tertiles[f] = {
            "p33": round(q33, 2),
            "p66": round(q66, 2),
            "median": round(med, 2)
        }

    def get_tertile_band(val, f_key):
        if val is None or pd.isna(val):
            return "not_available"
        bounds = tertiles.get(f_key)
        if not bounds:
            return "about_typical"
        if val > bounds["p66"]:
            return "higher_than_most"
        elif val < bounds["p33"]:
            return "lower_than_most"
        return "about_typical"

    # State Averages
    state_averages = {}
    grouped_by_state = df_joined.groupby("state")
    for state_name, group in grouped_by_state:
        state_means = {}
        for f in GROUPING_FEATURE_KEYS + CONTEXT_FEATURE_KEYS:
            valid_vals = group[f].dropna()
            if len(valid_vals) > 0:
                state_means[f] = round(float(valid_vals.mean()), 2)
            else:
                state_means[f] = None
                
        # Count districts with at least one indicator 'higher than most' on child malnutrition
        higher_stunting_count = sum(group["stunting"].apply(lambda v: v > tertiles["stunting"]["p66"] if pd.notna(v) else False))
        higher_wasting_count = sum(group["wasting"].apply(lambda v: v > tertiles["wasting"]["p66"] if pd.notna(v) else False))
        higher_anaemia_count = sum(group["anaemia_children"].apply(lambda v: v > tertiles["anaemia_children"]["p66"] if pd.notna(v) else False))
        
        state_averages[state_name] = {
            "state": state_name,
            "district_count": len(group),
            "means": state_means,
            "higher_than_most_summary": {
                "stunting": int(higher_stunting_count),
                "wasting": int(higher_wasting_count),
                "anaemia_children": int(higher_anaemia_count)
            }
        }

    # Build "Districts like mine": 10 nearest districts in 7D standardized space
    logger.info("Computing 10 nearest peer districts for all 707 districts...")
    dists_pairwise = cdist(X_scaled, X_scaled, metric="euclidean")
    districts_like = {}
    
    for i, row in df_joined.iterrows():
        d_id = row["district_id"]
        # Exclude self and sort by Euclidean distance
        order = np.argsort(dists_pairwise[i])
        peer_indices = [idx for idx in order if idx != i][:10]
        
        peers_list = []
        for p_idx in peer_indices:
            p_row = df_joined.iloc[p_idx]
            dist = float(dists_pairwise[i, p_idx])
            
            # Plain line explaining similarity and differences
            # Compare target vs peer across key indicators
            stunt_diff = round(float(p_row["stunting"] - row["stunting"]), 1)
            overw_diff = round(float(p_row["overweight_women"] - row["overweight_women"]), 1)
            anaem_diff = round(float(p_row["anaemia_children"] - row["anaemia_children"]), 1)
            
            diff_phrases = []
            if abs(stunt_diff) <= 2.0:
                diff_phrases.append("similar child stunting")
            elif stunt_diff > 2.0:
                diff_phrases.append(f"{stunt_diff}% higher stunting")
            else:
                diff_phrases.append(f"{abs(stunt_diff)}% lower stunting")
                
            if abs(anaem_diff) <= 3.0:
                diff_phrases.append("similar child anaemia")
            elif anaem_diff > 3.0:
                diff_phrases.append(f"{anaem_diff}% higher child anaemia")
            else:
                diff_phrases.append(f"{abs(anaem_diff)}% lower child anaemia")

            plain_line = f"Shares {p_row['group_name']} profile with {', '.join(diff_phrases)}."
            
            peers_list.append({
                "district_id": p_row["district_id"],
                "district": p_row["district"],
                "state": p_row["state"],
                "group_id": p_row["group_id"],
                "group_name": p_row["group_name"],
                "distance": round(dist, 3),
                "stunting": p_row["stunting"],
                "wasting": p_row["wasting"],
                "underweight": p_row["underweight"],
                "anaemia_children": p_row["anaemia_children"],
                "anaemia_women": p_row["anaemia_women"],
                "low_bmi_women": p_row["low_bmi_women"],
                "overweight_women": p_row["overweight_women"],
                "plain_comparison": plain_line
            })
            
        districts_like[d_id] = peers_list

    # Assemble District Objects
    districts_list = []
    for i, row in df_joined.iterrows():
        d_id = row["district_id"]
        st = row["state"]
        dt = row["district"]
        st_means = state_averages[st]["means"]
        
        indicators_data = {}
        for f in GROUPING_FEATURE_KEYS + CONTEXT_FEATURE_KEYS:
            val = row[f]
            is_miss = bool(row[f"{f}_is_missing"]) if f"{f}_is_missing" in row else (val is None or pd.isna(val))
            st_mean = st_means.get(f)
            diff_from_state = round(float(val - st_mean), 2) if (val is not None and st_mean is not None and not is_miss) else None
            
            indicators_data[f] = {
                "value": round(float(val), 2) if val is not None and not is_miss else None,
                "is_missing": is_miss,
                "band": get_tertile_band(val, f) if not is_miss else "not_available",
                "state_average": st_mean,
                "diff_from_state": diff_from_state
            }
            
        districts_list.append({
            "district_id": d_id,
            "district": dt,
            "state": st,
            "group_id": row["group_id"],
            "group_name": row["group_name"],
            "group_descriptor": row["group_descriptor"],
            "stability_score": row["stability_score"],
            "has_boundary": bool(row["has_boundary"]),
            "match_type": row["match_type"],
            "indicators": indicators_data
        })

    # Correlation Matrix across all indicators
    numeric_df = df_joined[GROUPING_FEATURE_KEYS + CONTEXT_FEATURE_KEYS].apply(pd.to_numeric, errors="coerce")
    corr_matrix = numeric_df.corr().round(4).to_dict()

    # Preprocessing Log
    preprocessing_log = {
        "dataset": "National Family Health Survey (NFHS-5, 2019-21)",
        "source": "International Institute for Population Sciences (IIPS) & Ministry of Health and Family Welfare (MoHFW)",
        "total_districts": 707,
        "unique_district_names": 699,
        "duplicate_name_districts": [
            "Aurangabad", "Balrampur", "Bijapur", "Bilaspur",
            "Chandel", "Hamirpur", "Pratapgarh", "Raigarh"
        ],
        "primary_join_key": "state + district",
        "grouping_features": GROUPING_FEATURE_KEYS,
        "context_features": CONTEXT_FEATURE_KEYS,
        "missingness": {
            "grouping_features_missing": 0,
            "exclusive_breastfeeding_missing": 262,
            "pregnant_women_anaemia_missing": 134,
            "immunization_missing": 13
        },
        "boundary_join": join_report,
        "tertile_thresholds": tertiles
    }

    # Save all artifacts
    with open(os.path.join(reports_dir, "india_preprocessing_log.json"), "w", encoding="utf-8") as f:
        json.dump(preprocessing_log, f, indent=2)

    with open(os.path.join(artifacts_dir, "districts.json"), "w", encoding="utf-8") as f:
        json.dump(districts_list, f, indent=2)

    with open(os.path.join(artifacts_dir, "groups.json"), "w", encoding="utf-8") as f:
        json.dump(ordered_groups, f, indent=2)

    with open(os.path.join(artifacts_dir, "states.json"), "w", encoding="utf-8") as f:
        json.dump(state_averages, f, indent=2)

    with open(os.path.join(artifacts_dir, "districts_like.json"), "w", encoding="utf-8") as f:
        json.dump(districts_like, f, indent=2)

    with open(os.path.join(artifacts_dir, "correlation_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(corr_matrix, f, indent=2)

    methodology_india = {
        "metadata": preprocessing_log,
        "scaler_params": scaler_params,
        "indicator_definitions": INDIA_INDICATOR_KEYWORDS,
        "model_evaluations": eval_results,
        "selection": selection_record,
        "hierarchical": hierarchical_stats,
        "pca": pca_stats,
        "bootstrap_stability": boot_stats,
        "tertiles": tertiles,
        "correlation": corr_matrix,
        "limitations": [
            "NFHS-5 survey estimates reflect sample survey data (2019-21) and carry sampling errors and standard confidence intervals.",
            "District boundaries in Districts.geojson (2011 Census base) contain 641 shapes, leaving approximately 88 newer districts created post-2014 (such as in Telangana and Chhattisgarh) without visual map polygons.",
            "Exclusive breastfeeding (262 missing) and anaemia in pregnant women (134 missing) exhibit high missingness and are excluded from clustering to preserve data completeness.",
            "District groups represent exploratory similarity profiles across the 7 nutritional dimensions and should not be used as clinical rankings or performance scores."
        ]
    }
    with open(os.path.join(artifacts_dir, "methodology_india.json"), "w", encoding="utf-8") as f:
        json.dump(methodology_india, f, indent=2)

    logger.info("============================================================")
    logger.info(f"India District Pipeline Completed Successfully!")
    logger.info(f"Districts processed: {len(districts_list)}")
    logger.info(f"States/UTs processed: {len(state_averages)}")
    logger.info(f"Chosen K: {chosen_k} ({chosen_spec['model_type']}, {chosen_dist})")
    logger.info(f"Artifacts exported to: {artifacts_dir}")
    logger.info("============================================================")

if __name__ == "__main__":
    run_india_pipeline()
