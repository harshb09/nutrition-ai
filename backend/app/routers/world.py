from typing import Any
from fastapi import APIRouter, Query
from app.services.data_store import store

router = APIRouter(prefix="/world", tags=["World Map"])

@router.get("/map")
def get_world_map(
    indicator: str = Query("group", description="Indicator key or 'group'")
) -> dict[str, Any]:
    """Returns world GeoJSON FeatureCollection or a clear notice if the boundary file is missing."""
    return store.get_world_map(indicator=indicator)
