import hashlib
import time
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ActionStatus(str, Enum):
    GRANTED = "GRANTED"
    DENIED = "DENIED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    BLOCKED_CIRCUIT_BREAKER = "BLOCKED_CIRCUIT_BREAKER"

class AuditRecord(BaseModel):
    id: str
    timestamp: float
    iso_time: str
    session_id: str
    actor_id: str
    actor_role: UserRole
    action_type: str  # "TOOL_EXECUTION", "APPROVAL_GATE", "POLICY_CHECK", "CIRCUIT_BREAKER"
    tool_name: str
    risk_level: RiskLevel
    status: ActionStatus
    input_summary: str
    output_summary: Optional[str] = None
    policy_reason: Optional[str] = None
    integrity_hash: str
    previous_hash: Optional[str] = None

    @classmethod
    def create(
        cls,
        session_id: str,
        actor_id: str,
        actor_role: UserRole,
        action_type: str,
        tool_name: str,
        risk_level: RiskLevel,
        status: ActionStatus,
        input_summary: str,
        output_summary: Optional[str] = None,
        policy_reason: Optional[str] = None,
        previous_hash: Optional[str] = None
    ) -> "AuditRecord":
        now = time.time()
        import datetime
        iso = datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc).isoformat()
        record_id = f"aud-{int(now * 1000)}-{hashlib.md5(f'{tool_name}{now}'.encode()).hexdigest()[:6]}"
        
        # Calculate cryptographic tamper-evident hash
        payload_str = f"{record_id}:{now}:{session_id}:{actor_id}:{actor_role.value}:{tool_name}:{status.value}:{previous_hash or 'GENESIS'}"
        integrity_hash = hashlib.sha256(payload_str.encode()).hexdigest()

        return cls(
            id=record_id,
            timestamp=now,
            iso_time=iso,
            session_id=session_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action_type=action_type,
            tool_name=tool_name,
            risk_level=risk_level,
            status=status,
            input_summary=input_summary,
            output_summary=output_summary,
            policy_reason=policy_reason,
            integrity_hash=integrity_hash,
            previous_hash=previous_hash
        )

class CircuitBreakerState(BaseModel):
    is_active: bool = False
    triggered_by: Optional[str] = None
    reason: Optional[str] = None
    timestamp: Optional[float] = None
    iso_time: Optional[str] = None

class PolicyRule(BaseModel):
    tool_name: str
    category: str
    min_role: UserRole
    risk_level: RiskLevel
    requires_approval: bool
    description: str
