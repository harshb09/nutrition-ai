from typing import Any
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import Response
from app.services.data_store import store
from app.services.pdf_district import generate_district_pdf

router = APIRouter(prefix="/india", tags=["India Districts"])

@router.get("/meta")
def get_india_meta() -> dict[str, Any]:
    """Returns dataset metadata, indicators list, and group definitions for India districts."""
    return store.get_india_meta()

@router.get("/states")
def get_india_states() -> list[dict[str, Any]]:
    """Returns all 36 Indian states and union territories with summary stats."""
    return store.get_india_states()

@router.get("/districts")
def get_india_districts(
    state: str | None = Query(None, description="Filter by state name"),
    group_id: str | None = Query(None, description="Filter by group ID"),
    search: str | None = Query(None, description="Search term for district or state")
) -> list[dict[str, Any]]:
    """Returns list of districts matching the filter criteria."""
    return store.get_india_districts(state=state, group_id=group_id, search=search)

@router.get("/districts/{state}/{district}")
def get_district_detail(state: str, district: str) -> dict[str, Any]:
    """Returns full nutrition profile, indicators, tertile bands, and context for a district."""
    return store.get_district_detail(state=state, district=district)

@router.get("/districts/{state}/{district}/like")
def get_district_peers(state: str, district: str) -> list[dict[str, Any]]:
    """Returns 10 nearest districts across India with plain-language comparison lines."""
    return store.get_district_like(state=state, district=district)

@router.get("/state/{state}/summary")
def get_india_state_summary(state: str) -> dict[str, Any]:
    """Returns state-level averages, higher-than-most counts, and list of districts in state."""
    return store.get_india_state_summary(state=state)

@router.get("/map")
def get_india_map(
    indicator: str = Query("group", description="Indicator key or 'group' for choropleth styling")
) -> dict[str, Any]:
    """Returns simplified GeoJSON FeatureCollection with district properties."""
    return store.get_india_map(indicator=indicator)

@router.get("/district-brief.pdf")
def get_district_brief_pdf(
    state: str = Query(..., description="State name"),
    district: str = Query(..., description="District name")
) -> Response:
    """Generates a downloadable single-page A4 PDF brief for the specified district."""
    d = store.get_district_detail(state=state, district=district)
    peers = store.get_district_like(state=state, district=district)
    state_sum = store.india_states.get(d.get("state", ""))
    
    pdf_bytes = generate_district_pdf(d, peers, state_sum)
    filename = f"{d.get('district', 'District')}_{d.get('state', 'State')}_Nutrition_Brief.pdf".replace(" ", "_")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "public, max-age=3600"
        }
    )
