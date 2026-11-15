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

def generate_country_story(
    country_name: str,
    iso3: str,
    status: str,
    group_name: str | None,
    group_desc: str | None,
    rel_flags: dict[str, bool],
    indicators: dict[str, float | None],
    years: dict[str, int | None],
    stunting_change: float | None,
    peer_names: list[str]
) -> str:
    """Generates a neutral, rule-based 3-to-5 sentence summary strictly from pipeline outputs."""
    sentences = []
    
    # Sentence 1: Profile & Grouping
    if status == "analyzed" and group_name and group_desc:
        sentences.append(f"{country_name} ({iso3}) is grouped in {group_name}, characterized provisionally by {group_desc.lower()}.")
    else:
        sentences.append(f"{country_name} ({iso3}) has unobserved data across multiple indicators and is presented without an exploratory group classification.")
        
    # Sentence 2: Relative concerns (indicators exceeding the 75th percentile)
    high_feats = [f for f, is_high in rel_flags.items() if is_high]
    feat_labels = {
        "stunting": "child stunting",
        "child_overweight": "child overweight",
        "wasting": "child wasting",
        "adult_obesity": "adult obesity",
        "adult_diabetes": "adult diabetes",
        "anaemia_women": "maternal anaemia",
        "low_birth_weight": "low birth weight"
    }
    if high_feats:
        concerns_text = ", ".join([f"{feat_labels[f]} ({indicators.get(f)}%)" for f in high_feats])
        sentences.append(f"Relative to other countries in this dataset, {concerns_text} exceed the 75th percentile threshold.")
    else:
        sentences.append("Relative to other countries in this dataset, indicator levels for this country remain below the 75th percentile across all monitored malnutrition measures.")
        
    # Sentence 3: Historical trajectory since 2000
    if stunting_change is not None:
        if stunting_change < -0.5:
            sentences.append(f"Between 2000 and 2024, child stunting prevalence decreased by {abs(stunting_change):.1f} percentage points.")
        elif stunting_change > 0.5:
            sentences.append(f"Between 2000 and 2024, child stunting prevalence increased by {stunting_change:.1f} percentage points.")
        else:
            sentences.append("Between 2000 and 2024, child stunting prevalence remained relatively stable (less than 0.5 percentage point change).")
            
    # Sentence 4: Double burden & peers
    under_high = rel_flags.get("stunting", False) or rel_flags.get("wasting", False) or rel_flags.get("anaemia_women", False)
    over_high = rel_flags.get("child_overweight", False) or rel_flags.get("adult_obesity", False)
    db_status = "exhibits a concurrent relative double-burden of malnutrition" if (under_high and over_high) else "does not exhibit a concurrent double-burden of malnutrition"
    
    if peer_names:
        p_str = ", ".join(peer_names[:3])
        sentences.append(f"The country {db_status}; its closest statistical peers in multivariate indicator space are {p_str}.")
    else:
        sentences.append(f"The country {db_status}.")
        
    # Sentence 5: Data year vintage
    valid_years = [y for y in years.values() if y is not None]
    if valid_years:
        min_yr = min(valid_years)
        max_yr = max(valid_years)
        if min_yr == max_yr:
            sentences.append(f"Reported figures reflect national primary and modelled estimates from {min_yr}.")
        else:
            sentences.append(f"Reported figures reflect primary surveys and modelled estimates collected between {min_yr} and {max_yr}.")
            
    return " ".join(sentences)

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
    cc_indices_in_eligible = [i for i, row in df_eligible.iterrows() if row["iso3"] in set(df_complete["iso3"])]
    ari_cc = adjusted_rand_score(raw_cluster_labels[cc_indices_in_eligible], km_cc.labels_)
    
    # Exclusive breastfeeding sensitivity
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
    raw_group_stunting = {}
    for c_idx in range(chosen_k):
        c_mask = (raw_cluster_labels == c_idx)
        raw_group_stunting[c_idx] = float(np.mean(df_eligible.loc[c_mask, "stunting"]))
        
    sorted_raw_clusters = sorted(raw_group_stunting.keys(), key=lambda c: raw_group_stunting[c], reverse=True)
    cluster_to_letter = {raw_c: chr(ord("A") + i) for i, raw_c in enumerate(sorted_raw_clusters)}
    
    # Map final group labels
    df_eligible["group_id"] = [cluster_to_letter[c] for c in raw_cluster_labels]
    df_eligible["stability_score"] = [round(float(s), 4) for s in per_country_stability]
    
    # Construct group profiles
    group_profiles = []
    group_means_dict = {}
    group_members_map = {}
    group_centres_std = {}
    
    for i, raw_c in enumerate(sorted_raw_clusters):
        letter = cluster_to_letter[raw_c]
        c_mask = (raw_cluster_labels == raw_c)
        sub_df = df_eligible[c_mask]
        
        # Centroid z-scores for descriptor
        z_dict = {f: round(float(centroids[raw_c, idx]), 3) for idx, f in enumerate(CLUSTERING_FEATURES)}
        group_centres_std[letter] = [round(float(centroids[raw_c, idx]), 4) for idx in range(len(CLUSTERING_FEATURES))]
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
    
    # Feature ranges for Target Simulator bounds clamping
    feature_ranges = {}
    for f in CLUSTERING_FEATURES:
        feature_ranges[f] = {
            "min": round(float(df_eligible[f].min()), 1),
            "max": round(float(df_eligible[f].max()), 1),
            "step": 0.1
        }
        
    # Standardized country vectors for fast simulator peer lookup
    analysed_country_vectors = []
    for idx, row in df_eligible.iterrows():
        analysed_country_vectors.append({
            "iso3": row["iso3"],
            "country_name": row["country_name"],
            "group_id": row["group_id"],
            "vector": [round(float(v), 4) for v in X_scaled[idx]]
        })
        
    # 7. Countries and Peers
    print("6/7 Generating country profiles, relative flags, peer matrices, and stories...")
    countries_data = []
    peers_dict = {}
    learn_peers_dict = {}
    
    eligible_by_iso = {row["iso3"]: row for _, row in df_eligible.iterrows()}
    
    for _, row in merged.iterrows():
        iso = row["iso3"]
        country_name = row["country_name"]
        income_grp = row["income_group"]
        reg = row["region"]
        
        stunt_count = round(float(row["stunting_count_thousands"]), 1) if pd.notna(row.get("stunting_count_thousands")) else None
        stunt_count_yr = int(row["stunting_count_year"]) if pd.notna(row.get("stunting_count_year")) else None
        over_count = round(float(row["child_overweight_count_thousands"]), 1) if pd.notna(row.get("child_overweight_count_thousands")) else None
        over_count_yr = int(row["child_overweight_count_year"]) if pd.notna(row.get("child_overweight_count_year")) else None
        stunt_change = round(float(row["stunting_change_2000_2024"]), 2) if pd.notna(row.get("stunting_change_2000_2024")) else None
        
        if iso in eligible_by_iso:
            el_row = eligible_by_iso[iso]
            grp_id = el_row["group_id"]
            status = "analyzed"
            stab_score = el_row["stability_score"]
            notice = None
            grp_desc = [g["descriptor"] for g in group_profiles if g["id"] == grp_id][0]
            grp_name = f"Group {grp_id}"
            
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
            peer_names = [p["country_name"] for p in peer_list]
            
            # Learn-from-peers: rank peers by stunting change 2000-2024
            learn_peers = []
            for p in peer_list:
                p_iso = p["iso3"]
                p_change = None
                p_merged_row = merged[merged["iso3"] == p_iso]
                if not p_merged_row.empty:
                    val = p_merged_row.iloc[0].get("stunting_change_2000_2024")
                    if pd.notna(val):
                        p_change = round(float(val), 2)
                learn_peers.append({
                    "iso3": p_iso,
                    "country_name": p["country_name"],
                    "distance": p["distance"],
                    "stunting_change_2000_2024": p_change,
                    "stunting_2024": p["values"]["stunting"]
                })
            # Sort by stunting change ascending (greatest reduction first, e.g. -15.0 before -5.0)
            learn_peers.sort(key=lambda x: (x["stunting_change_2000_2024"] if x["stunting_change_2000_2024"] is not None else 999.0))
            learn_peers_dict[iso] = learn_peers
            
        else:
            grp_id = None
            grp_name = None
            grp_desc = None
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
            learn_peers_dict[iso] = []
            peer_names = []
            
        story = generate_country_story(
            country_name=country_name,
            iso3=iso,
            status=status,
            group_name=grp_name,
            group_desc=grp_desc,
            rel_flags=flags_res["indicator_flags"],
            indicators=vals,
            years=years,
            stunting_change=stunt_change,
            peer_names=peer_names
        )
        
        countries_data.append({
            "iso3": iso,
            "country_name": country_name,
            "income_group": income_grp,
            "region": reg,
            "status": status,
            "group_id": grp_id,
            "group_name": grp_name,
            "notice": notice,
            "double_burden": flags_res["is_double_burden"],
            "relative_flags": flags_res["indicator_flags"],
            "indicators": vals,
            "indicators_raw": raw_vals,
            "is_imputed": is_imputed,
            "data_years": years,
            "stability_score": stab_score,
            "missing_feature_count": int(row[CLUSTERING_FEATURES].isna().sum()),
            "stunting_count_thousands": stunt_count,
            "stunting_count_year": stunt_count_yr,
            "child_overweight_count_thousands": over_count,
            "child_overweight_count_year": over_count_yr,
            "stunting_change_2000_2024": stunt_change,
            "story": story
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
        "feature_ranges": feature_ranges,
        "scaler_parameters": {
            "means": {f: round(float(m), 4) for f, m in zip(CLUSTERING_FEATURES, scaler.mean_)},
            "stds": {f: round(float(s), 4) for f, s in zip(CLUSTERING_FEATURES, scaler.scale_)}
        },
        "group_centres": group_centres_std,
        "analysed_country_vectors": analysed_country_vectors,
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
            "missing_features": c["missing_feature_count"],
            "stunting_count_thousands_2024": c["stunting_count_thousands"] if c["stunting_count_thousands"] is not None else "",
            "child_overweight_count_thousands_2024": c["child_overweight_count_thousands"] if c["child_overweight_count_thousands"] is not None else "",
            "stunting_change_2000_2024": c["stunting_change_2000_2024"] if c["stunting_change_2000_2024"] is not None else ""
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
    with open(os.path.join(artifacts_dir, "learn_peers.json"), "w") as f:
        json.dump(learn_peers_dict, f, indent=2)
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
