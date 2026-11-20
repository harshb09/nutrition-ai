import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
_artifacts_env = os.getenv("ARTIFACTS_DIR")
if _artifacts_env:
    _artifacts_path = Path(_artifacts_env)
    DEFAULT_ARTIFACTS_DIR = str(_artifacts_path if _artifacts_path.is_absolute() else (BASE_DIR / _artifacts_path).resolve())
else:
    DEFAULT_ARTIFACTS_DIR = str(BASE_DIR / "artifacts")

_india_artifacts_env = os.getenv("INDIA_ARTIFACTS_DIR")
if _india_artifacts_env:
    _india_path = Path(_india_artifacts_env)
    DEFAULT_INDIA_ARTIFACTS_DIR = str(_india_path if _india_path.is_absolute() else (BASE_DIR / _india_path).resolve())
else:
    DEFAULT_INDIA_ARTIFACTS_DIR = str(BASE_DIR / "artifacts" / "india")

GEO_DIR = BASE_DIR.parent / "data" / "geo"
REPORTS_DIR = BASE_DIR.parent / "reports"
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")

if CORS_ORIGINS_RAW.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]


