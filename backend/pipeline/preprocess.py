import json
import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler
from scipy.stats import chi2_contingency

CLUSTERING_FEATURES = [
    "stunting",
    "child_overweight",
    "wasting",
    "adult_obesity",
    "adult_diabetes",
    "anaemia_women",
    "low_birth_weight"
]

FEATURE_METADATA = {
    "stunting": {
        "label": "Child Stunting (% under 5)",
        "source": "UNICEF / WHO / World Bank Joint Malnutrition Estimates (March 2026)",
        "target_pop": "Children aged 0-59 months",
        "description": "Height-for-age < -2 standard deviations from the WHO Child Growth Standards median.",
        "relevance": "Key marker of chronic undernutrition and structural deprivation in early childhood.",
        "unit": "%",
        "year_source": "Point estimate 2024"
    },
    "child_overweight": {
        "label": "Child Overweight (% under 5)",
        "source": "UNICEF / WHO / World Bank Joint Malnutrition Estimates (March 2026)",
        "target_pop": "Children aged 0-59 months",
        "description": "Weight-for-height > +2 standard deviations from the WHO Child Growth Standards median.",
        "relevance": "Emerging form of paediatric malnutrition signaling nutrition transition.",
        "unit": "%",
        "year_source": "Point estimate 2024"
    },
    "wasting": {
        "label": "Child Wasting (% under 5)",
        "source": "Global Nutrition Report (Country Nutrition Profiles Feb 2023)",
        "target_pop": "Children aged 0-59 months",
        "description": "Weight-for-height < -2 standard deviations from the WHO Child Growth Standards median.",
        "relevance": "Acute malnutrition indicator reflecting rapid weight loss or failure to gain weight.",
        "unit": "%",
        "year_source": "Latest available country survey"
    },
    "adult_obesity": {
        "label": "Adult Obesity (%)",
        "source": "Global Nutrition Report (Country Nutrition Profiles Feb 2023)",
        "target_pop": "Adults aged 18+ (mean of female & male)",
        "description": "Body Mass Index (BMI) >= 30 kg/m².",
        "relevance": "Primary driver of metabolic non-communicable diseases (NCDs) and cardiovascular morbidity.",
        "unit": "%",
        "year_source": "Latest available NCD-RisC / WHO estimate"
    },
    "adult_diabetes": {
        "label": "Adult Diabetes (%)",
        "source": "Global Nutrition Report (Country Nutrition Profiles Feb 2023)",
        "target_pop": "Adults aged 18+ (mean of female & male)",
        "description": "Fasting blood glucose >= 7.0 mmol/L or on medication for raised blood glucose.",
        "relevance": "Major metabolic chronic outcome directly linked to dietary quality and adiposity.",
        "unit": "%",
        "year_source": "Latest available NCD-RisC / WHO estimate"
    },
    "anaemia_women": {
        "label": "Anaemia in Women of Reproductive Age (%)",
        "source": "Global Nutrition Report (Country Nutrition Profiles Feb 2023)",
        "target_pop": "Women aged 15-49 years (all women)",
        "description": "Haemoglobin concentration < 120 g/L for non-pregnant and < 110 g/L for pregnant women.",
        "relevance": "Pivotal indicator of micronutrient deficiency (iron, folate) affecting maternal-child health.",
        "unit": "%",
        "year_source": "Latest available WHO estimate"
    },
    "low_birth_weight": {
        "label": "Low Birth Weight (% of live births)",
        "source": "UNICEF-WHO Low Birthweight Estimates (2023)",
        "target_pop": "Newborns",
        "description": "Birth weight strictly less than 2,500 grams (up to and including 2,499 g).",
        "relevance": "Early life proxy for intrauterine growth restriction and maternal undernutrition.",
        "unit": "%",
        "year_source": "Modelled estimate 2020"
    }
}

