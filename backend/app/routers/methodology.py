from fastapi import APIRouter
from app.models.methodology import MethodologyResponse
from app.services.data_store import store

router = APIRouter(prefix="/methodology", tags=["Methodology"])

@router.get("", response_model=MethodologyResponse)
def get_methodology():
    return store.get_methodology()

