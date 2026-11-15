from fastapi import APIRouter
from app.models.common import HealthResponse
from app.services.data_store import store

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    meta = store.get_metadata()
    counts = meta.get("counts", {})
    return HealthResponse(
        status="ok",
        version="1.0.0",
        artifacts_loaded=store._is_loaded,
        total_countries=counts.get("country_universe", 202),
        analyzed_countries=counts.get("analyzed_countries", 156)
    )

@router.get("/meta")
def get_meta():
    return store.get_metadata()

