import json
import uuid
from typing import List, Optional, Literal, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent.graph import agent_runner
from app.services.gemini_client import gemini_service
from app.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., min_length=1)
    session_id: Optional[str] = None
    stream: bool = True
    system_prompt: Optional[str] = None
    use_agent: bool = True  # Phase 2 LangGraph agent workflow
    user_role: Optional[str] = "EMPLOYEE"  # "EMPLOYEE", "MANAGER", "ADMIN"
    actor_id: Optional[str] = None

class ApprovalDecisionRequest(BaseModel):
    session_id: str
    decision: Literal["approved", "rejected"]
    approver_role: Optional[str] = "MANAGER"  # "MANAGER", "ADMIN"
    approver_id: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    gemini_configured: bool
    model: str
    phase: str = "Phase 2 (LangGraph Agent Brain)"
    capabilities: List[str] = [
        "Autonomous Planner",
        "Tool Selection & Execution",
        "Human Approval Gate",
        "Validation & Synthesis",
        "Short-term Checkpoint Memory"
    ]

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
    Chat endpoint for Enterprise Operations Agent.
    - When use_agent=True: executes LangGraph StateGraph (Phase 2), streaming plan, tool execution,
      human approval gates, and final executive debrief via SSE.
    - When use_agent=False: direct proxy to Gemini streaming.
    """
    session_id = request.session_id or f"sess-{uuid.uuid4().hex[:10]}"
    last_user_message = next(
        (m.content for m in reversed(request.messages) if m.role == "user"),
        ""
    )

    if request.use_agent:
        async def agent_event_generator():
            try:
                # Yield session tracking event
                yield f"data: {json.dumps({'event': 'session_init', 'session_id': session_id})}\n\n"

                async for event in agent_runner.stream_operation(
                    session_id=session_id,
                    user_request=last_user_message,
                    user_role=request.user_role or "EMPLOYEE",
                    actor_id=request.actor_id
                ):
                    event_type = event.get("type")
                    if event_type == "plan_created":
                        payload = json.dumps({
                            "event": "plan",
                            "plan": event.get("plan", []),
                            "session_id": session_id
                        })
                        yield f"data: {payload}\n\n"
                    elif event_type == "step_executed":
                        payload = json.dumps({
                            "event": "step_executed",
                            "plan": event.get("plan", []),
                            "observations": event.get("observations", {}),
                            "session_id": session_id
                        })
                        yield f"data: {payload}\n\n"
                    elif event_type == "approval_required":
                        payload = json.dumps({
                            "event": "approval_required",
                            "approval": event.get("approval", {}),
                            "session_id": session_id
                        })
                        yield f"data: {payload}\n\n"
                    elif event_type == "final_response":
                        final_text = event.get("content", "")
                        # Yield structured final response as well as delta for backward compatibility
                        payload = json.dumps({
                            "event": "final_response",
                            "content": final_text,
                            "delta": final_text,
                            "session_id": session_id
                        })
                        yield f"data: {payload}\n\n"
                    elif event_type == "error":
                        payload = json.dumps({"error": event.get("error", "Agent execution error")})
                        yield f"data: {payload}\n\n"

                yield "data: [DONE]\n\n"
            except Exception as e:
                err_payload = json.dumps({"error": str(e)})
                yield f"data: {err_payload}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            agent_event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "X-Session-ID": session_id
            }
        )

    # Legacy direct stream fallback
    formatted_messages = [
        {"role": m.role if m.role in ["user", "assistant"] else "user", "content": m.content}
        for m in request.messages
        if m.role != "system"
    ]

    async def direct_stream_generator():
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
        direct_stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("/approve")
async def approve_endpoint(request: ApprovalDecisionRequest):
    """
    Resumes an interrupted LangGraph agent thread when a human supervisor approves or rejects
    a sensitive action (Human Approval Gate).
    """
    async def resume_event_generator():
        try:
            async for event in agent_runner.resume_with_decision(
                session_id=request.session_id,
                decision=request.decision,
                approver_role=request.approver_role or "MANAGER",
                approver_id=request.approver_id
            ):
                event_type = event.get("type")
                if event_type == "step_executed":
                    payload = json.dumps({
                        "event": "step_executed",
                        "plan": event.get("plan", []),
                        "observations": event.get("observations", {}),
                        "session_id": request.session_id
                    })
                    yield f"data: {payload}\n\n"
                elif event_type == "approval_required":
                    payload = json.dumps({
                        "event": "approval_required",
                        "approval": event.get("approval", {}),
                        "session_id": request.session_id
                    })
                    yield f"data: {payload}\n\n"
                elif event_type == "final_response":
                    final_text = event.get("content", "")
                    payload = json.dumps({
                        "event": "final_response",
                        "content": final_text,
                        "delta": final_text,
                        "session_id": request.session_id
                    })
                    yield f"data: {payload}\n\n"
                elif event_type == "error":
                    payload = json.dumps({"error": event.get("error", "Error resuming workflow")})
                    yield f"data: {payload}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            err_payload = json.dumps({"error": str(e)})
            yield f"data: {err_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        resume_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Session-ID": request.session_id
        }
    )
