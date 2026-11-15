from pydantic import BaseModel, Field
from typing import Any

class SimulationRequest(BaseModel):
    stunting: float
    child_overweight: float
    wasting: float
    adult_obesity: float
    adult_diabetes: float
    anaemia_women: float
    low_birth_weight: float

class GroupCloseness(BaseModel):
    group_id: str
    group_name: str
    distance: float
    closeness_score: float
    is_closest: bool

class ClosestCountry(BaseModel):
    iso3: str
    country_name: str
    group_id: str | None
    distance: float

class SimulationClosestGroup(BaseModel):
    id: str
    name: str
    provisional_name: str
    descriptor: str

class SimulationResponse(BaseModel):
    closest_group: SimulationClosestGroup
    group_closeness: list[GroupCloseness]
    closest_countries: list[ClosestCountry]
    clamped_inputs: dict[str, float]
    label: str = Field(
        default="Where this profile would sit relative to current countries. This is not a forecast."
    )

