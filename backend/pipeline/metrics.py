import numpy as np
from scipy.spatial.distance import cdist, pdist, squareform
from sklearn.metrics import silhouette_score, davies_bouldin_score

def compute_wcss(X: np.ndarray, labels: np.ndarray, centers: np.ndarray, metric: str = "euclidean") -> float:
    """Computes within-cluster distance in the matching metric.
    
    If metric == 'euclidean': sum of squared Euclidean distances (inertia).
    If metric == 'cityblock' (Manhattan): sum of absolute Manhattan distances.
    """
    n_samples = X.shape[0]
    total_wcss = 0.0
    for i in range(n_samples):
        c = centers[labels[i]]
        if metric == "euclidean":
            total_wcss += np.sum((X[i] - c) ** 2)
        elif metric == "cityblock":
            total_wcss += np.sum(np.abs(X[i] - c))
        else:
            raise ValueError(f"Unsupported metric: {metric}")
    return float(total_wcss)

def compute_silhouette(X: np.ndarray, labels: np.ndarray, metric: str = "euclidean") -> float:
    """Computes mean silhouette score using the matching distance metric.
    
    Supports 'euclidean' and 'cityblock' (Manhattan).
    """
    unique_labels = np.unique(labels)
    if len(unique_labels) < 2 or len(unique_labels) >= len(X):
        return 0.0
    return float(silhouette_score(X, labels, metric=metric))

def compute_davies_bouldin(X: np.ndarray, labels: np.ndarray, centers: np.ndarray | None = None, metric: str = "euclidean") -> float:
    """Computes Davies-Bouldin index in the matching distance metric.
    
    For 'euclidean', scikit-learn's standard definition is used.
    For 'cityblock' (Manhattan), cluster dispersions are average Manhattan distances to medians,
    and separation is Manhattan distance between medians.
    """
    unique_labels = np.unique(labels)
    k = len(unique_labels)
    if k < 2:
        return 0.0
        
    if metric == "euclidean" and centers is None:
        return float(davies_bouldin_score(X, labels))
        
    # Generalized computation for matching metric
    if centers is None:
        centers = np.empty((k, X.shape[1]), dtype=float)
        for i, lbl in enumerate(unique_labels):
            mask = (labels == lbl)
            if metric == "cityblock":
                centers[i] = np.median(X[mask], axis=0)
            else:
                centers[i] = np.mean(X[mask], axis=0)
                
    # Cluster dispersions s_i = average distance of points in cluster to center
    dispersions = np.zeros(k, dtype=float)
    for i, lbl in enumerate(unique_labels):
        cluster_points = X[labels == lbl]
        if len(cluster_points) == 0:
            dispersions[i] = 0.0
        else:
            dists = cdist(cluster_points, [centers[i]], metric=metric)
            dispersions[i] = np.mean(dists)
            
    # Pairwise distances between centers
    center_dists = cdist(centers, centers, metric=metric)
    
    # Compute R_ij and max_j R_ij
    db_values = np.zeros(k, dtype=float)
    for i in range(k):
        r_ij = []
        for j in range(k):
            if i != j:
                d_sep = center_dists[i, j]
                if d_sep > 0:
                    r_ij.append((dispersions[i] + dispersions[j]) / d_sep)
                else:
                    r_ij.append(0.0)
        db_values[i] = np.max(r_ij) if len(r_ij) > 0 else 0.0
        
    return float(np.mean(db_values))
