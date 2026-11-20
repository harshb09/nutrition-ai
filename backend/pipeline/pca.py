import numpy as np
from sklearn.decomposition import PCA
from pipeline.preprocess import CLUSTERING_FEATURES

def run_pca_analysis(
    X: np.ndarray,
    id_list: list[str],
    feature_names: list[str] | None = None,
    id_key: str = "iso3"
) -> dict:
    """Computes 2D PCA coordinates, explained variance, and feature loadings."""
    if feature_names is None:
        feature_names = CLUSTERING_FEATURES

    pca = PCA(n_components=2, random_state=42)
    coords_2d = pca.fit_transform(X)
    
    explained_variance_ratio = [round(float(v), 4) for v in pca.explained_variance_ratio_]
    cumulative_variance = round(float(np.sum(pca.explained_variance_ratio_)), 4)
    
    # Loadings (components_ has shape (n_components, n_features))
    loadings = []
    for idx, feat in enumerate(feature_names):
        loadings.append({
            "feature": feat,
            "pc1": round(float(pca.components_[0, idx]), 4),
            "pc2": round(float(pca.components_[1, idx]), 4)
        })
        
    points = []
    for idx, entity_id in enumerate(id_list):
        points.append({
            id_key: entity_id,
            "x": round(float(coords_2d[idx, 0]), 4),
            "y": round(float(coords_2d[idx, 1]), 4)
        })
        
    return {
        "explained_variance_ratio": explained_variance_ratio,
        "cumulative_variance": cumulative_variance,
        "loadings": loadings,
        "coordinates": points
    }

