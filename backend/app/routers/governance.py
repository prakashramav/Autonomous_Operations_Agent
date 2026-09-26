from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.governance.models import UserRole, RiskLevel, ActionStatus, AuditRecord, CircuitBreakerState
from app.governance.policies import policy_engine, ENTERPRISE_POLICY_MATRIX, ROLE_HIERARCHY
from app.governance.audit import audit_logger

router = APIRouter(prefix="/governance", tags=["Safety & Governance"])

class CircuitBreakerToggleRequest(BaseModel):
    is_active: bool
    actor_id: str = "adm-sec-01"
    reason: Optional[str] = "Emergency security freeze triggered by system administrator."

class AuditLogQueryResponse(BaseModel):
    total_records: int
    records: List[AuditRecord]
    circuit_breaker_active: bool

class RoleInfo(BaseModel):
    role: str
    hierarchy_rank: int
    title: str
    description: str
    default_actor_id: str
    allowed_tools_count: int

@router.get("/policies")
async def get_policies():
    """Returns the enterprise safety policy matrix, role ranks, and active circuit breaker state."""
    policies = policy_engine.list_policies()
    cb = policy_engine.get_circuit_breaker_status()
    return {
        "status": "success",
        "circuit_breaker": cb.dict(),
        "total_policies": len(policies),
        "policies": policies,
        "roles": [r.value for r in UserRole]
    }

@router.post("/circuit-breaker")
async def toggle_circuit_breaker(request: CircuitBreakerToggleRequest):
    """
    Emergency Kill Switch / Circuit Breaker.
    Immediately halts or resumes all autonomous agent operations and MCP tool invocations.
    """
    updated_state = policy_engine.set_circuit_breaker(
        active=request.is_active,
        actor_id=request.actor_id,
        reason=request.reason or ("Emergency freeze" if request.is_active else "Resumed")
    )

    # Log to audit trail
    audit_logger.log(
        session_id="global-governance",
        actor_id=request.actor_id,
        actor_role=UserRole.ADMIN,
        action_type="CIRCUIT_BREAKER",
        tool_name="EMERGENCY_KILL_SWITCH",
        risk_level=RiskLevel.CRITICAL,
        status=ActionStatus.BLOCKED_CIRCUIT_BREAKER if request.is_active else ActionStatus.GRANTED,
        input_summary=f"Circuit Breaker toggle: is_active={request.is_active}",
        output_summary=f"State changed to {request.is_active}. Reason: {request.reason}",
        policy_reason="Administrative Circuit Breaker Triggered"
    )

    return {
        "status": "success",
        "circuit_breaker": updated_state.dict()
    }

@router.get("/audit-logs", response_model=AuditLogQueryResponse)
async def get_audit_logs(
    role: Optional[str] = Query(None, description="Filter by UserRole (EMPLOYEE, MANAGER, ADMIN)"),
    status: Optional[str] = Query(None, description="Filter by ActionStatus"),
    risk_level: Optional[str] = Query(None, description="Filter by RiskLevel (LOW, MEDIUM, HIGH, CRITICAL)"),
    tool_name: Optional[str] = Query(None, description="Filter by tool name"),
    search: Optional[str] = Query(None, description="Search query across summaries and actor IDs"),
    limit: int = Query(50, ge=1, le=200)
):
    """Queries structured, cryptographically chained enterprise audit logs."""
    records = audit_logger.get_records(
        role=role,
        status=status,
        risk_level=risk_level,
        tool_name=tool_name,
        search=search,
        limit=limit
    )
    cb = policy_engine.get_circuit_breaker_status()
    return AuditLogQueryResponse(
        total_records=len(records),
        records=records,
        circuit_breaker_active=cb.is_active
    )

@router.delete("/audit-logs")
async def clear_audit_logs():
    """Resets audit trail to clean seeded state (Development / Testing)."""
    audit_logger.clear()
    return {"status": "success", "message": "Audit trail re-seeded."}

@router.get("/roles")
async def get_roles():
    """Returns metadata for all supported enterprise roles."""
    roles_data = [
        RoleInfo(
            role=UserRole.EMPLOYEE.value,
            hierarchy_rank=ROLE_HIERARCHY[UserRole.EMPLOYEE],
            title="Operational Employee",
            description="Can query corporate documents, search Drive, summarize data, draft emails, and read communication channels. Restricted from external dispatches.",
            default_actor_id="emp-7492 (Sarah Lin)",
            allowed_tools_count=sum(
                1 for p in ENTERPRISE_POLICY_MATRIX.values()
                if policy_engine.is_role_authorized(UserRole.EMPLOYEE, p.min_role)
            )
        ),
        RoleInfo(
            role=UserRole.MANAGER.value,
            hierarchy_rank=ROLE_HIERARCHY[UserRole.MANAGER],
            title="Department Manager",
            description="Authorized to broadcast Slack messages, schedule executive meetings, update ticket workflows, and grant clearance on human approval gates.",
            default_actor_id="mgr-0182 (Elena Rostova)",
            allowed_tools_count=sum(
                1 for p in ENTERPRISE_POLICY_MATRIX.values()
                if policy_engine.is_role_authorized(UserRole.MANAGER, p.min_role)
            )
        ),
        RoleInfo(
            role=UserRole.ADMIN.value,
            hierarchy_rank=ROLE_HIERARCHY[UserRole.ADMIN],
            title="Security & System Admin",
            description="Full operational authority, access to emergency circuit breaker kill switch, audit trail inspection, and policy enforcement overrides.",
            default_actor_id="adm-sec-01 (Marcus Vance)",
            allowed_tools_count=len(ENTERPRISE_POLICY_MATRIX)
        )
    ]
    return {"status": "success", "roles": roles_data}
