import numpy as np
from sklearn.cluster import KMeans
from scipy.spatial.distance import cdist

class KMedians:
    """K-Medians clustering using Manhattan (L1 / cityblock) distance.
    
    Includes k-means++-style initialization adapted for L1 distance,
    component-wise median updates, and multi-start optimization.
    """
    def __init__(self, n_clusters: int = 3, max_iter: int = 300, n_init: int = 20, random_state: int | None = 42):
        self.n_clusters = n_clusters
        self.max_iter = max_iter
        self.n_init = n_init
        self.random_state = random_state
        self.cluster_centers_ = None
        self.labels_ = None
        self.inertia_ = None  # Total Manhattan WCSS

    def _init_centers_plusplus(self, X: np.ndarray, rng: np.random.RandomState) -> np.ndarray:
        n_samples, n_features = X.shape
        centers = np.empty((self.n_clusters, n_features), dtype=X.dtype)
        
        # 1. Pick first center uniformly at random
        first_idx = rng.randint(0, n_samples)
        centers[0] = X[first_idx]
        
        # 2. Pick remaining centers proportional to D(x)^2 (or D(x)) under Manhattan distance
        for c_idx in range(1, self.n_clusters):
            # Compute Manhattan distance to closest center chosen so far
            dists = cdist(X, centers[:c_idx], metric="cityblock")
            min_dists = np.min(dists, axis=1)
            
            # Avoid divide-by-zero if duplicate points
            probs = min_dists ** 2
            prob_sum = np.sum(probs)
            if prob_sum == 0:
                probs = np.ones(n_samples) / n_samples
            else:
                probs = probs / prob_sum
                
            next_idx = rng.choice(n_samples, p=probs)
            centers[c_idx] = X[next_idx]
            
        return centers

    def _fit_single(self, X: np.ndarray, rng: np.random.RandomState):
        centers = self._init_centers_plusplus(X, rng)
        n_samples = X.shape[0]
        labels = np.zeros(n_samples, dtype=int)
        
        for iteration in range(self.max_iter):
            # Assignment step (Manhattan distance)
            dists = cdist(X, centers, metric="cityblock")
            new_labels = np.argmin(dists, axis=1)
            
            # Update step (Component-wise median)
            new_centers = np.empty_like(centers)
            for k in range(self.n_clusters):
                mask = (new_labels == k)
                if np.any(mask):
                    new_centers[k] = np.median(X[mask], axis=0)
                else:
                    # Handle empty cluster: reseed with the sample furthest from current centers
                    furthest_idx = np.argmax(np.min(dists, axis=1))
                    new_centers[k] = X[furthest_idx]
            
            if np.array_equal(centers, new_centers) and np.array_equal(labels, new_labels):
                break
                
            centers = new_centers
            labels = new_labels
            
        # Compute final inertia (total Manhattan distance to assigned medians)
        final_dists = cdist(X, centers, metric="cityblock")
        inertia = np.sum([final_dists[i, labels[i]] for i in range(n_samples)])
        return centers, labels, inertia

    def fit(self, X: np.ndarray):
        X = np.asarray(X, dtype=float)
        rng = np.random.RandomState(self.random_state)
        
        best_inertia = np.inf
        best_centers = None
        best_labels = None
        
        for init_run in range(self.n_init):
            centers, labels, inertia = self._fit_single(X, rng)
            if inertia < best_inertia:
                best_inertia = inertia
                best_centers = centers
                best_labels = labels
                
        self.cluster_centers_ = best_centers
        self.labels_ = best_labels
        self.inertia_ = float(best_inertia)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        X = np.asarray(X, dtype=float)
        dists = cdist(X, self.cluster_centers_, metric="cityblock")
        return np.argmin(dists, axis=1)

def run_kmeans(X: np.ndarray, k: int, random_state: int = 42, n_init: int = 20) -> tuple[np.ndarray, np.ndarray, float]:
    """Runs scikit-learn KMeans with Euclidean distance."""
    km = KMeans(n_clusters=k, n_init=n_init, random_state=random_state)
    km.fit(X)
    return km.labels_, km.cluster_centers_, float(km.inertia_)

def run_kmedians(X: np.ndarray, k: int, random_state: int = 42, n_init: int = 20) -> tuple[np.ndarray, np.ndarray, float]:
    """Runs custom KMedians with Manhattan distance."""
    kmed = KMedians(n_clusters=k, n_init=n_init, random_state=random_state)
    kmed.fit(X)
    return kmed.labels_, kmed.cluster_centers_, float(kmed.inertia_)

