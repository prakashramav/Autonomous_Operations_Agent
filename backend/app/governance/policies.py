import time
import datetime
from typing import Dict, Any, List, Optional
from app.governance.models import UserRole, RiskLevel, PolicyRule, CircuitBreakerState

ROLE_HIERARCHY = {
    UserRole.EMPLOYEE: 1,
    UserRole.MANAGER: 2,
    UserRole.ADMIN: 3
}

# Comprehensive Enterprise Policy Matrix
ENTERPRISE_POLICY_MATRIX: Dict[str, PolicyRule] = {
    # RAG & Knowledge Discovery (Low Risk - Open to all employees)
    "search_company_docs": PolicyRule(
        tool_name="search_company_docs",
        category="Knowledge & RAG",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Search enterprise semantic vector store using 3072-dim embeddings"
    ),
    "search_documents": PolicyRule(
        tool_name="search_documents",
        category="Knowledge & RAG",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Retrieve Google Drive, Notion, and corporate policies"
    ),
    "summarize_data": PolicyRule(
        tool_name="summarize_data",
        category="Analysis",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Synthesize document takeaways and financial anomalies"
    ),
    # Google Drive MCP Server
    "drive_search_files": PolicyRule(
        tool_name="drive_search_files",
        category="Google Drive MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Search enterprise Drive files, spreadsheets, and slides"
    ),
    "drive_read_file": PolicyRule(
        tool_name="drive_read_file",
        category="Google Drive MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Read structured text content of a corporate document"
    ),
    "drive_create_doc": PolicyRule(
        tool_name="drive_create_doc",
        category="Google Drive MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Create internal working draft documents"
    ),
    # Gmail MCP Server
    "gmail_list_messages": PolicyRule(
        tool_name="gmail_list_messages",
        category="Gmail MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="List email threads and inbox messages"
    ),
    "gmail_create_draft": PolicyRule(
        tool_name="gmail_create_draft",
        category="Gmail MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Prepare draft emails without dispatching"
    ),
    "gmail_send_message": PolicyRule(
        tool_name="gmail_send_message",
        category="Gmail MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.HIGH,
        requires_approval=True,
        description="Dispatch outbound emails to executives or partners (Strict Supervisor Gate)"
    ),
    "send_email": PolicyRule(
        tool_name="send_email",
        category="Gmail MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.HIGH,
        requires_approval=True,
        description="Dispatch formal operational email (Strict Supervisor Gate)"
    ),
    # Slack MCP Server
    "slack_list_channels": PolicyRule(
        tool_name="slack_list_channels",
        category="Slack MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Enumerate public communication channels"
    ),
    "slack_read_channel": PolicyRule(
        tool_name="slack_read_channel",
        category="Slack MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Read recent channel messages and context"
    ),
    "slack_post_message": PolicyRule(
        tool_name="slack_post_message",
        category="Slack MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Broadcast message to departmental Slack channel"
    ),
    "send_slack_message": PolicyRule(
        tool_name="send_slack_message",
        category="Slack MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Send message to team Slack channels"
    ),
    # Google Calendar MCP Server
    "calendar_list_events": PolicyRule(
        tool_name="calendar_list_events",
        category="Google Calendar MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Inspect calendar agendas and scheduled meetings"
    ),
    "calendar_check_conflicts": PolicyRule(
        tool_name="calendar_check_conflicts",
        category="Google Calendar MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="Verify attendee schedule availability"
    ),
    "calendar_create_event": PolicyRule(
        tool_name="calendar_create_event",
        category="Google Calendar MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Book executive reviews and reserve calendar blocks"
    ),
    "schedule_calendar_event": PolicyRule(
        tool_name="schedule_calendar_event",
        category="Google Calendar MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Schedule meeting with team members"
    ),
    # Jira/Linear Tasks MCP Server
    "task_get_ticket": PolicyRule(
        tool_name="task_get_ticket",
        category="Enterprise Tasks MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.LOW,
        requires_approval=False,
        description="View status, description, and assignees of tickets"
    ),
    "task_create_ticket": PolicyRule(
        tool_name="task_create_ticket",
        category="Enterprise Tasks MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="File new operational task in Jira/Linear"
    ),
    "create_task": PolicyRule(
        tool_name="create_task",
        category="Enterprise Tasks MCP",
        min_role=UserRole.EMPLOYEE,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Create operational task ticket for finance/engineering"
    ),
    "task_update_status": PolicyRule(
        tool_name="task_update_status",
        category="Enterprise Tasks MCP",
        min_role=UserRole.MANAGER,
        risk_level=RiskLevel.MEDIUM,
        requires_approval=False,
        description="Change workflow status or close tickets"
    )
}

class PolicyEngine:
    def __init__(self):
        self.circuit_breaker = CircuitBreakerState(is_active=False)

    def is_role_authorized(self, user_role: UserRole, required_role: UserRole) -> bool:
        """Determines if the user's role satisfies the minimum required role hierarchy."""
        user_rank = ROLE_HIERARCHY.get(user_role, 0)
        required_rank = ROLE_HIERARCHY.get(required_role, 99)
        return user_rank >= required_rank

    def get_rule_for_tool(self, tool_name: str) -> PolicyRule:
        """Looks up policy rule or returns a safe default rule for unknown tools."""
        if tool_name in ENTERPRISE_POLICY_MATRIX:
            return ENTERPRISE_POLICY_MATRIX[tool_name]
        
        # Safe default for unregistered tools
        return PolicyRule(
            tool_name=tool_name,
            category="Custom Extension",
            min_role=UserRole.ADMIN,
            risk_level=RiskLevel.HIGH,
            requires_approval=True,
            description="Unregistered extension tool; requires administrative clearance"
        )

    def set_circuit_breaker(self, active: bool, actor_id: str, reason: str) -> CircuitBreakerState:
        now = time.time()
        iso = datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc).isoformat()
        self.circuit_breaker = CircuitBreakerState(
            is_active=active,
            triggered_by=actor_id,
            reason=reason if active else "Emergency freeze revoked. Autonomous operations resumed.",
            timestamp=now,
            iso_time=iso
        )
        return self.circuit_breaker

    def get_circuit_breaker_status(self) -> CircuitBreakerState:
        return self.circuit_breaker

    def list_policies(self) -> List[Dict[str, Any]]:
        return [rule.dict() for rule in ENTERPRISE_POLICY_MATRIX.values()]

policy_engine = PolicyEngine()