CONTEXT_METADATA = {
    "child_anaemia": {
        "label": "Prevalence of Anaemia in Children (% of children under 5)",
        "source": "World Bank World Development Indicators (SH.ANM.CHLD.ZS)",
        "relevance": "Contextual validation indicator. Excluded from clustering due to strong correlation (~0.90) with anaemia in women to avoid double-weighting.",
        "unit": "%"
    },
    "exclusive_breastfeeding": {
        "label": "Exclusive Breastfeeding (% under 6 months)",
        "source": "Global Nutrition Report (Country Nutrition Profiles Feb 2023)",
        "relevance": "Infant feeding protection factor used solely in sensitivity analysis.",
        "unit": "%"
    }
}

def generate_relevance_table():
    rows = []
    for f in CLUSTERING_FEATURES:
        meta = FEATURE_METADATA[f]
        rows.append({
            "feature": f,
            "label": meta["label"],
            "target_population": meta["target_pop"],
            "description": meta["description"],
            "public_health_relevance": meta["relevance"],
            "source": meta["source"],
            "unit": meta["unit"],
            "data_year_source": meta["year_source"]
        })
    return rows

def compute_missingness_summary(df: pd.DataFrame) -> list[dict]:
    res = []
    total = len(df)
    for f in CLUSTERING_FEATURES:
        n_missing = int(df[f].isna().sum())
        n_valid = total - n_missing
        pct_missing = round(n_missing / total * 100.0, 2)
        
        # Year info
        yr_col = f"{f}_year" if f"{f}_year" in df.columns else None
        if yr_col and yr_col in df:
            years = df[yr_col].dropna().astype(int)
            min_yr = int(years.min()) if len(years) > 0 else None
            max_yr = int(years.max()) if len(years) > 0 else None
            median_yr = int(years.median()) if len(years) > 0 else None
        else:
            min_yr, max_yr, median_yr = None, None, None
            
        res.append({
            "feature": f,
            "label": FEATURE_METADATA[f]["label"],
            "missing_count": n_missing,
            "valid_count": n_valid,
            "missing_pct": pct_missing,
            "year_min": min_yr,
            "year_max": max_yr,
            "year_median": median_yr
        })
    return res

def compute_correlation_matrix(df: pd.DataFrame) -> dict:
    all_cols = [c for c in (CLUSTERING_FEATURES + ["child_anaemia"]) if c in df.columns]
    sub = df[all_cols].dropna(how="all")
    corr = sub.corr(method="pearson").round(4)
    # Convert NaN to None for JSON
    corr_dict = {}
    for col in all_cols:
        corr_dict[col] = {}
        for row in all_cols:
            val = corr.loc[row, col]
            corr_dict[col][row] = round(float(val), 4) if pd.notna(val) else None
    return corr_dict

