from typing import List, Dict, Any, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field

class PlanStep(BaseModel):
    step_number: int
    title: str
    description: str
    tool: str
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    is_sensitive: bool = False
    status: str = "pending"  # "pending", "in_progress", "waiting_approval", "completed", "failed", "rejected", "skipped"
    result: Optional[str] = None
    thought: Optional[str] = None

class ApprovalRequest(BaseModel):
    step_number: int
    tool: str
    action_description: str
    parameters: Dict[str, Any]
    risk_level: str = "HIGH"  # "LOW", "MEDIUM", "HIGH"
    reason: str

class AgentState(TypedDict):
    session_id: str
    user_request: str
    messages: List[Dict[str, Any]]
    plan: List[Dict[str, Any]]
    current_step_index: int
    observations: Dict[str, Any]
    pending_approval: Optional[Dict[str, Any]]
    human_decision: Optional[str]  # "approved", "rejected"
    is_complete: bool
    final_response: str
    error: Optional[str]
