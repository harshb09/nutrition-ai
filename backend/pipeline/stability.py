import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score
from pipeline.clustering import KMedians

def compute_seed_stability(X: np.ndarray, k: int, model_type: str = "kmeans", n_seeds: int = 30) -> dict:
    """Evaluates initialization stability across 30 seeds."""
    all_labels = []
    for seed in range(n_seeds):
        if model_type == "kmeans":
            km = KMeans(n_clusters=k, n_init=1, random_state=seed)
            km.fit(X)
            all_labels.append(km.labels_)
        else:
            kmed = KMedians(n_clusters=k, n_init=1, random_state=seed)
            kmed.fit(X)
            all_labels.append(kmed.labels_)
            
    # Pairwise ARI among all seeds
    aris = []
    for i in range(n_seeds):
        for j in range(i + 1, n_seeds):
            aris.append(adjusted_rand_score(all_labels[i], all_labels[j]))
            
    return {
        "n_seeds": n_seeds,
        "mean_seed_ari": round(float(np.mean(aris)), 4),
        "std_seed_ari": round(float(np.std(aris)), 4)
    }

def compute_bootstrap_stability(
    X: np.ndarray,
    baseline_labels: np.ndarray,
    k: int,
    model_type: str = "kmeans",
    n_bootstraps: int = 100,
    subsample_ratio: float = 0.80,
    random_state: int = 42
) -> tuple[dict, np.ndarray, np.ndarray]:
    """Runs 100 bootstrap 80% subsamples to compute:
    1. Mean and SD of ARI vs baseline labels on subsamples
    2. Co-association matrix C of size (N, N)
    3. Per-country stability score (mean co-association with points in same baseline cluster)
    """
    n_samples = X.shape[0]
    subsample_size = int(np.floor(n_samples * subsample_ratio))
    rng = np.random.RandomState(random_state)
    
    co_occurrences = np.zeros((n_samples, n_samples), dtype=float)
    co_clusters = np.zeros((n_samples, n_samples), dtype=float)
    ari_scores = []
    
    for b in range(n_bootstraps):
        sub_indices = rng.choice(n_samples, size=subsample_size, replace=False)
        X_sub = X[sub_indices]
        
        if model_type == "kmeans":
            km = KMeans(n_clusters=k, n_init=10, random_state=rng.randint(0, 100000))
            km.fit(X_sub)
            sub_labels = km.labels_
        else:
            kmed = KMedians(n_clusters=k, n_init=10, random_state=rng.randint(0, 100000))
            kmed.fit(X_sub)
            sub_labels = kmed.labels_
            
        # ARI vs baseline on the subsample
        baseline_sub = baseline_labels[sub_indices]
        ari = adjusted_rand_score(baseline_sub, sub_labels)
        ari_scores.append(ari)
        
        # Update co-association counts
        for i_pos, i_orig in enumerate(sub_indices):
            for j_pos, j_orig in enumerate(sub_indices):
                co_occurrences[i_orig, j_orig] += 1
                if sub_labels[i_pos] == sub_labels[j_pos]:
                    co_clusters[i_orig, j_orig] += 1
                    
    # Compute co-association matrix
    with np.errstate(divide="ignore", invalid="ignore"):
        co_assoc_matrix = np.where(co_occurrences > 0, co_clusters / co_occurrences, 0.0)
    np.fill_diagonal(co_assoc_matrix, 1.0)
    
    # Per-country stability score: average co-association with members of the same baseline cluster
    per_country_stability = np.zeros(n_samples, dtype=float)
    for i in range(n_samples):
        c_i = baseline_labels[i]
        same_cluster_indices = [j for j in range(n_samples) if baseline_labels[j] == c_i and j != i]
        if len(same_cluster_indices) > 0:
            per_country_stability[i] = float(np.mean(co_assoc_matrix[i, same_cluster_indices]))
        else:
            per_country_stability[i] = 1.0
            
    stats = {
        "n_bootstraps": n_bootstraps,
        "subsample_ratio": subsample_ratio,
        "mean_bootstrap_ari": round(float(np.mean(ari_scores)), 4),
        "std_bootstrap_ari": round(float(np.std(ari_scores)), 4),
        "min_bootstrap_ari": round(float(np.min(ari_scores)), 4),
        "max_bootstrap_ari": round(float(np.max(ari_scores)), 4)
    }
    
    return stats, co_assoc_matrix, per_country_stability

