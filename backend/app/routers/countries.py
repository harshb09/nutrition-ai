from fastapi import APIRouter, Query, Path
from app.models.country import CountrySummary, CountryDetail, PeerCountry, LearnPeerCountry, CountryTrends
from app.services.data_store import store

router = APIRouter(prefix="/countries", tags=["Countries"])

@router.get("", response_model=list[CountrySummary])
def list_countries(
    group_id: str | None = Query(None, description="Filter by group ID (e.g. A, B, C)"),
    status: str | None = Query(None, description="Filter by status: 'analyzed' or 'insufficient_data'"),
    search: str | None = Query(None, description="Search by country name or ISO3 code")
):
    return store.get_countries(group_id=group_id, status=status, search=search)

@router.get("/{iso3}", response_model=CountryDetail)
def get_country_detail(
    iso3: str = Path(..., description="3-letter ISO country code", min_length=3, max_length=3)
):
    return store.get_country(iso3)

@router.get("/{iso3}/peers", response_model=list[PeerCountry])
def get_country_peers(
    iso3: str = Path(..., description="3-letter ISO country code", min_length=3, max_length=3)
):
    return store.get_peers(iso3)

@router.get("/{iso3}/learn-peers", response_model=list[LearnPeerCountry])
def get_country_learn_peers(
    iso3: str = Path(..., description="3-letter ISO country code", min_length=3, max_length=3)
):
    return store.get_learn_peers(iso3)

@router.get("/{iso3}/trends", response_model=CountryTrends)
def get_country_trends(
    iso3: str = Path(..., description="3-letter ISO country code", min_length=3, max_length=3)
):
    return store.get_trends(iso3)

