import pytest
import numpy as np
from sklearn.metrics import silhouette_score, davies_bouldin_score
from pipeline.metrics import compute_silhouette, compute_davies_bouldin, compute_wcss

def test_metrics_vs_sklearn_euclidean():
    rng = np.random.RandomState(42)
    X = rng.normal(size=(50, 4))
    labels = np.array([0] * 25 + [1] * 25)
    
    # 1. Silhouette vs scikit-learn
    sil_custom = compute_silhouette(X, labels, metric="euclidean")
    sil_sk = silhouette_score(X, labels, metric="euclidean")
    assert np.isclose(sil_custom, sil_sk, atol=1e-5)
    
    # 2. Davies-Bouldin vs scikit-learn
    db_custom = compute_davies_bouldin(X, labels, metric="euclidean")
    db_sk = davies_bouldin_score(X, labels)
    assert np.isclose(db_custom, db_sk, atol=1e-5)

def test_wcss_euclidean():
    X = np.array([[0.0, 0.0], [0.0, 2.0], [10.0, 10.0], [10.0, 12.0]])
    labels = np.array([0, 0, 1, 1])
    centers = np.array([[0.0, 1.0], [10.0, 11.0]])
    
    wcss = compute_wcss(X, labels, centers, metric="euclidean")
    # For cluster 0: (0-0)^2 + (0-1)^2 + (0-0)^2 + (2-1)^2 = 1 + 1 = 2
    # For cluster 1: (10-10)^2 + (10-11)^2 + (10-10)^2 + (12-11)^2 = 1 + 1 = 2
    # Total = 4.0
    assert np.isclose(wcss, 4.0)

def test_wcss_manhattan():
    X = np.array([[0.0, 0.0], [0.0, 2.0]])
    labels = np.array([0, 0])
    centers = np.array([[0.0, 1.0]])
    wcss = compute_wcss(X, labels, centers, metric="cityblock")
    # |0-0| + |0-1| + |0-0| + |2-1| = 1 + 1 = 2.0
    assert np.isclose(wcss, 2.0)
