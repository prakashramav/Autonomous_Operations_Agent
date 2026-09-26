import json
import logging
from typing import List, Optional, Dict, Any
from app.governance.models import AuditRecord, UserRole, RiskLevel, ActionStatus

logger = logging.getLogger(__name__)

class AuditLogger:
    def __init__(self, max_records: int = 1000):
        self.max_records = max_records
        self._records: List[AuditRecord] = []
        self._last_hash: Optional[str] = None
        self._seed_initial_records()

    def _seed_initial_records(self):
        """Seeds realistic historical audit records for initial enterprise governance review."""
        sample_events = [
            (
                "sess-init-001",
                "emp-7492 (Sarah Lin)",
                UserRole.EMPLOYEE,
                "POLICY_CHECK",
                "search_company_docs",
                RiskLevel.LOW,
                ActionStatus.GRANTED,
                "Query: 'Sales report Q3 2026 revenue anomalies'",
                "Returned 3 matched vector chunks with 94.2% semantic similarity",
                "Employee permitted read access to corporate knowledge base."
            ),
            (
                "sess-init-002",
                "emp-7492 (Sarah Lin)",
                UserRole.EMPLOYEE,
                "TOOL_EXECUTION",
                "summarize_data",
                RiskLevel.LOW,
                ActionStatus.EXECUTED,
                "Analyzed Q3 Sales Report text (focus: gross margin, APAC invoicing)",
                "Synthesized 4 key takeaways and identified 2.4% invoicing lag",
                "Analysis execution approved."
            ),
            (
                "sess-init-003",
                "emp-7492 (Sarah Lin)",
                UserRole.EMPLOYEE,
                "POLICY_CHECK",
                "task_create_ticket",
                RiskLevel.MEDIUM,
                ActionStatus.GRANTED,
                "Target: David Chen (Finance Ops) | Priority: HIGH",
                "Jira ticket TASK-FIN-8492 created with status 'TO DO'",
                "Employees authorized to file operational tasks for triage."
            ),
            (
                "sess-init-004",
                "emp-7492 (Sarah Lin)",
                UserRole.EMPLOYEE,
                "APPROVAL_GATE",
                "gmail_send_message",
                RiskLevel.HIGH,
                ActionStatus.PENDING_APPROVAL,
                "Recipient: elena.rostova@enterprise.internal | Subj: Q3 Sales Summary",
                "Halted at Human Approval Gate; awaiting supervisor clearance",
                "External email dispatch exceeds Employee autonomy; requires Manager sign-off."
            ),
            (
                "sess-init-004",
                "mgr-0182 (Elena Rostova)",
                UserRole.MANAGER,
                "APPROVAL_GATE",
                "gmail_send_message",
                RiskLevel.HIGH,
                ActionStatus.APPROVED,
                "Approved outbound email dispatch to executive leadership",
                "Supervisor signature verified; dispatched via Gmail MCP server",
                "Manager role possesses clearance to approve outbound communications."
            ),
            (
                "sess-init-005",
                "emp-3109 (Intern Kevin)",
                UserRole.EMPLOYEE,
                "POLICY_CHECK",
                "slack_post_message",
                RiskLevel.MEDIUM,
                ActionStatus.DENIED,
                "Target channel: #leadership-announcements",
                "Execution halted by Policy Engine; permission denied",
                "Role 'EMPLOYEE' cannot broadcast to #leadership-announcements without Manager elevation."
            )
        ]

        for s in sample_events:
            rec = AuditRecord.create(
                session_id=s[0],
                actor_id=s[1],
                actor_role=s[2],
                action_type=s[3],
                tool_name=s[4],
                risk_level=s[5],
                status=s[6],
                input_summary=s[7],
                output_summary=s[8],
                policy_reason=s[9],
                previous_hash=self._last_hash
            )
            self._records.append(rec)
            self._last_hash = rec.integrity_hash

    def log(
        self,
        session_id: str,
        actor_id: str,
        actor_role: UserRole,
        action_type: str,
        tool_name: str,
        risk_level: RiskLevel,
        status: ActionStatus,
        input_summary: str,
        output_summary: Optional[str] = None,
        policy_reason: Optional[str] = None
    ) -> AuditRecord:
        """Appends a new cryptographically chained audit record."""
        record = AuditRecord.create(
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
            previous_hash=self._last_hash
        )
        self._records.append(record)
        self._last_hash = record.integrity_hash

        # Prune if exceeding max
        if len(self._records) > self.max_records:
            self._records.pop(0)

        logger.info(
            f"[AUDIT] {record.status.value} | {record.action_type} | "
            f"Tool: {tool_name} | Role: {actor_role.value} | Actor: {actor_id}"
        )
        return record

    def get_records(
        self,
        role: Optional[str] = None,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        tool_name: Optional[str] = None,
        session_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50
    ) -> List[AuditRecord]:
        """Queries audit records with multi-dimensional filtering."""
        filtered = self._records[:]

        if role:
            filtered = [r for r in filtered if r.actor_role.value.upper() == role.upper()]
        if status:
            filtered = [r for r in filtered if r.status.value.upper() == status.upper()]
        if risk_level:
            filtered = [r for r in filtered if r.risk_level.value.upper() == risk_level.upper()]
        if tool_name:
            filtered = [r for r in filtered if tool_name.lower() in r.tool_name.lower()]
        if session_id:
            filtered = [r for r in filtered if r.session_id == session_id]
        if search:
            s_lower = search.lower()
            filtered = [
                r for r in filtered
                if s_lower in r.input_summary.lower()
                or s_lower in (r.output_summary or "").lower()
                or s_lower in (r.policy_reason or "").lower()
                or s_lower in r.actor_id.lower()
                or s_lower in r.tool_name.lower()
            ]

        # Return latest records first
        return list(reversed(filtered))[:limit]

    def clear(self):
        """Clears records and restarts genesis."""
        self._records = []
        self._last_hash = None
        self._seed_initial_records()

audit_logger = AuditLogger()
