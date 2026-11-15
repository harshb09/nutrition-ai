from pydantic import BaseModel, Field
from typing import Any

class CountrySummary(BaseModel):
    iso3: str
    country_name: str
    income_group: str
    region: str
    status: str
    group_id: str | None = None
    group_name: str | None = None
    notice: str | None = None
    double_burden: bool
    relative_flags: dict[str, bool]
    indicators: dict[str, float | None]
    indicators_raw: dict[str, float | None]
    is_imputed: dict[str, bool]
    data_years: dict[str, int | None]
    stability_score: float | None = None
    missing_feature_count: int
    stunting_count_thousands: float | None = None
    stunting_count_year: int | None = None
    child_overweight_count_thousands: float | None = None
    child_overweight_count_year: int | None = None
    stunting_change_2000_2024: float | None = None
    story: str | None = None

class CountryDetail(CountrySummary):
    group_means: dict[str, float] | None = None
    group_provisional_name: str | None = None
    group_descriptor: str | None = None
    dataset_medians: dict[str, float] = Field(default_factory=dict)
    thresholds_75th_percentile: dict[str, float] = Field(default_factory=dict)
    features_meta: dict[str, Any] = Field(default_factory=dict)

class PeerCountry(BaseModel):
    iso3: str
    country_name: str
    distance: float
    differences: dict[str, float | None]
    values: dict[str, float | None]

class LearnPeerCountry(BaseModel):
    iso3: str
    country_name: str
    distance: float
    stunting_change_2000_2024: float | None
    stunting_2024: float | None
    series: list[dict[str, Any]] = Field(default_factory=list)

class TrendPoint(BaseModel):
    year: int
    stunting: float | None = None
    child_overweight: float | None = None

class CountryTrends(BaseModel):
    iso3: str
    country_name: str
    group_id: str | None = None
    series: list[TrendPoint]
    peers: dict[str, Any]
    group_average: list[TrendPoint]
