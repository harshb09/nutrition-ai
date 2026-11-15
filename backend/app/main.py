import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.services.data_store import store
from app.routers import health, countries, groups, methodology, export

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nutrition_atlas")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Nutrition Atlas API: loading precomputed artifacts...")
    store.load_artifacts()
    logger.info("Artifacts loaded successfully. API is ready to serve requests.")
    yield

app = FastAPI(
    title="Nutrition Atlas API",
    description="Country Malnutrition Profile & Peer Benchmarking API for Health Organisations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes under /api
app.include_router(health.router, prefix="/api")
app.include_router(countries.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(methodology.router, prefix="/api")
app.include_router(export.router, prefix="/api")

@app.get("/")
def root():
    return {
        "name": "Nutrition Atlas API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

