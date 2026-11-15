import pytest
import numpy as np
from pipeline.clustering import KMedians, run_kmedians

def test_kmedians_synthetic_clusters():
    # 3 well-separated synthetic clusters in 2D
    rng = np.random.RandomState(42)
    c1 = rng.normal(loc=[0.0, 0.0], scale=0.2, size=(30, 2))
    c2 = rng.normal(loc=[5.0, 5.0], scale=0.2, size=(30, 2))
    c3 = rng.normal(loc=[10.0, 0.0], scale=0.2, size=(30, 2))
    X = np.vstack([c1, c2, c3])
    
    kmed = KMedians(n_clusters=3, n_init=10, random_state=42)
    kmed.fit(X)
    
    assert kmed.cluster_centers_.shape == (3, 2)
    assert len(kmed.labels_) == 90
    assert len(np.unique(kmed.labels_)) == 3
    assert kmed.inertia_ > 0

def test_kmedians_predict():
    rng = np.random.RandomState(123)
    c1 = rng.normal(loc=[-5.0, -5.0], scale=0.1, size=(10, 2))
    c2 = rng.normal(loc=[5.0, 5.0], scale=0.1, size=(10, 2))
    X = np.vstack([c1, c2])
    
    kmed = KMedians(n_clusters=2, n_init=5, random_state=123)
    kmed.fit(X)
    
    preds = kmed.predict(np.array([[-5.0, -5.0], [5.0, 5.0]]))
    assert preds[0] != preds[1]
