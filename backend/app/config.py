import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
_artifacts_env = os.getenv("ARTIFACTS_DIR")
if _artifacts_env:
    _artifacts_path = Path(_artifacts_env)
    DEFAULT_ARTIFACTS_DIR = str(_artifacts_path if _artifacts_path.is_absolute() else (BASE_DIR / _artifacts_path).resolve())
else:
    DEFAULT_ARTIFACTS_DIR = str(BASE_DIR / "artifacts")
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")

if CORS_ORIGINS_RAW.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

