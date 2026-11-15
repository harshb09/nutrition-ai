from pydantic import BaseModel, Field
from typing import Any

class BurdenItem(BaseModel):
    iso3: str
    country_name: str
    region: str
    income_group: str
    group_id: str | None = None
    group_name: str | None = None
    double_burden: bool
    stunting_prevalence: float | None = None
    stunting_prevalence_year: int | None = None
    stunting_count_thousands: float | None = None
    stunting_count_year: int | None = None
    child_overweight_prevalence: float | None = None
    child_overweight_prevalence_year: int | None = None
    child_overweight_count_thousands: float | None = None
    child_overweight_count_year: int | None = None

class BurdenResponse(BaseModel):
    total_count: int
    note: str = Field(
        default="Affected population counts reflect both prevalence and underlying paediatric population size. Sorted for health planning and resource allocation."
    )
    items: list[BurdenItem]
