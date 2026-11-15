export interface CountrySummary {
  iso3: string;
  country_name: string;
  income_group: string;
  region: string;
  status: "analyzed" | "insufficient_data";
  group_id: string | null;
  group_name: string | null;
  notice: string | null;
  double_burden: boolean;
  relative_flags: Record<string, boolean>;
  indicators: Record<string, number | null>;
  indicators_raw: Record<string, number | null>;
  is_imputed: Record<string, boolean>;
  data_years: Record<string, number | null>;
  stability_score: number | null;
  missing_feature_count: number;
  stunting_count_thousands?: number | null;
  stunting_count_year?: number | null;
  child_overweight_count_thousands?: number | null;
  child_overweight_count_year?: number | null;
  stunting_change_2000_2024?: number | null;
  story?: string | null;
}

export interface CountryDetail extends CountrySummary {
  group_means: Record<string, number> | null;
  group_provisional_name: string | null;
  group_descriptor: string | null;
  dataset_medians: Record<string, number>;
  thresholds_75th_percentile: Record<string, number>;
  features_meta: Record<string, {
    label: string;
    source: string;
    target_pop: string;
    description: string;
    relevance: string;
    unit: string;
    year_source: string;
  }>;
}

export interface PeerCountry {
  iso3: string;
  country_name: string;
  distance: number;
  differences: Record<string, number | null>;
  values: Record<string, number | null>;
}

export interface LearnPeerCountry {
  iso3: string;
  country_name: string;
  distance: number;
  stunting_change_2000_2024: number | null;
  stunting_2024: number | null;
  series: TrendPoint[];
}

export interface TrendPoint {
  year: number;
  stunting: number | null;
  child_overweight: number | null;
}

export interface CountryTrends {
  iso3: string;
  country_name: string;
  group_id: string | null;
  series: TrendPoint[];
  peers: Record<string, {
    country_name: string;
    series: TrendPoint[];
  }>;
  group_average: TrendPoint[];
}

export interface GroupSummary {
  id: string;
  name: string;
  provisional_name: string;
  descriptor: string;
  country_count: number;
  member_iso3s: string[];
  member_countries: Array<{
    iso3: string;
    country_name: string;
    stability_score: number | null;
  }>;
  means: Record<string, number>;
  medians: Record<string, number>;
  stds: Record<string, number>;
  centroid_z_scores: Record<string, number>;
  income_distribution: Record<string, number>;
  region_distribution: Record<string, number>;
}

export interface DatasetMetadata {
  dataset_name: string;
  description: string;
  generated_at: string;
  counts: {
    country_universe: number;
    analyzed_countries: number;
    insufficient_data_countries: number;
    complete_cases: number;
    single_gap_imputed: number;
    clusters_count: number;
  };
  chosen_model: {
    algorithm: string;
    k: number;
    distance_metric: string;
    silhouette: number;
    davies_bouldin: number;
    bootstrap_ari_mean: number;
  };
  thresholds_75th_percentile: Record<string, number>;
  dataset_medians: Record<string, number>;
  features: Record<string, any>;
  context_features: Record<string, any>;
  feature_ranges?: Record<string, { min: number; max: number; step: number }>;
  mandatory_caveat: string;
}

export interface SimulationRequest {
  stunting: number;
  child_overweight: number;
  wasting: number;
  adult_obesity: number;
  adult_diabetes: number;
  anaemia_women: number;
  low_birth_weight: number;
}

export interface SimulationResponse {
  closest_group: {
    id: string;
    name: string;
    provisional_name: string;
    descriptor: string;
  };
  group_closeness: Array<{
    group_id: string;
    group_name: string;
    distance: number;
    closeness_score: number;
    is_closest: boolean;
  }>;
  closest_countries: Array<{
    iso3: string;
    country_name: string;
    group_id: string | null;
    distance: number;
  }>;
  clamped_inputs: Record<string, number>;
  label: string;
}

