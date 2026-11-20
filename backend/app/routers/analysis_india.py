from typing import Any
from fastapi import APIRouter
from app.services.data_store import store

router = APIRouter(prefix="/analysis/india", tags=["Analysis - India Districts"])

@router.get("/methodology")
def get_india_methodology() -> dict[str, Any]:
    """Returns methodology details, validation metrics, PCA, stability and limitations for India districts."""
    return store.get_analysis_india_methodology()

@router.get("/correlation")
def get_india_correlation() -> dict[str, Any]:
    """Returns correlation matrix for the 7 Indian nutrition grouping indicators."""
    return store.get_analysis_india_correlation()

@router.get("/model-selection")
def get_india_model_selection() -> dict[str, Any]:
    """Returns model selection results and comparison grid."""
    return store.get_analysis_india_model_selection()

@router.get("/join-report")
def get_india_join_report() -> dict[str, Any]:
    """Returns boundary join statistics, close match reviews, and unmatched district lists."""
    return store.get_analysis_india_join_report()

@router.get("/preprocessing-log")
def get_india_preprocessing_log() -> dict[str, Any]:
    """Returns preprocessing audit log for NFHS-5 factsheet ingestion."""
    return store.get_analysis_india_preprocessing_log()
