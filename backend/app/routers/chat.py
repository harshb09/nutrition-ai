from typing import Any
from pydantic import BaseModel, Field
from fastapi import APIRouter
from app.services.chatbot import generate_chatbot_response

router = APIRouter(prefix="/chat", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=500, description="User question or prompt")
    history: list[dict[str, str]] | None = Field(default=None, description="Previous messages")

class ChatResponse(BaseModel):
    reply: str
    citations: list[str]
    district_id: str | None = None
    state: str | None = None
    district: str | None = None

@router.post("", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest) -> dict[str, Any]:
    """Provides grounded, factual nutrition insights in English or Hindi,
    adhering strictly to NFHS-5 factsheet estimates and international JME data.
    """
    return generate_chatbot_response(payload.message)
