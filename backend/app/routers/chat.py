from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import json
from app.services.gemini_client import gemini_service
from app.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., min_length=1)
    stream: bool = True
    system_prompt: Optional[str] = None

class StatusResponse(BaseModel):
    status: str
    gemini_configured: bool
    model: str

@router.get("/status", response_model=StatusResponse)
async def chat_status():
    return StatusResponse(
        status="online",
        gemini_configured=gemini_service.is_configured(),
        model=settings.GEMINI_MODEL
    )

@router.post("")
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint for Enterprise Operations Agent (Phase 1).
    Proxies to Google Gemini (or dev simulator if key is pending).
    Supports Server-Sent Events (SSE) streaming or standard JSON response.
    """
    formatted_messages = [
        {"role": m.role if m.role in ["user", "assistant"] else "user", "content": m.content}
        for m in request.messages
        if m.role != "system"
    ]

    # If stream requested (default), return SSE stream
    if request.stream:
        async def event_generator():
            try:
                async for chunk in gemini_service.stream_chat(
                    messages=formatted_messages,
                    system_prompt=request.system_prompt
                ):
                    payload = json.dumps({"delta": chunk})
                    yield f"data: {payload}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                err_payload = json.dumps({"error": str(e)})
                yield f"data: {err_payload}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # Non-streaming fallback
    full_text = ""
    try:
        async for chunk in gemini_service.stream_chat(
            messages=formatted_messages,
            system_prompt=request.system_prompt
        ):
            full_text += chunk
        return {"role": "assistant", "content": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
