import os
import json
import io
import csv
import math
from pathlib import Path
from typing import Any
from fastapi import HTTPException
from app.config import DEFAULT_ARTIFACTS_DIR

CLUSTERING_FEATURES = [
    "stunting",
    "child_overweight",
    "wasting",
    "adult_obesity",
    "adult_diabetes",
    "anaemia_women",
    "low_birth_weight"
]

class DataStore:
    def __init__(self, artifacts_dir: str = DEFAULT_ARTIFACTS_DIR):
        self.artifacts_dir = Path(artifacts_dir)
        self.metadata: dict[str, Any] = {}
        self.countries: list[dict[str, Any]] = []
        self.countries_by_iso: dict[str, dict[str, Any]] = {}
        self.groups: list[dict[str, Any]] = []
        self.groups_by_id: dict[str, dict[str, Any]] = {}
        self.peers: dict[str, list[dict[str, Any]]] = {}
        self.learn_peers: dict[str, list[dict[str, Any]]] = {}
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
        if (self.artifacts_dir / "learn_peers.json").exists():
            with open(self.artifacts_dir / "learn_peers.json") as f:
                self.learn_peers = json.load(f)
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

    def get_learn_peers(self, iso3: str) -> list[dict[str, Any]]:
        iso_clean = iso3.strip().upper()
        if iso_clean not in self.countries_by_iso:
            raise HTTPException(
                status_code=404,
                detail=f"Country with ISO3 code '{iso3}' not found in the dataset universe."
            )
        raw_list = self.learn_peers.get(iso_clean, [])
        result = []
        for p in raw_list:
            p_iso = p["iso3"]
            p_series = self.trends.get("countries", {}).get(p_iso, [])
            entry = dict(p)
            entry["series"] = p_series
            result.append(entry)
        return result

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

    def get_burden_data(
        self,
        region: str | None = None,
        income_group: str | None = None,
        group_id: str | None = None,
        double_burden: bool | None = None,
        sort_by: str = "stunting_count",
        sort_order: str = "desc"
    ) -> list[dict[str, Any]]:
        results = []
        for c in self.countries:
            if region and c.get("region") != region:
                continue
            if income_group and c.get("income_group") != income_group:
                continue
            if group_id:
                if (c.get("group_id") or "").upper() != group_id.upper():
                    continue
            if double_burden is not None:
                if bool(c.get("double_burden")) != double_burden:
                    continue
                    
            item = {
                "iso3": c["iso3"],
                "country_name": c["country_name"],
                "region": c["region"],
                "income_group": c["income_group"],
                "group_id": c["group_id"],
                "group_name": c["group_name"],
                "double_burden": c["double_burden"],
                "stunting_prevalence": c["indicators"].get("stunting"),
                "stunting_prevalence_year": c["data_years"].get("stunting"),
                "stunting_count_thousands": c.get("stunting_count_thousands"),
                "stunting_count_year": c.get("stunting_count_year"),
                "child_overweight_prevalence": c["indicators"].get("child_overweight"),
                "child_overweight_prevalence_year": c["data_years"].get("child_overweight"),
                "child_overweight_count_thousands": c.get("child_overweight_count_thousands"),
                "child_overweight_count_year": c.get("child_overweight_count_year")
            }
            results.append(item)
            
        def sort_key(item):
            val = None
            if sort_by == "stunting_count":
                val = item["stunting_count_thousands"]
            elif sort_by == "stunting_prev":
                val = item["stunting_prevalence"]
            elif sort_by == "overweight_count":
                val = item["child_overweight_count_thousands"]
            elif sort_by == "overweight_prev":
                val = item["child_overweight_prevalence"]
            elif sort_by == "country":
                return item["country_name"]
            if val is None:
                return -math.inf if sort_order == "desc" else math.inf
            return val
            
        reverse = (sort_order.lower() == "desc")
        results.sort(key=sort_key, reverse=reverse)
        return results

    def get_burden_csv_content(
        self,
        region: str | None = None,
        income_group: str | None = None,
        group_id: str | None = None,
        double_burden: bool | None = None,
        sort_by: str = "stunting_count",
        sort_order: str = "desc"
    ) -> str:
        items = self.get_burden_data(region, income_group, group_id, double_burden, sort_by, sort_order)
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow([
            "iso3",
            "country_name",
            "region",
            "income_group",
            "group_id",
            "group_name",
            "double_burden",
            "stunting_prevalence_pct",
            "stunting_prevalence_year",
            "stunting_count_thousands",
            "stunting_count_year",
            "child_overweight_prevalence_pct",
            "child_overweight_prevalence_year",
            "child_overweight_count_thousands",
            "child_overweight_count_year"
        ])
        for it in items:
            writer.writerow([
                it["iso3"],
                it["country_name"],
                it["region"],
                it["income_group"],
                it["group_id"] or "",
                it["group_name"] or "",
                "Yes" if it["double_burden"] else "No",
                it["stunting_prevalence"] if it["stunting_prevalence"] is not None else "",
                it["stunting_prevalence_year"] if it["stunting_prevalence_year"] is not None else "",
                it["stunting_count_thousands"] if it["stunting_count_thousands"] is not None else "",
                it["stunting_count_year"] if it["stunting_count_year"] is not None else "",
                it["child_overweight_prevalence"] if it["child_overweight_prevalence"] is not None else "",
                it["child_overweight_prevalence_year"] if it["child_overweight_prevalence_year"] is not None else "",
                it["child_overweight_count_thousands"] if it["child_overweight_count_thousands"] is not None else "",
                it["child_overweight_count_year"] if it["child_overweight_count_year"] is not None else ""
            ])
        return out.getvalue()

    def simulate_profile(self, input_values: dict[str, float]) -> dict[str, Any]:
        """Simulates where a hypothetical or modified profile sits relative to groups and countries.
        Clamps inputs, standardizes with saved scaler, computes closeness and 5 closest countries.
        Exposes NO model terms in the response.
        """
        ranges = self.metadata.get("feature_ranges", {})
        scaler_p = self.metadata.get("scaler_parameters", {})
        centres = self.metadata.get("group_centres", {})
        country_vectors = self.metadata.get("analysed_country_vectors", [])
        
        means = scaler_p.get("means", {})
        stds = scaler_p.get("stds", {})
        
        # 1. Clamp inputs to observed dataset range
        clamped_inputs = {}
        for f in CLUSTERING_FEATURES:
            val = float(input_values.get(f, 0.0))
            if f in ranges:
                f_min = ranges[f]["min"]
                f_max = ranges[f]["max"]
                clamped_val = max(f_min, min(f_max, val))
            else:
                clamped_val = val
            clamped_inputs[f] = round(clamped_val, 2)
            
        # 2. Standardize
        z_vector = []
        for f in CLUSTERING_FEATURES:
            m = means.get(f, 0.0)
            s = stds.get(f, 1.0)
            z_f = (clamped_inputs[f] - m) / (s if s != 0 else 1.0)
            z_vector.append(z_f)
            
        # 3. Compute distance to each group centre
        group_closeness = []
        min_dist = math.inf
        closest_group_id = None
        
        for g in self.groups:
            g_id = g["id"]
            c_vec = centres.get(g_id, [])
            if c_vec and len(c_vec) == len(z_vector):
                dist = math.sqrt(sum((z_vector[i] - c_vec[i]) ** 2 for i in range(len(z_vector))))
            else:
                dist = 0.0
                
            dist_round = round(dist, 3)
            # Closeness score: 100 / (1 + dist)
            closeness_score = round(100.0 / (1.0 + dist), 1)
            
            if dist < min_dist:
                min_dist = dist
                closest_group_id = g_id
                
            group_closeness.append({
                "group_id": g_id,
                "group_name": g["name"],
                "distance": dist_round,
                "closeness_score": closeness_score,
                "is_closest": False
            })
            
        # Mark closest
        for gc in group_closeness:
            if gc["group_id"] == closest_group_id:
                gc["is_closest"] = True
                
        closest_grp_obj = self.groups_by_id.get(closest_group_id, self.groups[0])
        
        # 4. Find 5 closest real countries
        country_dists = []
        for c in country_vectors:
            c_vec = c["vector"]
            d = math.sqrt(sum((z_vector[i] - c_vec[i]) ** 2 for i in range(len(z_vector))))
            country_dists.append({
                "iso3": c["iso3"],
                "country_name": c["country_name"],
                "group_id": c["group_id"],
                "distance": round(d, 3)
            })
        country_dists.sort(key=lambda x: x["distance"])
        closest_countries = country_dists[:5]
        
        return {
            "closest_group": {
                "id": closest_grp_obj["id"],
                "name": closest_grp_obj["name"],
                "provisional_name": closest_grp_obj["provisional_name"],
                "descriptor": closest_grp_obj["descriptor"]
            },
            "group_closeness": group_closeness,
            "closest_countries": closest_countries,
            "clamped_inputs": clamped_inputs,
            "label": "Where this profile would sit relative to current countries. This is not a forecast."
        }

# Global singleton
store = DataStore()
