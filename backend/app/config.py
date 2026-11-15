import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ARTIFACTS_DIR = os.getenv("ARTIFACTS_DIR", str(BASE_DIR / "artifacts"))
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")

if CORS_ORIGINS_RAW.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

