import numpy as np
from scipy.cluster.hierarchy import linkage, cophenet, fcluster, dendrogram
from scipy.spatial.distance import pdist
from sklearn.metrics import adjusted_rand_score

def run_hierarchical_analysis(X: np.ndarray, chosen_kmeans_labels: np.ndarray, chosen_k: int) -> dict:
    """Computes Ward and Average linkage hierarchical clustering,
    cophenetic correlations, dendrogram coordinates, and ARI vs chosen K-Means.
    """
    dist_p = pdist(X, metric="euclidean")
    
    # 1. Ward linkage
    Z_ward = linkage(X, method="ward", metric="euclidean")
    c_ward, _ = cophenet(Z_ward, dist_p)
    labels_ward = fcluster(Z_ward, t=chosen_k, criterion="maxclust") - 1
    ari_ward_vs_kmeans = adjusted_rand_score(chosen_kmeans_labels, labels_ward)
    
    # 2. Average linkage
    Z_average = linkage(X, method="average", metric="euclidean")
    c_avg, _ = cophenet(Z_average, dist_p)
    labels_avg = fcluster(Z_average, t=chosen_k, criterion="maxclust") - 1
    ari_avg_vs_kmeans = adjusted_rand_score(chosen_kmeans_labels, labels_avg)
    
    # Extract dendrogram representation for frontend
    dend_ward = dendrogram(Z_ward, no_plot=True)
    
    # Format dendrogram for easy front-end rendering
    dendrogram_data = {
        "icoord": [list(map(float, c)) for c in dend_ward["icoord"]],
        "dcoord": [list(map(float, c)) for c in dend_ward["dcoord"]],
        "ivl": dend_ward["ivl"],
        "leaves": [int(l) for l in dend_ward["leaves"]],
        "color_list": dend_ward["color_list"]
    }
    
    return {
        "ward": {
            "cophenetic_correlation": round(float(c_ward), 4),
            "ari_vs_chosen_kmeans": round(float(ari_ward_vs_kmeans), 4),
            "linkage_matrix": [[float(val) for val in row] for row in Z_ward]
        },
        "average": {
            "cophenetic_correlation": round(float(c_avg), 4),
            "ari_vs_chosen_kmeans": round(float(ari_avg_vs_kmeans), 4),
            "linkage_matrix": [[float(val) for val in row] for row in Z_average]
        },
        "dendrogram": dendrogram_data
    }
