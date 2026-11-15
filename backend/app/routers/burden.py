from fastapi import APIRouter, Query, Response
from app.models.burden import BurdenResponse, BurdenItem
from app.services.data_store import store

router = APIRouter(prefix="/burden", tags=["Burden & Priority"])

@router.get("", response_model=BurdenResponse)
def get_burden_priority(
    region: str | None = Query(None, description="Filter by World Bank Region"),
    income_group: str | None = Query(None, description="Filter by Income Group"),
    group_id: str | None = Query(None, description="Filter by similar-profile group (e.g. A, B, C)"),
    double_burden: bool | None = Query(None, description="Filter by concurrent double-burden status"),
    sort_by: str = Query("stunting_count", description="Sort by: stunting_count, stunting_prev, overweight_count, overweight_prev, country"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc")
):
    items = store.get_burden_data(
        region=region,
        income_group=income_group,
        group_id=group_id,
        double_burden=double_burden,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return BurdenResponse(
        total_count=len(items),
        items=[BurdenItem(**it) for it in items]
    )

@router.get("/csv")
def get_burden_csv(
    region: str | None = Query(None, description="Filter by World Bank Region"),
    income_group: str | None = Query(None, description="Filter by Income Group"),
    group_id: str | None = Query(None, description="Filter by similar-profile group (e.g. A, B, C)"),
    double_burden: bool | None = Query(None, description="Filter by concurrent double-burden status"),
    sort_by: str = Query("stunting_count", description="Sort by: stunting_count, stunting_prev, overweight_count, overweight_prev, country"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc")
):
    csv_str = store.get_burden_csv_content(
        region=region,
        income_group=income_group,
        group_id=group_id,
        double_burden=double_burden,
        sort_by=sort_by,
        sort_order=sort_order
    )
    headers = {
        "Content-Disposition": 'attachment; filename="malnutrition_burden_priority.csv"'
    }
    return Response(content=csv_str, media_type="text/csv", headers=headers)

