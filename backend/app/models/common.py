from pydantic import BaseModel, Field
from typing import Any

class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Server health status")
    version: str = Field(default="1.0.0", description="API version")
    artifacts_loaded: bool = Field(default=True, description="Whether artifacts are loaded into memory")
    total_countries: int = Field(..., description="Total countries in country universe")
    analyzed_countries: int = Field(..., description="Countries with sufficient data for clustering")

class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Human-readable error explanation")
