from fastapi import APIRouter
from app.models.simulation import SimulationRequest, SimulationResponse
from app.services.data_store import store

router = APIRouter(prefix="/simulate", tags=["Target Simulator"])

@router.post("", response_model=SimulationResponse)
def simulate_target(body: SimulationRequest):
    result = store.simulate_profile(body.model_dump())
    return result

