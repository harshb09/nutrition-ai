from pydantic import BaseModel, Field
from typing import Any

class GroupMember(BaseModel):
    iso3: str
    country_name: str
    stability_score: float | None = None

class GroupSummary(BaseModel):
    id: str
    name: str
    provisional_name: str
    descriptor: str
    country_count: int
    member_iso3s: list[str]
    member_countries: list[GroupMember]
    means: dict[str, float]
    medians: dict[str, float]
    stds: dict[str, float]
    centroid_z_scores: dict[str, float]
    income_distribution: dict[str, int]
    region_distribution: dict[str, int]

