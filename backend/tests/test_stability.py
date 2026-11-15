import pytest
import numpy as np
from pipeline.stability import compute_seed_stability, compute_bootstrap_stability

def test_stability_co_association_properties():
    rng = np.random.RandomState(42)
    # 2 tightly clustered groups
    c1 = rng.normal(loc=[-5.0, -5.0], scale=0.1, size=(20, 2))
    c2 = rng.normal(loc=[5.0, 5.0], scale=0.1, size=(20, 2))
    X = np.vstack([c1, c2])
    baseline_labels = np.array([0] * 20 + [1] * 20)
    
    stats, co_assoc, per_country = compute_bootstrap_stability(
        X, baseline_labels, k=2, model_type="kmeans", n_bootstraps=15, random_state=42
    )
    
    # Co-association diagonal must be 1.0
    for i in range(40):
        assert np.isclose(co_assoc[i, i], 1.0)
        
    # Co-association values must be within [0, 1]
    assert np.all(co_assoc >= 0.0)
    assert np.all(co_assoc <= 1.0)
    
    # High bootstrap ARI on well-separated clusters
    assert stats["mean_bootstrap_ari"] > 0.85
    assert len(per_country) == 40
