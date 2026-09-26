import uuid
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer

task_mcp = MCPServer("enterprise-tasks-mcp")

TICKETS = {
    "TASK-FIN-8492": {
        "ticket_id": "TASK-FIN-8492",
        "title": "Reconcile APAC Q3 Invoicing Lag & Adjust Revenue Forecasts",
        "department": "Finance",
        "assignee": "David Chen (Finance Ops)",
        "priority": "HIGH",
        "status": "OPEN",
        "details": "Investigate 2.4% payment gateway transition delay prior to Oct 5 quarterly close."
    }
}

@task_mcp.tool(description="Creates a new operational ticket in enterprise Jira/Linear for task tracking.")
async def task_create_ticket(
    title: str,
    department: str,
    assignee: str,
    priority: str,
    details: str
) -> Dict[str, Any]:
    dept_code = department[:3].upper() if department else "OPS"
    ticket_id = f"TASK-{dept_code}-{uuid.uuid4().hex[:4].upper()}"
    ticket = {
        "ticket_id": ticket_id,
        "title": title,
        "department": department,
        "assignee": assignee,
        "priority": priority.upper(),
        "status": "OPEN",
        "details": details
    }
    TICKETS[ticket_id] = ticket
    return {
        "mcp_server": "enterprise-tasks-mcp",
        "status": "created",
        "ticket_id": ticket_id,
        "title": title,
        "department": department,
        "assignee": assignee,
        "priority": priority,
        "url": f"https://jira.enterprise.internal/browse/{ticket_id}",
        "message": f"Successfully created Jira ticket {ticket_id} assigned to {assignee}."
    }

@task_mcp.tool(description="Fetches current status, assignee, and history for an enterprise Jira ticket.")
async def task_get_ticket(ticket_id: str) -> Dict[str, Any]:
    ticket = TICKETS.get(ticket_id, TICKETS["TASK-FIN-8492"])
    return {
        "mcp_server": "enterprise-tasks-mcp",
        "status": "success",
        "ticket": ticket
    }

@task_mcp.tool(description="Updates the lifecycle status of an enterprise task (e.g. IN_PROGRESS, RESOLVED, CLOSED).")
async def task_update_status(ticket_id: str, new_status: str) -> Dict[str, Any]:
    ticket = TICKETS.get(ticket_id)
    if ticket:
        ticket["status"] = new_status.upper()
    return {
        "mcp_server": "enterprise-tasks-mcp",
        "status": "updated",
        "ticket_id": ticket_id,
        "new_status": new_status.upper(),
        "message": f"Ticket {ticket_id} transitioned to status {new_status.upper()}."
    }
