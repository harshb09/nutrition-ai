import os
import json
from pathlib import Path
from typing import Any
from fastapi import HTTPException
from app.config import DEFAULT_ARTIFACTS_DIR

class DataStore:
    def __init__(self, artifacts_dir: str = DEFAULT_ARTIFACTS_DIR):
        self.artifacts_dir = Path(artifacts_dir)
        self.metadata: dict[str, Any] = {}
        self.countries: list[dict[str, Any]] = []
        self.countries_by_iso: dict[str, dict[str, Any]] = {}
        self.groups: list[dict[str, Any]] = []
        self.groups_by_id: dict[str, dict[str, Any]] = {}
        self.peers: dict[str, list[dict[str, Any]]] = {}
        self.trends: dict[str, Any] = {}
        self.methodology: dict[str, Any] = {}
        self.selection: dict[str, Any] = {}
        self.preprocessing_log: dict[str, Any] = {}
        self.csv_path: Path | None = None
        self._is_loaded = False

    def load_artifacts(self):
        """Loads all artifacts from the artifacts directory into memory.
        Fails fast if artifacts directory or required files are missing.
        """
        if not self.artifacts_dir.exists():
            raise RuntimeError(
                f"Artifacts directory '{self.artifacts_dir}' does not exist. "
                "Please run the offline pipeline ('python -m pipeline.run') to generate precomputed artifacts."
            )
            
        required_files = [
            "metadata.json",
            "countries.json",
            "groups.json",
            "peers.json",
            "trends.json",
            "methodology.json",
            "selection.json",
            "preprocessing_log.json",
            "dataset.csv"
        ]
        
        for fname in required_files:
            file_path = self.artifacts_dir / fname
            if not file_path.exists():
                raise RuntimeError(
                    f"Required artifact '{file_path}' not found. "
                    "Please run the offline pipeline ('python -m pipeline.run') to generate precomputed artifacts."
                )
                
        # Load JSON files
        with open(self.artifacts_dir / "metadata.json") as f:
            self.metadata = json.load(f)
        with open(self.artifacts_dir / "countries.json") as f:
            self.countries = json.load(f)
        with open(self.artifacts_dir / "groups.json") as f:
            self.groups = json.load(f)
        with open(self.artifacts_dir / "peers.json") as f:
            self.peers = json.load(f)
        with open(self.artifacts_dir / "trends.json") as f:
            self.trends = json.load(f)
        with open(self.artifacts_dir / "methodology.json") as f:
            self.methodology = json.load(f)
        with open(self.artifacts_dir / "selection.json") as f:
            self.selection = json.load(f)
        with open(self.artifacts_dir / "preprocessing_log.json") as f:
            self.preprocessing_log = json.load(f)
            
        self.csv_path = self.artifacts_dir / "dataset.csv"
        
        # Build index lookups
        self.countries_by_iso = {c["iso3"].upper(): c for c in self.countries}
        self.groups_by_id = {g["id"].upper(): g for g in self.groups}
        self._is_loaded = True

    def get_metadata(self) -> dict[str, Any]:
        return self.metadata

    def get_countries(
        self,
        group_id: str | None = None,
        status: str | None = None,
        search: str | None = None
    ) -> list[dict[str, Any]]:
        results = self.countries
        if group_id:
            results = [c for c in results if (c.get("group_id") or "").upper() == group_id.upper()]
        if status:
            results = [c for c in results if c.get("status") == status]
        if search:
            query = search.strip().lower()
            results = [
                c for c in results
                if query in c["country_name"].lower() or query in c["iso3"].lower()
            ]
        return results

    def get_country(self, iso3: str) -> dict[str, Any]:
        iso_clean = iso3.strip().upper()
        if iso_clean not in self.countries_by_iso:
            raise HTTPException(
                status_code=404,
                detail=f"Country with ISO3 code '{iso3}' not found in the dataset universe."
            )
        country = dict(self.countries_by_iso[iso_clean])
        # Inject group averages and dataset medians for comparison view
        group_id = country.get("group_id")
        if group_id and group_id in self.groups_by_id:
            country["group_means"] = self.groups_by_id[group_id]["means"]
            country["group_name"] = self.groups_by_id[group_id]["name"]
            country["group_provisional_name"] = self.groups_by_id[group_id]["provisional_name"]
            country["group_descriptor"] = self.groups_by_id[group_id]["descriptor"]
        else:
            country["group_means"] = None
            country["group_name"] = None
            country["group_provisional_name"] = None
            country["group_descriptor"] = None
            
        country["dataset_medians"] = self.metadata.get("dataset_medians", {})
        country["thresholds_75th_percentile"] = self.metadata.get("thresholds_75th_percentile", {})
        country["features_meta"] = self.metadata.get("features", {})
        return country

    def get_peers(self, iso3: str) -> list[dict[str, Any]]:
        iso_clean = iso3.strip().upper()
        if iso_clean not in self.countries_by_iso:
            raise HTTPException(
                status_code=404,
                detail=f"Country with ISO3 code '{iso3}' not found in the dataset universe."
            )
        return self.peers.get(iso_clean, [])

    def get_trends(self, iso3: str) -> dict[str, Any]:
        iso_clean = iso3.strip().upper()
        if iso_clean not in self.countries_by_iso:
            raise HTTPException(
                status_code=404,
                detail=f"Country with ISO3 code '{iso3}' not found in the dataset universe."
            )
        country = self.countries_by_iso[iso_clean]
        country_trends = self.trends.get("countries", {}).get(iso_clean, [])
        
        # Peer trends
        peers = self.peers.get(iso_clean, [])
        peer_trends = {}
        for p in peers:
            p_iso = p["iso3"]
            peer_trends[p_iso] = {
                "country_name": p["country_name"],
                "series": self.trends.get("countries", {}).get(p_iso, [])
            }
            
        group_id = country.get("group_id")
        group_avg = self.trends.get("group_averages", {}).get(group_id, []) if group_id else []
        
        return {
            "iso3": iso_clean,
            "country_name": country["country_name"],
            "group_id": group_id,
            "series": country_trends,
            "peers": peer_trends,
            "group_average": group_avg
        }

    def get_groups(self) -> list[dict[str, Any]]:
        return self.groups

    def get_group(self, group_id: str) -> dict[str, Any]:
        grp_clean = group_id.strip().upper()
        if grp_clean not in self.groups_by_id:
            raise HTTPException(
                status_code=404,
                detail=f"Group with identifier '{group_id}' not found. Available groups: {list(self.groups_by_id.keys())}."
            )
        return self.groups_by_id[grp_clean]

    def get_methodology(self) -> dict[str, Any]:
        return self.methodology

    def get_dataset_csv_path(self) -> Path:
        if not self.csv_path or not self.csv_path.exists():
            raise HTTPException(status_code=404, detail="dataset.csv file not found on server.")
        return self.csv_path

# Global singleton
store = DataStore()

