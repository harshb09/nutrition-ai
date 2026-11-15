from fastapi import APIRouter, Path
from app.models.group import GroupSummary
from app.services.data_store import store

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.get("", response_model=list[GroupSummary])
def list_groups():
    return store.get_groups()

@router.get("/{id}", response_model=GroupSummary)
def get_group_detail(
    id: str = Path(..., description="Group identifier, e.g. 'A', 'B', 'C'")
):
    return store.get_group(id)