def preprocess_data(merged: pd.DataFrame) -> dict:
    """Carries out the preprocessing decisions:
    1. Assess missingness across 7 clustering features
    2. Exclude countries missing > 1 feature
    3. KNN-impute (k=5) the single remaining gap
    4. Construct complete-case sensitivity dataset
    5. Standardize features
    6. Return datasets and detailed log
    """
    total_countries = len(merged)
    df = merged.copy()
    
    # Missing count per country across 7 features
    df["missing_feature_count"] = df[CLUSTERING_FEATURES].isna().sum(axis=1)
    
    # Exclude countries missing > 1 feature
    eligible_mask = df["missing_feature_count"] <= 1
    complete_mask = df["missing_feature_count"] == 0
    single_gap_mask = df["missing_feature_count"] == 1
    excluded_mask = df["missing_feature_count"] > 1
    
    df_eligible = df[eligible_mask].copy().reset_index(drop=True)
    df_excluded = df[excluded_mask].copy().reset_index(drop=True)
    df_complete = df[complete_mask].copy().reset_index(drop=True)
    
    count_total = total_countries
    count_eligible = len(df_eligible)
    count_complete = int(complete_mask.sum())
    count_single_gap = int(single_gap_mask.sum())
    count_excluded = len(df_excluded)
    
    # KNN Imputation (k=5) on eligible countries
    imputer = KNNImputer(n_neighbors=5, weights="uniform")
    X_imputed = imputer.fit_transform(df_eligible[CLUSTERING_FEATURES])
    df_imputed_feats = pd.DataFrame(X_imputed, columns=CLUSTERING_FEATURES)
    
    # Replace imputed columns in df_eligible
    for f in CLUSTERING_FEATURES:
        df_eligible[f"{f}_raw"] = df_eligible[f]
        df_eligible[f] = df_imputed_feats[f]
        
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_imputed_feats)
    
    # Complete case scaling
    scaler_cc = StandardScaler()
    X_scaled_cc = scaler_cc.fit_transform(df_complete[CLUSTERING_FEATURES])
    
    # Correlation between adult anaemia and child anaemia
    corr_child_adult_anaemia = None
    if "anaemia_women" in df.columns and "child_anaemia" in df.columns:
        sub_anaemia = df[["anaemia_women", "child_anaemia"]].dropna()
        if len(sub_anaemia) > 0:
            corr_child_adult_anaemia = round(float(sub_anaemia.corr().iloc[0, 1]), 4)
        
    log = {
        "country_universe_count": count_total,
        "eligible_countries_count": count_eligible,
        "complete_cases_count": count_complete,
        "single_gap_imputed_count": count_single_gap,
        "excluded_insufficient_data_count": count_excluded,
        "knn_k": 5,
        "features": CLUSTERING_FEATURES,
        "relevance_review": generate_relevance_table(),
        "per_feature_missingness": compute_missingness_summary(merged),
        "correlation_matrix": compute_correlation_matrix(merged),
        "child_anaemia_correlation_with_maternal_anaemia": corr_child_adult_anaemia,
        "child_anaemia_exclusion_reason": (
            f"Prevalence of anaemia in children under 5 correlates strongly (r = {corr_child_adult_anaemia}) "
            "with anaemia in women of reproductive age. Retaining both would overweight haemoglobin deficiency "
            "relative to chronic and acute anthropometric measures. Child anaemia is retained as a validation and context metric."
        ),
        "scaling": {
            "method": "StandardScaler",
            "means": {f: round(float(m), 4) for f, m in zip(CLUSTERING_FEATURES, scaler.mean_)},
            "stds": {f: round(float(s), 4) for f, s in zip(CLUSTERING_FEATURES, scaler.scale_)}
        },
        "excluded_countries": df_excluded[["iso3", "country_name", "missing_feature_count"]].to_dict(orient="records")
    }
    
    return {
        "df_eligible": df_eligible,
        "df_excluded": df_excluded,
        "df_complete": df_complete,
        "X_scaled": X_scaled,
        "X_scaled_cc": X_scaled_cc,
        "scaler": scaler,
        "scaler_cc": scaler_cc,
        "log": log
    }

def test_post_hoc_associations(df_eligible: pd.DataFrame, cluster_labels: np.ndarray) -> dict:
    """Runs post-hoc chi-square test on Income Group and Region to test whether clusters
    merely mirror income or region.
    """
    df = df_eligible.copy()
    df["cluster"] = cluster_labels
    
    results = {}
    for cat_var in ["income_group", "region"]:
        contingency = pd.crosstab(df["cluster"], df[cat_var])
        chi2, p, dof, _ = chi2_contingency(contingency)
        # Cramer's V
        n = contingency.values.sum()
        min_dim = min(contingency.shape) - 1
        cramers_v = np.sqrt(chi2 / (n * min_dim)) if (n * min_dim) > 0 else 0.0
        
        results[cat_var] = {
            "chi2_statistic": round(float(chi2), 3),
            "p_value": float(p),
            "degrees_of_freedom": int(dof),
            "cramers_v": round(float(cramers_v), 3),
            "cross_tab": contingency.to_dict()
        }
    return results
