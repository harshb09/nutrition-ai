from pydantic import BaseModel
from typing import Any

class MethodologyResponse(BaseModel):
    preprocessing_log: dict[str, Any]
    selection: dict[str, Any]
    model_evaluations: list[dict[str, Any]]
    post_hoc_association_tests: dict[str, Any]
    hierarchical_analysis: dict[str, Any]
    pca_analysis: dict[str, Any]
    stability_audit: dict[str, Any]
    sensitivity_analyses: dict[str, Any]
    limitations: list[str]
    responsible_use: list[str]
