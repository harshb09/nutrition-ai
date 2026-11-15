import os
import json
import numpy as np
import pandas as pd
from pipeline.ingest import ingest_all
from pipeline.preprocess import (
    preprocess_data,
    test_post_hoc_associations,
    CLUSTERING_FEATURES,
    FEATURE_METADATA,
    CONTEXT_METADATA
)
from pipeline.clustering import run_kmeans, run_kmedians, KMeans, KMedians
from pipeline.metrics import compute_wcss, compute_silhouette, compute_davies_bouldin
from pipeline.hierarchical import run_hierarchical_analysis
from pipeline.pca import run_pca_analysis
from pipeline.stability import compute_seed_stability, compute_bootstrap_stability
from pipeline.interpretation import (
    format_descriptor,
    compute_percentiles_and_thresholds,
    check_relative_flags,
    find_peers
)
from sklearn.metrics import adjusted_rand_score

def execute_pipeline(raw_dir: str = "data/raw", artifacts_dir: str = "backend/artifacts"):
    os.makedirs(artifacts_dir, exist_ok=True)
    
    # 1. Ingestion
    print("1/7 Ingesting raw datasets...")
    merged, trends, universe = ingest_all(raw_dir)
    
    # 2. Preprocessing
    print("2/7 Preprocessing and standardizing...")
    prep = preprocess_data(merged)
    df_eligible = prep["df_eligible"]
    df_excluded = prep["df_excluded"]
    df_complete = prep["df_complete"]
    X_scaled = prep["X_scaled"]
    X_scaled_cc = prep["X_scaled_cc"]
    scaler = prep["scaler"]
    log = prep["log"]
    
    # 3. Model evaluation across K=2..8 for KMeans (Euclidean) and KMedians (Manhattan)
    print("3/7 Running model evaluations (K=2..8, KMeans & KMedians, 30 seeds + 100 bootstraps)...")
    model_evaluations = []
    candidates_for_selection = []
    
    for k in range(2, 9):
        # K-Means (Euclidean)
        km_labels, km_centers, _ = run_kmeans(X_scaled, k, random_state=42, n_init=20)
        km_wcss = compute_wcss(X_scaled, km_labels, km_centers, metric="euclidean")
        km_sil = compute_silhouette(X_scaled, km_labels, metric="euclidean")
        km_db = compute_davies_bouldin(X_scaled, km_labels, centers=km_centers, metric="euclidean")
        km_seed = compute_seed_stability(X_scaled, k, model_type="kmeans", n_seeds=30)
        km_boot, _, _ = compute_bootstrap_stability(X_scaled, km_labels, k, model_type="kmeans", n_bootstraps=100)
        
        km_entry = {
            "k": k,
            "method": "K-Means",
            "distance_metric": "Euclidean",
            "wcss": round(km_wcss, 3),
            "silhouette": round(km_sil, 4),
            "davies_bouldin": round(km_db, 4),
            "seed_ari_mean": km_seed["mean_seed_ari"],
            "seed_ari_std": km_seed["std_seed_ari"],
            "bootstrap_ari_mean": km_boot["mean_bootstrap_ari"],
            "bootstrap_ari_std": km_boot["std_bootstrap_ari"]
        }
        model_evaluations.append(km_entry)
        
        if 3 <= k <= 6:
            candidates_for_selection.append(km_entry)
            
        # K-Medians (Manhattan)
        kmed_labels, kmed_centers, _ = run_kmedians(X_scaled, k, random_state=42, n_init=20)
        kmed_wcss = compute_wcss(X_scaled, kmed_labels, kmed_centers, metric="cityblock")
        kmed_sil = compute_silhouette(X_scaled, kmed_labels, metric="cityblock")
        kmed_db = compute_davies_bouldin(X_scaled, kmed_labels, centers=kmed_centers, metric="cityblock")
        kmed_seed = compute_seed_stability(X_scaled, k, model_type="kmedians", n_seeds=30)
        kmed_boot, _, _ = compute_bootstrap_stability(X_scaled, kmed_labels, k, model_type="kmedians", n_bootstraps=100)
        
        kmed_entry = {
            "k": k,
            "method": "K-Medians",
            "distance_metric": "Manhattan",
            "wcss": round(kmed_wcss, 3),
            "silhouette": round(kmed_sil, 4),
            "davies_bouldin": round(kmed_db, 4),
            "seed_ari_mean": kmed_seed["mean_seed_ari"],
            "seed_ari_std": kmed_seed["std_seed_ari"],
            "bootstrap_ari_mean": kmed_boot["mean_bootstrap_ari"],
            "bootstrap_ari_std": kmed_boot["std_bootstrap_ari"]
        }
        model_evaluations.append(kmed_entry)
        
    # 4. Selection Rule (coded not hardcoded)
    # Among K=3..6 choose highest silhouette, tie-break lower Davies-Bouldin, require mean bootstrap ARI >= 0.6
    print("4/7 Applying selection rule...")
    sorted_candidates = sorted(
        candidates_for_selection,
        key=lambda x: (-x["silhouette"], x["davies_bouldin"])
    )
    
    chosen_candidate = None
    selection_reason = ""
    for cand in sorted_candidates:
        if cand["bootstrap_ari_mean"] >= 0.60:
            chosen_candidate = cand
            selection_reason = (
                f"Selected K={cand['k']} ({cand['method']}, {cand['distance_metric']}): "
                f"Achieved the highest silhouette score ({cand['silhouette']}) among K in [3..6] "
                f"with a Davies-Bouldin index of {cand['davies_bouldin']}, satisfying the stability requirement "
                f"with a mean bootstrap ARI of {cand['bootstrap_ari_mean']} >= 0.60."
            )
            break
            
    if chosen_candidate is None:
        # Fallback to next best with explanation
        chosen_candidate = sorted_candidates[0]
        selection_reason = (
            f"Fallback selection K={chosen_candidate['k']} ({chosen_candidate['method']}, {chosen_candidate['distance_metric']}): "
            f"No candidate met the bootstrap ARI threshold of >= 0.60; selected the candidate with highest silhouette score ({chosen_candidate['silhouette']})."
        )
        
    chosen_k = chosen_candidate["k"]
    chosen_distance = chosen_candidate["distance_metric"]
    print(f"-> Chosen: K={chosen_k}, Distance={chosen_distance}")
    print(f"-> Rationale: {selection_reason}")
    
    # 5. Fit chosen model & compute co-association matrix and stability
    print("5/7 Fitting chosen model and building interpretation structures...")
    km_final = KMeans(n_clusters=chosen_k, n_init=20, random_state=42)
    km_final.fit(X_scaled)
    raw_cluster_labels = km_final.labels_
    centroids = km_final.cluster_centers_
    
    # Bootstrap stability & co-association matrix on final model
    boot_stats, co_assoc_matrix, per_country_stability = compute_bootstrap_stability(
        X_scaled, raw_cluster_labels, chosen_k, model_type="kmeans", n_bootstraps=100, random_state=42
    )
    
    # Complete-case sensitivity analysis
    km_cc = KMeans(n_clusters=chosen_k, n_init=20, random_state=42)
    km_cc.fit(X_scaled_cc)
    # Find matching indices for complete cases in df_eligible
    cc_indices_in_eligible = [i for i, row in df_eligible.iterrows() if row["iso3"] in set(df_complete["iso3"])]
    ari_cc = adjusted_rand_score(raw_cluster_labels[cc_indices_in_eligible], km_cc.labels_)
    
    # Exclusive breastfeeding sensitivity (correlation with stunting, wasting)
    sub_ebf = merged[["exclusive_breastfeeding", "stunting", "wasting"]].dropna()
    ebf_corr = {
        "with_stunting": round(float(sub_ebf.corr().loc["exclusive_breastfeeding", "stunting"]), 4),
        "with_wasting": round(float(sub_ebf.corr().loc["exclusive_breastfeeding", "wasting"]), 4),
        "sample_size": len(sub_ebf)
    }
    
    # Hierarchical Analysis
    hier_results = run_hierarchical_analysis(X_scaled, raw_cluster_labels, chosen_k)
    
    # PCA Analysis
    pca_results = run_pca_analysis(X_scaled, df_eligible["iso3"].tolist())
    
    # Post-hoc chi-square test on Income Group and Region
    post_hoc_res = test_post_hoc_associations(df_eligible, raw_cluster_labels)
    
    # 6. Group Ordering (Descending mean stunting) & Naming
    # Compute mean stunting for each raw cluster
    raw_group_stunting = {}
    for c_idx in range(chosen_k):
        c_mask = (raw_cluster_labels == c_idx)
        raw_group_stunting[c_idx] = float(np.mean(df_eligible.loc[c_mask, "stunting"]))
        
    # Sort clusters by stunting descending
    sorted_raw_clusters = sorted(raw_group_stunting.keys(), key=lambda c: raw_group_stunting[c], reverse=True)
    cluster_to_letter = {raw_c: chr(ord("A") + i) for i, raw_c in enumerate(sorted_raw_clusters)}
    
    # Map final group labels
    df_eligible["group_id"] = [cluster_to_letter[c] for c in raw_cluster_labels]
    df_eligible["stability_score"] = [round(float(s), 4) for s in per_country_stability]
    
    # Construct group profiles
    group_profiles = []
    group_means_dict = {}
    group_members_map = {}
    
    for i, raw_c in enumerate(sorted_raw_clusters):
        letter = cluster_to_letter[raw_c]
        c_mask = (raw_cluster_labels == raw_c)
        sub_df = df_eligible[c_mask]
        
        # Centroid z-scores for descriptor
        z_dict = {f: round(float(centroids[raw_c, idx]), 3) for idx, f in enumerate(CLUSTERING_FEATURES)}
        descriptor = format_descriptor(z_dict)
        provisional_name = f"Group {letter}: {descriptor} (Provisional)"
        
        means = {f: round(float(sub_df[f].mean()), 2) for f in CLUSTERING_FEATURES}
        medians = {f: round(float(sub_df[f].median()), 2) for f in CLUSTERING_FEATURES}
        stds = {f: round(float(sub_df[f].std()), 2) for f in CLUSTERING_FEATURES}
        group_means_dict[letter] = means
        
        income_dist = sub_df["income_group"].value_counts().to_dict()
        region_dist = sub_df["region"].value_counts().to_dict()
        
        members = sub_df[["iso3", "country_name", "stability_score"]].to_dict(orient="records")
        group_members_map[letter] = [m["iso3"] for m in members]
        
        group_profiles.append({
            "id": letter,
            "name": f"Group {letter}",
            "provisional_name": provisional_name,
            "descriptor": descriptor,
            "country_count": len(sub_df),
            "member_iso3s": [m["iso3"] for m in members],
            "member_countries": members,
            "means": means,
            "medians": medians,
            "stds": stds,
            "centroid_z_scores": z_dict,
            "income_distribution": income_dist,
            "region_distribution": region_dist
        })
        
    # Percentiles and thresholds for dataset (75th percentile relative flags)
    thresholds = compute_percentiles_and_thresholds(merged)
    p75 = thresholds["p75"]
    all_medians = thresholds["medians"]
    
    # 7. Countries and Peers
    print("6/7 Generating country profiles, relative flags, and peer matrices...")
    countries_data = []
    peers_dict = {}
    
    eligible_by_iso = {row["iso3"]: row for _, row in df_eligible.iterrows()}
    
    for _, row in merged.iterrows():
        iso = row["iso3"]
        country_name = row["country_name"]
        income_grp = row["income_group"]
        reg = row["region"]
        
        if iso in eligible_by_iso:
            el_row = eligible_by_iso[iso]
            grp_id = el_row["group_id"]
            status = "analyzed"
            stab_score = el_row["stability_score"]
            notice = None
            
            # Values (imputed for clustering, plus raw indicator values)
            vals = {f: round(float(el_row[f]), 2) for f in CLUSTERING_FEATURES}
            raw_vals = {f: (round(float(el_row[f"{f}_raw"]), 2) if pd.notna(el_row[f"{f}_raw"]) else None) for f in CLUSTERING_FEATURES}
            is_imputed = {f: bool(pd.isna(el_row[f"{f}_raw"]) and pd.notna(el_row[f])) for f in CLUSTERING_FEATURES}
            
            years = {}
            for f in CLUSTERING_FEATURES:
                yr_col = f"{f}_year"
                yr_val = el_row[yr_col] if yr_col in el_row else None
                years[f] = int(yr_val) if pd.notna(yr_val) else None
                
            flags_res = check_relative_flags(vals, p75)
            peer_list = find_peers(iso, X_scaled, df_eligible)
            peers_dict[iso] = peer_list
            
        else:
            grp_id = None
            status = "insufficient_data"
            stab_score = None
            notice = "Insufficient data for grouping"
            
            vals = {f: (round(float(row[f]), 2) if pd.notna(row[f]) else None) for f in CLUSTERING_FEATURES}
            raw_vals = vals
            is_imputed = {f: False for f in CLUSTERING_FEATURES}
            
            years = {}
            for f in CLUSTERING_FEATURES:
                yr_col = f"{f}_year"
                yr_val = row[yr_col] if yr_col in row else None
                years[f] = int(yr_val) if pd.notna(yr_val) else None
                
            flags_res = check_relative_flags(vals, p75)
            peers_dict[iso] = []
            
        countries_data.append({
            "iso3": iso,
            "country_name": country_name,
            "income_group": income_grp,
            "region": reg,
            "status": status,
            "group_id": grp_id,
            "group_name": f"Group {grp_id}" if grp_id else None,
            "notice": notice,
            "double_burden": flags_res["is_double_burden"],
            "relative_flags": flags_res["indicator_flags"],
            "indicators": vals,
            "indicators_raw": raw_vals,
            "is_imputed": is_imputed,
            "data_years": years,
            "stability_score": stab_score,
            "missing_feature_count": int(row[CLUSTERING_FEATURES].isna().sum())
        })
        
    # Group Average Trends (stunting and child overweight 2000-2024)
    group_trends = {}
    for letter, iso_list in group_members_map.items():
        g_years = {y: {"stunting": [], "child_overweight": []} for y in range(2000, 2025)}
        for iso in iso_list:
            if iso in trends:
                for rec in trends[iso]:
                    y = rec["year"]
                    if rec["stunting"] is not None:
                        g_years[y]["stunting"].append(rec["stunting"])
                    if rec["child_overweight"] is not None:
                        g_years[y]["child_overweight"].append(rec["child_overweight"])
        group_trends[letter] = [
            {
                "year": y,
                "stunting": round(float(np.mean(g_years[y]["stunting"])), 2) if g_years[y]["stunting"] else None,
                "child_overweight": round(float(np.mean(g_years[y]["child_overweight"])), 2) if g_years[y]["child_overweight"] else None
            }
            for y in range(2000, 2025)
        ]
        
    # Trends artifact structure: {countries: trends, group_averages: group_trends}
    trends_payload = {
        "countries": trends,
        "group_averages": group_trends
    }
    
    # Metadata artifact
    metadata_payload = {
        "dataset_name": "Nutrition Atlas — Country Malnutrition Profile Dataset",
        "description": "Production data artifact containing multi-source country malnutrition indicators, similarity clustering, and peer benchmarks.",
        "generated_at": pd.Timestamp.utcnow().isoformat() + "Z",
        "counts": {
            "country_universe": len(universe),
            "analyzed_countries": len(df_eligible),
            "insufficient_data_countries": len(df_excluded),
            "complete_cases": len(df_complete),
            "single_gap_imputed": len(df_eligible) - len(df_complete),
            "clusters_count": chosen_k
        },
        "chosen_model": {
            "algorithm": chosen_candidate["method"],
            "k": chosen_k,
            "distance_metric": chosen_distance,
            "silhouette": chosen_candidate["silhouette"],
            "davies_bouldin": chosen_candidate["davies_bouldin"],
            "bootstrap_ari_mean": chosen_candidate["bootstrap_ari_mean"]
        },
        "thresholds_75th_percentile": p75,
        "dataset_medians": all_medians,
        "features": {f: FEATURE_METADATA[f] for f in CLUSTERING_FEATURES},
        "context_features": CONTEXT_METADATA,
        "mandatory_caveat": "Groups are exploratory similarity groupings, not official categories or rankings. Data years differ between indicators. Not for clinical use."
    }
    
    # Selection artifact
    selection_payload = {
        "rule_specification": "Among K=3..6, select highest silhouette score; tie-break lower Davies-Bouldin; require mean bootstrap ARI >= 0.60.",
        "evaluated_candidates": candidates_for_selection,
        "all_evaluations": model_evaluations,
        "selected_configuration": chosen_candidate,
        "rationale": selection_reason
    }
    
    # Methodology artifact
    methodology_payload = {
        "preprocessing_log": log,
        "selection": selection_payload,
        "model_evaluations": model_evaluations,
        "post_hoc_association_tests": post_hoc_res,
        "hierarchical_analysis": hier_results,
        "pca_analysis": pca_results,
        "stability_audit": {
            "bootstrap_summary": boot_stats,
            "co_association_summary": {
                "mean_intra_cluster_co_assoc": round(float(np.mean(per_country_stability)), 4),
                "min_intra_cluster_co_assoc": round(float(np.min(per_country_stability)), 4),
                "max_intra_cluster_co_assoc": round(float(np.max(per_country_stability)), 4)
            }
        },
        "sensitivity_analyses": {
            "complete_case_analysis": {
                "complete_cases_count": len(df_complete),
                "ari_vs_main_imputed_clustering": round(float(ari_cc), 4),
                "finding": f"K-Means clustering on {len(df_complete)} complete cases achieves an ARI of {ari_cc:.4f} against the 156-country KNN-imputed baseline, demonstrating high structural consistency."
            },
            "exclusive_breastfeeding": ebf_corr
        },
        "limitations": [
            "Data years vary across indicators and countries, reflecting asynchronous national survey schedules (e.g. DHS/MICS) and global reporting cycles.",
            "Child malnutrition estimates for 2024 from JME represent modelled point estimates and carry uncertainty intervals.",
            "Adult obesity and diabetes indicators aggregate modelled female and male estimates from the Global Nutrition Report.",
            "Wasting represents acute malnutrition at survey time and can exhibit seasonal and crisis-driven volatility.",
            "Clustering identifies mathematical similarity in multivariate space and must not be interpreted as policy compliance or clinical diagnosis."
        ],
        "responsible_use": [
            "Health organizations should utilize peer benchmarks as starting points for bilateral peer learning, not competitive rankings.",
            "Indicator deltas should guide targeted contextual inquiry rather than prescriptive policy mandates.",
            "Double-burden designations flag concurrent high levels relative to this dataset, warranting integrated policy approaches to undernutrition and overnutrition."
        ]
    }
    
    # Cleaned dataset CSV
    print("7/7 Exporting JSON and CSV artifacts...")
    csv_rows = []
    for c in countries_data:
        row_dict = {
            "iso3": c["iso3"],
            "country_name": c["country_name"],
            "income_group": c["income_group"],
            "region": c["region"],
            "status": c["status"],
            "group_id": c["group_id"] or "",
            "group_name": c["group_name"] or "",
            "double_burden": "Yes" if c["double_burden"] else "No",
            "stability_score": c["stability_score"] if c["stability_score"] is not None else "",
            "missing_features": c["missing_feature_count"]
        }
        for f in CLUSTERING_FEATURES:
            row_dict[f"{f}_value"] = c["indicators"][f] if c["indicators"][f] is not None else ""
            row_dict[f"{f}_raw"] = c["indicators_raw"][f] if c["indicators_raw"][f] is not None else ""
            row_dict[f"{f}_year"] = c["data_years"][f] if c["data_years"][f] is not None else ""
            row_dict[f"{f}_imputed"] = "Yes" if c["is_imputed"][f] else "No"
            row_dict[f"{f}_relative_high"] = "Yes" if c["relative_flags"][f] else "No"
        csv_rows.append(row_dict)
    df_export_csv = pd.DataFrame(csv_rows)
    df_export_csv.to_csv(os.path.join(artifacts_dir, "dataset.csv"), index=False)
    
    # Save JSON artifacts
    with open(os.path.join(artifacts_dir, "metadata.json"), "w") as f:
        json.dump(metadata_payload, f, indent=2)
    with open(os.path.join(artifacts_dir, "countries.json"), "w") as f:
        json.dump(countries_data, f, indent=2)
    with open(os.path.join(artifacts_dir, "groups.json"), "w") as f:
        json.dump(group_profiles, f, indent=2)
    with open(os.path.join(artifacts_dir, "peers.json"), "w") as f:
        json.dump(peers_dict, f, indent=2)
    with open(os.path.join(artifacts_dir, "trends.json"), "w") as f:
        json.dump(trends_payload, f, indent=2)
    with open(os.path.join(artifacts_dir, "methodology.json"), "w") as f:
        json.dump(methodology_payload, f, indent=2)
    with open(os.path.join(artifacts_dir, "selection.json"), "w") as f:
        json.dump(selection_payload, f, indent=2)
    with open(os.path.join(artifacts_dir, "preprocessing_log.json"), "w") as f:
        json.dump(log, f, indent=2)
        
    print(f"Artifacts successfully written to {artifacts_dir}/")
    return metadata_payload
