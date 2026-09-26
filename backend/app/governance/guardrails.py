import json
import logging
from typing import Dict, Any, Tuple
from app.governance.models import UserRole, RiskLevel, ActionStatus
from app.governance.policies import policy_engine
from app.governance.audit import audit_logger

logger = logging.getLogger(__name__)

class GuardrailValidationResult:
    def __init__(
        self,
        allowed: bool,
        status: ActionStatus,
        risk_level: RiskLevel,
        requires_approval: bool,
        reason: str,
        tool_name: str,
        user_role: UserRole,
        actor_id: str
    ):
        self.allowed = allowed
        self.status = status
        self.risk_level = risk_level
        self.requires_approval = requires_approval
        self.reason = reason
        self.tool_name = tool_name
        self.user_role = user_role
        self.actor_id = actor_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "status": self.status.value,
            "risk_level": self.risk_level.value,
            "requires_approval": self.requires_approval,
            "reason": self.reason,
            "tool_name": self.tool_name,
            "user_role": self.user_role.value,
            "actor_id": self.actor_id
        }

def validate_execution_guardrails(
    tool_name: str,
    user_role_str: str,
    actor_id: str,
    session_id: str,
    tool_args: Dict[str, Any]
) -> GuardrailValidationResult:
    """
    Evaluates enterprise security guardrails before tool execution:
    1. Circuit Breaker / Emergency Kill Switch.
    2. Role-Based Access Control (RBAC) against policy matrix.
    3. Human Approval Gate requirements.
    Logs evaluation immediately to the structured audit trail.
    """
    # Parse role safely
    try:
        user_role = UserRole(user_role_str.upper())
    except ValueError:
        user_role = UserRole.EMPLOYEE

    input_summary = f"Tool: {tool_name} | Args: {json.dumps(tool_args)[:200]}"

    # 1. Emergency Circuit Breaker Check
    cb_status = policy_engine.get_circuit_breaker_status()
    if cb_status.is_active:
        reason = f"Execution blocked: Autonomous Operations frozen by Circuit Breaker ({cb_status.reason})"
        audit_logger.log(
            session_id=session_id,
            actor_id=actor_id,
            actor_role=user_role,
            action_type="CIRCUIT_BREAKER",
            tool_name=tool_name,
            risk_level=RiskLevel.CRITICAL,
            status=ActionStatus.BLOCKED_CIRCUIT_BREAKER,
            input_summary=input_summary,
            output_summary=reason,
            policy_reason="Emergency Kill Switch Active"
        )
        return GuardrailValidationResult(
            allowed=False,
            status=ActionStatus.BLOCKED_CIRCUIT_BREAKER,
            risk_level=RiskLevel.CRITICAL,
            requires_approval=False,
            reason=reason,
            tool_name=tool_name,
            user_role=user_role,
            actor_id=actor_id
        )

    # 2. RBAC Policy Check
    rule = policy_engine.get_rule_for_tool(tool_name)
    if not policy_engine.is_role_authorized(user_role, rule.min_role):
        reason = (
            f"Policy Denied: Role '{user_role.value}' does not possess authorization to invoke '{tool_name}'. "
            f"Minimum required role is '{rule.min_role.value}'."
        )
        audit_logger.log(
            session_id=session_id,
            actor_id=actor_id,
            actor_role=user_role,
            action_type="POLICY_CHECK",
            tool_name=tool_name,
            risk_level=rule.risk_level,
            status=ActionStatus.DENIED,
            input_summary=input_summary,
            output_summary=reason,
            policy_reason=f"Insufficient role permissions (required: {rule.min_role.value})"
        )
        return GuardrailValidationResult(
            allowed=False,
            status=ActionStatus.DENIED,
            risk_level=rule.risk_level,
            requires_approval=False,
            reason=reason,
            tool_name=tool_name,
            user_role=user_role,
            actor_id=actor_id
        )

    # 3. Sensitive Action / Human Clearance Gate Check
    if rule.requires_approval or rule.risk_level == RiskLevel.HIGH:
        reason = f"Tool '{tool_name}' has risk level {rule.risk_level.value} and requires supervisor clearance."
        audit_logger.log(
            session_id=session_id,
            actor_id=actor_id,
            actor_role=user_role,
            action_type="APPROVAL_GATE",
            tool_name=tool_name,
            risk_level=rule.risk_level,
            status=ActionStatus.PENDING_APPROVAL,
            input_summary=input_summary,
            output_summary="Awaiting human supervisor clearance",
            policy_reason="Sensitive external dispatch policy"
        )
        return GuardrailValidationResult(
            allowed=True,
            status=ActionStatus.PENDING_APPROVAL,
            risk_level=rule.risk_level,
            requires_approval=True,
            reason=reason,
            tool_name=tool_name,
            user_role=user_role,
            actor_id=actor_id
        )

    # 4. Standard Authorized Execution
    audit_logger.log(
        session_id=session_id,
        actor_id=actor_id,
        actor_role=user_role,
        action_type="POLICY_CHECK",
        tool_name=tool_name,
        risk_level=rule.risk_level,
        status=ActionStatus.GRANTED,
        input_summary=input_summary,
        output_summary="Guardrail checks passed",
        policy_reason=f"Role '{user_role.value}' authorized for {rule.risk_level.value} risk action"
    )

    return GuardrailValidationResult(
        allowed=True,
        status=ActionStatus.GRANTED,
        risk_level=rule.risk_level,
        requires_approval=False,
        reason="Guardrail checks passed successfully.",
        tool_name=tool_name,
        user_role=user_role,
        actor_id=actor_id
    )