export interface BurdenItem {
  iso3: string;
  country_name: string;
  region: string;
  income_group: string;
  group_id: string | null;
  group_name: string | null;
  double_burden: boolean;
  stunting_prevalence: number | null;
  stunting_prevalence_year: number | null;
  stunting_count_thousands: number | null;
  stunting_count_year: number | null;
  child_overweight_prevalence: number | null;
  child_overweight_prevalence_year: number | null;
  child_overweight_count_thousands: number | null;
  child_overweight_count_year: number | null;
}

export interface BurdenResponse {
  total_count: number;
  note: string;
  items: BurdenItem[];
}

export interface MethodologyData {
  preprocessing_log: {
    country_universe_count: number;
    eligible_countries_count: number;
    complete_cases_count: number;
    single_gap_imputed_count: number;
    excluded_insufficient_data_count: number;
    knn_k: number;
    relevance_review: Array<{
      feature: string;
      label: string;
      target_population: string;
      description: string;
      public_health_relevance: string;
      source: string;
      unit: string;
      data_year_source: string;
    }>;
    per_feature_missingness: Array<{
      feature: string;
      label: string;
      missing_count: number;
      valid_count: number;
      missing_pct: number;
      year_min: number | null;
      year_max: number | null;
      year_median: number | null;
    }>;
    correlation_matrix: Record<string, Record<string, number | null>>;
    child_anaemia_correlation_with_maternal_anaemia: number;
    child_anaemia_exclusion_reason: string;
    scaling: {
      method: string;
      means: Record<string, number>;
      stds: Record<string, number>;
    };
    excluded_countries: Array<{
      iso3: string;
      country_name: string;
      missing_feature_count: number;
    }>;
  };
  selection: {
    rule_specification: string;
    evaluated_candidates: any[];
    selected_configuration: any;
    rationale: string;
  };
  model_evaluations: Array<{
    k: number;
    method: string;
    distance_metric: string;
    wcss: number;
    silhouette: number;
    davies_bouldin: number;
    seed_ari_mean: number;
    seed_ari_std: number;
    bootstrap_ari_mean: number;
    bootstrap_ari_std: number;
  }>;
  post_hoc_association_tests: Record<string, {
    chi2_statistic: number;
    p_value: number;
    degrees_of_freedom: number;
    cramers_v: number;
    cross_tab: Record<string, Record<string, number>>;
  }>;
  hierarchical_analysis: {
    ward: {
      cophenetic_correlation: number;
      ari_vs_chosen_kmeans: number;
      linkage_matrix: number[][];
    };
    average: {
      cophenetic_correlation: number;
      ari_vs_chosen_kmeans: number;
    };
    dendrogram: {
      icoord: number[][];
      dcoord: number[][];
      ivl: string[];
      leaves: number[];
      color_list: string[];
    };
  };
  pca_analysis: {
    explained_variance_ratio: number[];
    cumulative_variance: number;
    loadings: Array<{
      feature: string;
      pc1: number;
      pc2: number;
    }>;
    coordinates: Array<{
      iso3: string;
      x: number;
      y: number;
    }>;
  };
  stability_audit: {
    bootstrap_summary: {
      n_bootstraps: number;
      subsample_ratio: number;
      mean_bootstrap_ari: number;
      std_bootstrap_ari: number;
      min_bootstrap_ari: number;
      max_bootstrap_ari: number;
    };
    co_association_summary: {
      mean_intra_cluster_co_assoc: number;
      min_intra_cluster_co_assoc: number;
      max_intra_cluster_co_assoc: number;
    };
  };
  sensitivity_analyses: {
    complete_case_analysis: {
      complete_cases_count: number;
      ari_vs_main_imputed_clustering: number;
      finding: string;
    };
    exclusive_breastfeeding: {
      with_stunting: number;
      with_wasting: number;
      sample_size: number;
    };
  };
  limitations: string[];
  responsible_use: string[];
}
