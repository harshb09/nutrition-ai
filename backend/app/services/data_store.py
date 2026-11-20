import os
import json
import io
import csv
import math
from pathlib import Path
from typing import Any
from fastapi import HTTPException
from app.config import DEFAULT_ARTIFACTS_DIR, DEFAULT_INDIA_ARTIFACTS_DIR, GEO_DIR, REPORTS_DIR

CLUSTERING_FEATURES = [
    "stunting",
    "child_overweight",
    "wasting",
    "adult_obesity",
    "adult_diabetes",
    "anaemia_women",
    "low_birth_weight"
]

INDIA_GROUPING_FEATURES = [
    "stunting",
    "wasting",
    "underweight",
    "anaemia_children",
    "anaemia_women",
    "low_bmi_women",
    "overweight_women"
]

class DataStore:
    def __init__(
        self,
        artifacts_dir: str = DEFAULT_ARTIFACTS_DIR,
        india_artifacts_dir: str = DEFAULT_INDIA_ARTIFACTS_DIR
    ):
        self.artifacts_dir = Path(artifacts_dir)
        self.india_artifacts_dir = Path(india_artifacts_dir)
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

        # India artifacts
        self.india_districts: list[dict[str, Any]] = []
        self.india_districts_by_id: dict[str, dict[str, Any]] = {}
        self.india_districts_by_state_dist: dict[str, dict[str, Any]] = {}
        self.india_districts_by_name: dict[str, list[dict[str, Any]]] = {}
        self.india_groups: list[dict[str, Any]] = []
        self.india_groups_by_id: dict[str, dict[str, Any]] = {}
        self.india_states: dict[str, Any] = {}
        self.india_districts_like: dict[str, list[dict[str, Any]]] = {}
        self.india_geojson: dict[str, Any] = {}
        self.india_methodology: dict[str, Any] = {}
        self.india_correlation: dict[str, Any] = {}
        self.india_model_selection: dict[str, Any] = {}
        self.india_join_report: dict[str, Any] = {}
        self.india_join_review: list[dict[str, Any]] = []
        self.india_preprocessing_log: dict[str, Any] = {}
        self.india_indicator_mapping: dict[str, Any] = {}
        self.world_geojson: dict[str, Any] = {}

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

        # Load India artifacts if present
        if self.india_artifacts_dir.exists():
            india_districts_file = self.india_artifacts_dir / "districts.json"
            if india_districts_file.exists():
                with open(india_districts_file) as f:
                    self.india_districts = json.load(f)
                self.india_districts_by_id = {d["district_id"]: d for d in self.india_districts}
                self.india_districts_by_state_dist = {
                    f"{d['state'].strip().lower()}::{d['district'].strip().lower()}": d
                    for d in self.india_districts
                }
                self.india_districts_by_name = {}
                for d in self.india_districts:
                    name_key = d["district"].strip().lower()
                    self.india_districts_by_name.setdefault(name_key, []).append(d)

            india_groups_file = self.india_artifacts_dir / "groups.json"
            if india_groups_file.exists():
                with open(india_groups_file) as f:
                    self.india_groups = json.load(f)
                self.india_groups_by_id = {g["id"]: g for g in self.india_groups}

            india_states_file = self.india_artifacts_dir / "states.json"
            if india_states_file.exists():
                with open(india_states_file) as f:
                    self.india_states = json.load(f)

            india_peers_file = self.india_artifacts_dir / "districts_like.json"
            if india_peers_file.exists():
                with open(india_peers_file) as f:
                    self.india_districts_like = json.load(f)

            india_geo_file = self.india_artifacts_dir / "districts_simplified.geojson"
            if india_geo_file.exists():
                with open(india_geo_file) as f:
                    self.india_geojson = json.load(f)

            india_method_file = self.india_artifacts_dir / "methodology_india.json"
            if india_method_file.exists():
                with open(india_method_file) as f:
                    self.india_methodology = json.load(f)

            india_corr_file = self.india_artifacts_dir / "correlation_matrix.json"
            if india_corr_file.exists():
                with open(india_corr_file) as f:
                    self.india_correlation = json.load(f)

            india_sel_file = self.india_artifacts_dir / "model_selection.json"
            if india_sel_file.exists():
                with open(india_sel_file) as f:
                    self.india_model_selection = json.load(f)

        # Load reports if present
        if REPORTS_DIR.exists():
            join_report_file = REPORTS_DIR / "india_join_report.json"
            if join_report_file.exists():
                with open(join_report_file) as f:
                    self.india_join_report = json.load(f)

            preproc_log_file = REPORTS_DIR / "india_preprocessing_log.json"
            if preproc_log_file.exists():
                with open(preproc_log_file) as f:
                    self.india_preprocessing_log = json.load(f)

            mapping_file = REPORTS_DIR / "india_indicator_mapping.json"
            if mapping_file.exists():
                with open(mapping_file) as f:
                    self.india_indicator_mapping = json.load(f)

            review_csv_file = REPORTS_DIR / "india_join_review.csv"
            if review_csv_file.exists():
                with open(review_csv_file, newline="", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    self.india_join_review = list(reader)

        # Cache world geojson in memory for instant responses
        world_file = GEO_DIR / "world.geojson"
        if not world_file.exists():
            world_file = GEO_DIR / "countries.geojson"
        if world_file.exists():
            try:
                with open(world_file, "r") as f:
                    self.world_geojson = json.load(f)
            except Exception:
                self.world_geojson = {}

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

    # ==========================================
    # INDIA DISTRICTS & REGIONAL ACCESSORS
    # ==========================================
    def get_india_meta(self) -> dict[str, Any]:
        """Returns metadata for India district nutrition dataset."""
        return {
            "total_districts": len(self.india_districts),
            "mapped_districts": sum(1 for d in self.india_districts if d.get("has_boundary")),
            "unmapped_districts": sum(1 for d in self.india_districts if not d.get("has_boundary")),
            "total_states": len(self.india_states),
            "survey": "National Family Health Survey (NFHS-5)",
            "survey_period": "2019–2021",
            "source_citation": "Ministry of Health and Family Welfare, Government of India & IIPS Mumbai (2021)",
            "notice": "Based on NFHS-5 (2019-21) survey estimates. Not medical advice.",
            "grouping_indicators": [
                {"key": "stunting", "label": "Child Stunting", "sublabel": "Height-for-age below -2 SD (under 5 years)", "unit": "%"},
                {"key": "wasting", "label": "Child Wasting", "sublabel": "Weight-for-height below -2 SD (under 5 years)", "unit": "%"},
                {"key": "underweight", "label": "Child Underweight", "sublabel": "Weight-for-age below -2 SD (under 5 years)", "unit": "%"},
                {"key": "anaemia_children", "label": "Child Anaemia", "sublabel": "Hb < 11.0 g/dl (6–59 months)", "unit": "%"},
                {"key": "anaemia_women", "label": "Women Anaemia", "sublabel": "Hb < 12.0 g/dl (15–49 years)", "unit": "%"},
                {"key": "low_bmi_women", "label": "Women with Low BMI", "sublabel": "BMI < 18.5 kg/m² (15–49 years)", "unit": "%"},
                {"key": "overweight_women", "label": "Women Overweight / Obese", "sublabel": "BMI ≥ 25.0 kg/m² (15–49 years)", "unit": "%"}
            ],
            "context_indicators": [
                {"key": "improved_drinking_water", "label": "Improved Drinking Water Source", "unit": "%"},
                {"key": "improved_sanitation", "label": "Improved Sanitation Facility", "unit": "%"},
                {"key": "clean_cooking_fuel", "label": "Clean Cooking Fuel", "unit": "%"},
                {"key": "women_literacy", "label": "Women Literate (15–49 years)", "unit": "%"},
                {"key": "institutional_births", "label": "Institutional Births", "unit": "%"},
                {"key": "immunization", "label": "Children Fully Immunized (12–23 months)", "unit": "%"},
                {"key": "exclusive_breastfeeding", "label": "Exclusive Breastfeeding (under 6 months)", "unit": "%", "note": "High missingness, shown where available"},
                {"key": "pregnant_women_anaemia", "label": "Pregnant Women Anaemia", "unit": "%", "note": "High missingness, shown where available"}
            ],
            "groups": self.india_groups
        }

    def get_india_states(self) -> list[dict[str, Any]]:
        """Returns sorted list of states with summary statistics."""
        states_list = list(self.india_states.values())
        states_list.sort(key=lambda s: s.get("state", "").lower())
        return states_list

    def get_india_districts(
        self,
        state: str | None = None,
        group_id: str | None = None,
        search: str | None = None
    ) -> list[dict[str, Any]]:
        """Returns list of districts with optional filtering."""
        results = self.india_districts

        if state:
            st_clean = state.strip().lower()
            results = [d for d in results if d.get("state", "").strip().lower() == st_clean]

        if group_id:
            g_str = str(group_id).strip()
            results = [d for d in results if str(d.get("group_id")) == g_str]

        if search:
            q = search.strip().lower()
            results = [
                d for d in results
                if q in d.get("district", "").lower() or q in d.get("state", "").lower()
            ]

        return results

    def get_district_detail(self, state: str, district: str) -> dict[str, Any]:
        """Returns full detail for a district. Resolves state + district combinations."""
        s_clean = state.strip()
        d_clean = district.strip()
        exact_key = f"{s_clean.lower()}::{d_clean.lower()}"

        # 1. Exact match
        if exact_key in self.india_districts_by_state_dist:
            return self.india_districts_by_state_dist[exact_key]

        # 2. Check if district name uniquely matches across states
        name_matches = self.india_districts_by_name.get(d_clean.lower(), [])
        if len(name_matches) == 1:
            return name_matches[0]
        elif len(name_matches) > 1:
            # Try to match state substring
            for m in name_matches:
                if s_clean.lower() in m.get("state", "").lower() or m.get("state", "").lower() in s_clean.lower():
                    return m

        # 3. Fuzzy match fallback
        import rapidfuzz
        all_keys = list(self.india_districts_by_state_dist.keys())
        match = rapidfuzz.process.extractOne(exact_key, all_keys, score_cutoff=80)
        if match:
            return self.india_districts_by_state_dist[match[0]]

        raise HTTPException(
            status_code=404,
            detail=f"District '{d_clean}' in state '{s_clean}' not found in NFHS-5 dataset."
        )

    def get_district_like(self, state: str, district: str) -> list[dict[str, Any]]:
        """Returns 10 nearest districts in feature space."""
        d = self.get_district_detail(state, district)
        d_id = d.get("district_id")
        if d_id and d_id in self.india_districts_like:
            return self.india_districts_like[d_id]
        key = f"{d.get('state')}::{d.get('district')}"
        return self.india_districts_like.get(key, [])

    def get_india_state_summary(self, state: str) -> dict[str, Any]:
        """Returns state summary and all its districts."""
        s_clean = state.strip()
        state_obj = None

        for k, v in self.india_states.items():
            if k.lower() == s_clean.lower():
                state_obj = dict(v)
                break

        if not state_obj:
            import rapidfuzz
            match = rapidfuzz.process.extractOne(s_clean, list(self.india_states.keys()), score_cutoff=75)
            if match:
                state_obj = dict(self.india_states[match[0]])

        if not state_obj:
            raise HTTPException(status_code=404, detail=f"State '{s_clean}' not found.")

        # Attach list of districts for this state
        matched_state_name = state_obj.get("state", "")
        state_obj["districts"] = [
            d for d in self.india_districts
            if d.get("state", "").strip().lower() == matched_state_name.strip().lower()
        ]
        return state_obj

    def get_india_map(self, indicator: str = "group") -> dict[str, Any]:
        """Returns GeoJSON FeatureCollection enriched with indicator/group properties."""
        if not self.india_geojson:
            raise HTTPException(status_code=404, detail="India district GeoJSON not available.")

        features = []
        for feat in self.india_geojson.get("features", []):
            props = dict(feat.get("properties", {}))
            d_id = props.get("district_id")
            d = self.india_districts_by_id.get(d_id) if d_id else None

            if d:
                props["has_boundary"] = True
                props["group_id"] = d.get("group_id")
                props["group_name"] = d.get("group_name")
                props["group_descriptor"] = d.get("group_descriptor")

                if indicator and indicator != "group":
                    ind_info = d.get("indicators", {}).get(indicator, {})
                    props["indicator_key"] = indicator
                    props["indicator_value"] = ind_info.get("value")
                    props["indicator_band"] = ind_info.get("band")
                    props["is_missing"] = ind_info.get("is_missing", False)
                    props["state_average"] = ind_info.get("state_average")
            else:
                props["has_boundary"] = False
                props["label"] = "no boundary available"
                props["indicator_key"] = indicator
                props["indicator_value"] = None
                props["is_missing"] = True

            features.append({
                "type": feat.get("type", "Feature"),
                "geometry": feat.get("geometry"),
                "properties": props
            })

        return {
            "type": "FeatureCollection",
            "indicator": indicator,
            "features": features
        }

    def get_world_map(self, indicator: str = "group") -> dict[str, Any]:
        """Returns world GeoJSON FeatureCollection or clear missing notice."""
        if not self.world_geojson or not self.world_geojson.get("features"):
            return {
                "available": False,
                "message": "world.geojson boundary file is missing"
            }

        try:
            features = []
            for feat in self.world_geojson.get("features", []):
                props = dict(feat.get("properties", {}))
                iso = props.get("ISO3166-1-Alpha-3") or props.get("iso3") or props.get("ISO_A3")
                if iso:
                    iso = str(iso).upper()
                    c = self.countries_by_iso.get(iso)
                    if c:
                        props["country_name"] = c.get("country_name")
                        props["iso3"] = c.get("iso3")
                        props["group_id"] = c.get("group_id")
                        props["group_name"] = c.get("group_name")
                        if indicator and indicator != "group":
                            props["indicator_key"] = indicator
                            props["indicator_value"] = c.get(indicator)
                features.append({
                    "type": feat.get("type", "Feature"),
                    "geometry": feat.get("geometry"),
                    "properties": props
                })

            return {
                "available": True,
                "type": "FeatureCollection",
                "indicator": indicator,
                "features": features
            }
        except Exception as e:
            return {
                "available": False,
                "message": f"Could not process world boundary file: {str(e)}"
            }

    # Analysis domain accessors
    def get_analysis_india_methodology(self) -> dict[str, Any]:
        return self.india_methodology

    def get_analysis_india_correlation(self) -> dict[str, Any]:
        return self.india_correlation

    def get_analysis_india_model_selection(self) -> dict[str, Any]:
        return self.india_model_selection

    def get_analysis_india_join_report(self) -> dict[str, Any]:
        return {
            "report": self.india_join_report,
            "reviews": self.india_join_review
        }

    def get_analysis_india_preprocessing_log(self) -> dict[str, Any]:
        return self.india_preprocessing_log

# Global singleton
store = DataStore()
