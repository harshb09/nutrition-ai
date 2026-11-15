from fastapi import APIRouter, Path, Response
from fastapi.responses import FileResponse
from app.services.data_store import store
from app.services.pdf_generator import generate_country_pdf_brief

router = APIRouter(tags=["Exports"])

@router.get("/dataset.csv")
def download_dataset_csv():
    csv_path = store.get_dataset_csv_path()
    return FileResponse(
        path=str(csv_path),
        media_type="text/csv",
        filename="nutrition_atlas_dataset.csv"
    )

@router.get("/countries/{iso3}/brief.pdf")
def download_country_pdf_brief(
    iso3: str = Path(..., description="3-letter ISO country code", min_length=3, max_length=3)
):
    country = store.get_country(iso3)
    peers = store.get_peers(iso3)
    trends_data = store.get_trends(iso3)
    series = trends_data.get("series", [])
    
    pdf_bytes = generate_country_pdf_brief(
        country_data=country,
        peers=peers,
        trends_series=series
    )
    
    headers = {
        "Content-Disposition": f'inline; filename="{iso3.upper()}_malnutrition_brief.pdf"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
