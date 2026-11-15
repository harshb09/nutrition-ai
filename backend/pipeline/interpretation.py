import numpy as np
import pandas as pd
from scipy.spatial.distance import cdist
from pipeline.preprocess import CLUSTERING_FEATURES, FEATURE_METADATA

def format_descriptor(z_scores: dict[str, float]) -> str:
    """Generates human-readable descriptor from centroid z-scores (|z| >= 0.5).
    
    e.g., 'Higher stunting, wasting and anaemia; lower adult obesity'.
    """
    higher = []
    lower = []
    
    feat_short_names = {
        "stunting": "stunting",
        "child_overweight": "child overweight",
        "wasting": "wasting",
        "adult_obesity": "adult obesity",
        "adult_diabetes": "adult diabetes",
        "anaemia_women": "maternal anaemia",
        "low_birth_weight": "low birth weight"
    }
    
    for f in CLUSTERING_FEATURES:
        z = z_scores.get(f, 0.0)
        name = feat_short_names.get(f, f)
        if z >= 0.5:
            higher.append((name, z))
        elif z <= -0.5:
            lower.append((name, z))
            
    # Sort by magnitude
    higher.sort(key=lambda x: x[1], reverse=True)
    lower.sort(key=lambda x: x[1])
    
    parts = []
    if higher:
        h_names = [x[0] for x in higher]
        if len(h_names) == 1:
            parts.append(f"Higher {h_names[0]}")
        elif len(h_names) == 2:
            parts.append(f"Higher {h_names[0]} and {h_names[1]}")
        else:
            parts.append(f"Higher {', '.join(h_names[:-1])} and {h_names[-1]}")
            
    if lower:
        l_names = [x[0] for x in lower]
        if len(l_names) == 1:
            parts.append(f"lower {l_names[0]}")
        elif len(l_names) == 2:
            parts.append(f"lower {l_names[0]} and {l_names[1]}")
        else:
            parts.append(f"lower {', '.join(l_names[:-1])} and {l_names[-1]}")
            
    if not parts:
        return "Moderate profile across all malnutrition indicators"
        
    return "; ".join(parts).capitalize()

def compute_percentiles_and_thresholds(df_all: pd.DataFrame) -> dict:
    """Computes dataset-wide medians and 75th percentiles across all countries with available data."""
    thresholds = {}
    medians = {}
    for f in CLUSTERING_FEATURES:
        series = df_all[f].dropna()
        thresholds[f] = round(float(np.percentile(series, 75)), 2)
        medians[f] = round(float(np.median(series)), 2)
    return {
        "p75": thresholds,
        "medians": medians
    }

def check_relative_flags(values: dict[str, float | None], p75_thresholds: dict[str, float]) -> dict:
    """Evaluates relative flags (value > 75th percentile) and double burden flag.
    
    Double-burden = at least one of {stunting, wasting, anaemia_women} high
                    AND at least one of {child_overweight, adult_obesity} high.
    All labelled 'relative to other countries in this dataset'.
    """
    flags = {}
    for f in CLUSTERING_FEATURES:
        val = values.get(f)
        if val is not None and not pd.isna(val):
            flags[f] = bool(val > p75_thresholds[f])
        else:
            flags[f] = False
            
    under_high = flags.get("stunting", False) or flags.get("wasting", False) or flags.get("anaemia_women", False)
    over_high = flags.get("child_overweight", False) or flags.get("adult_obesity", False)
    
    double_burden = bool(under_high and over_high)
    
    return {
        "indicator_flags": flags,
        "is_double_burden": double_burden,
        "qualification": "relative to other countries in this dataset"
    }

def find_peers(
    country_iso: str,
    X_scaled: np.ndarray,
    df_eligible: pd.DataFrame
) -> list[dict]:
    """Finds the 5 nearest countries by Euclidean distance in standardized space over the 7 features."""
    iso_list = df_eligible["iso3"].tolist()
    if country_iso not in iso_list:
        return []
        
    target_idx = iso_list.index(country_iso)
    target_vec = X_scaled[target_idx].reshape(1, -1)
    
    dists = cdist(target_vec, X_scaled, metric="euclidean")[0]
    
    # Sort indices excluding self
    peer_indices = [i for i in np.argsort(dists) if i != target_idx][:5]
    
    target_row = df_eligible.iloc[target_idx]
    
    peers = []
    for idx in peer_indices:
        peer_row = df_eligible.iloc[idx]
        diffs = {}
        for f in CLUSTERING_FEATURES:
            t_val = target_row[f]
            p_val = peer_row[f]
            if pd.notna(t_val) and pd.notna(p_val):
                diffs[f] = round(float(p_val - t_val), 2)
            else:
                diffs[f] = None
                
        peers.append({
            "iso3": peer_row["iso3"],
            "country_name": peer_row["country_name"],
            "distance": round(float(dists[idx]), 3),
            "differences": diffs,
            "values": {f: round(float(peer_row[f]), 2) if pd.notna(peer_row[f]) else None for f in CLUSTERING_FEATURES}
        })
        
    return peers

