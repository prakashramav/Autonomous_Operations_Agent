import json
from typing import Dict, Any, List, Optional

ENTERPRISE_KNOWLEDGE_BASE = {
    "sales_report": {
        "title": "Q3 2026 Global Enterprise Sales & Revenue Report",
        "doc_id": "DOC-SLS-2026-Q3",
        "last_updated": "2026-09-15",
        "author": "Sarah Jenkins (VP of Revenue)",
        "content": (
            "Executive Summary: Q3 Total ARR reached $48.2M (+18% YoY vs $40.8M in Q3 2025). "
            "Key drivers: North America Enterprise expansion (+24%) and EMEA Cloud Migration (+14%). "
            "Important Changes & Alerts: \n"
            "1. Finance Department Advisory: Payment gateway transition caused a 2.4% invoicing lag in APAC, "
            "requiring a reconciliation review by the Finance team before the Oct 5 quarterly close.\n"
            "2. Churn decreased from 3.1% to 1.9% following automated onboarding rollouts.\n"
            "3. Top deal closed: $1.8M 3-year agreement with Apex Global Holdings.\n"
            "4. Gross Margin improved to 76.4% (up 180 bps from Q2).\n"
            "Action Required: Finance team needs to reconcile APAC payment receivables and prepare adjusted forecasts."
        )
    },
    "finance_policy": {
        "title": "Corporate Budget Allocation & Expense Policy 2026",
        "doc_id": "DOC-FIN-2026-POL",
        "last_updated": "2026-08-01",
        "author": "Marcus Vance (Chief Financial Officer)",
        "content": (
            "All discretionary team travel and software subscriptions above $5,000 must receive secondary approval "
            "from the Finance Operations desk. Q4 budget lock date is October 15, 2026."
        )
    },
    "ops_directory": {
        "title": "Operations & Leadership Directory",
        "doc_id": "DOC-HR-OPS-DIR",
        "last_updated": "2026-09-01",
        "author": "People Ops",
        "content": (
            "- Finance Operations Lead: David Chen (david.chen@enterprise.internal)\n"
            "- General Manager / VP Operations: Elena Rostova (elena.rostova@enterprise.internal)\n"
            "- Head of Sales: Sarah Jenkins (sarah.j@enterprise.internal)\n"
            "- Slack Channels: #finance-ops, #leadership-announcements, #general, #ops-incidents"
        )
    }
}

from app.rag.vector_store import vector_store

TOOL_REGISTRY = {
    "search_company_docs": {
        "name": "search_company_docs",
        "description": "Executes semantic RAG vector similarity search over enterprise Google Drive, Notion, policies, and documentation using 3072-dimensional embeddings.",
        "parameters": {
            "query": "string: natural language search topic or question",
            "department": "optional string: 'Sales', 'Finance', 'Operations', 'Engineering', 'Security'",
            "top_k": "optional integer: number of document matches to return"
        },
        "is_sensitive": False,
        "risk_level": "LOW"
    },
    "search_documents": {
        "name": "search_documents",
        "description": "Search corporate Google Drive, Notion, and internal documentation for reports, memos, and policies.",
        "parameters": {
            "query": "string: keywords or topic to search for (e.g. 'latest sales report', 'finance reconciliation')",
            "doc_type": "optional string: 'sales', 'finance', 'policy', 'all'"
        },
        "is_sensitive": False,
        "risk_level": "LOW"
    },
    "summarize_data": {
        "name": "summarize_data",
        "description": "Synthesizes documents or raw data into structured executive highlights and actionable change logs.",
        "parameters": {
            "text": "string: text to analyze and summarize",
            "focus_areas": "optional list of strings: specific topics to highlight (e.g. ['changes', 'finance', 'risks'])"
        },
        "is_sensitive": False,
        "risk_level": "LOW"
    },
    "create_task": {
        "name": "create_task",
        "description": "Creates an operational task or ticket in Jira/Linear for a specified team or assignee.",
        "parameters": {
            "title": "string: clear concise task title",
            "department": "string: e.g. 'Finance', 'Engineering', 'Operations'",
            "assignee": "string: assignee name or email",
            "priority": "string: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'",
            "details": "string: detailed instructions and acceptance criteria"
        },
        "is_sensitive": False,
        "risk_level": "MEDIUM"
    },
    "send_slack_message": {
        "name": "send_slack_message",
        "description": "Publishes a notification or operational update to a designated Slack channel or direct message. REQUIRES HUMAN APPROVAL when messaging managers.",
        "parameters": {
            "channel": "string: channel name or recipient (e.g. '#finance-ops', '@manager')",
            "message": "string: message content with formatting"
        },
        "is_sensitive": True,
        "risk_level": "MEDIUM"
    },
    "send_email": {
        "name": "send_email",
        "description": "Dispatches an email via corporate Gmail to internal managers or external partners. REQUIRES HUMAN APPROVAL.",
        "parameters": {
            "recipient": "string: email address of the recipient",
            "subject": "string: email subject line",
            "body": "string: full email body text"
        },
        "is_sensitive": True,
        "risk_level": "HIGH"
    },
    "schedule_calendar_event": {
        "name": "schedule_calendar_event",
        "description": "Schedules a Google Calendar meeting or review session with enterprise participants.",
        "parameters": {
            "title": "string: meeting title",
            "attendees": "list of strings: email addresses",
            "start_time": "string: date/time ISO string or relative time",
            "duration_minutes": "integer: meeting duration in minutes"
        },
        "is_sensitive": False,
        "risk_level": "LOW"
    }
}

from app.mcp.manager import mcp_manager

async def execute_tool(
    tool_name: str,
    args: Dict[str, Any],
    user_role: str = "EMPLOYEE",
    actor_id: str = "emp-operational-01",
    session_id: str = "agent-run"
) -> Dict[str, Any]:
    """
    Executes enterprise tool integrations, routing through Model Context Protocol (MCP) servers
    and real semantic vector RAG search with security governance.
    """
    from app.governance.guardrails import validate_execution_guardrails
    from app.governance.audit import audit_logger
    from app.governance.models import ActionStatus, RiskLevel

    # Pre-execution guardrails validation
    guardrail = validate_execution_guardrails(
        tool_name=tool_name,
        user_role_str=user_role,
        actor_id=actor_id,
        session_id=session_id,
        tool_args=args
    )

    if not guardrail.allowed:
        return {
            "status": "denied",
            "policy_violation": True,
            "error": guardrail.reason,
            "guardrails": guardrail.to_dict()
        }

    if tool_name in ["search_company_docs", "search_documents"]:
        query = args.get("query", "")
        department = args.get("department")
        try:
            top_k = int(args.get("top_k", 3))
        except (ValueError, TypeError):
            top_k = 3

        results = await vector_store.search(query=query, top_k=top_k, department=department)
        
        res = {
            "status": "success",
            "mcp_server": "google-drive-mcp",
            "rag_engine": "pgvector / 3072-dim embeddings",
            "query": query,
            "matches_found": len(results),
            "documents": [
                {
                    "title": r.title,
                    "doc_id": r.doc_id,
                    "department": r.department,
                    "similarity_score": round(r.similarity_score, 4),
                    "summary_content": r.content,
                    "metadata": r.metadata
                }
                for r in results
            ]
        }

        audit_logger.log(
            session_id=session_id,
            actor_id=actor_id,
            actor_role=guardrail.user_role,
            action_type="TOOL_EXECUTION",
            tool_name=tool_name,
            risk_level=RiskLevel.LOW,
            status=ActionStatus.EXECUTED,
            input_summary=f"Query: '{query}' (top_k={top_k})",
            output_summary=f"Returned {len(results)} matches from vector store",
            policy_reason="Authorized document query"
        )
        return res

    elif tool_name == "summarize_data":
        text = args.get("text", "")
        focus = args.get("focus_areas", ["important changes", "revenue", "action items"])
        summary = (
            "### Executive Summary of Q3 Sales Report\n"
            "- **Total ARR**: $48.2M (+18% YoY growth), driven by NA Enterprise (+24%).\n"
            "- **Gross Margin**: Expanded to 76.4% (+180 bps).\n"
            "- **Critical Operational Alert**: Invoicing lag of 2.4% identified in APAC region due to payment gateway migration.\n"
            "- **Immediate Action**: Finance reconciliation required prior to October 5 close."
        )
        res = {"status": "success", "mcp_server": "enterprise-tasks-mcp", "summary": summary, "focus_applied": focus}
        
        audit_logger.log(
            session_id=session_id,
            actor_id=actor_id,
            actor_role=guardrail.user_role,
            action_type="TOOL_EXECUTION",
            tool_name=tool_name,
            risk_level=RiskLevel.LOW,
            status=ActionStatus.EXECUTED,
            input_summary="Summarize Q3 financial data",
            output_summary="Synthesized ARR, gross margin, and APAC reconciliation alert",
            policy_reason="Authorized analysis"
        )
        return res

    elif tool_name in ["create_task", "task_create_ticket"]:
        params = {
            "title": args.get("title", "Review and Reconcile APAC Payment Invoicing"),
            "department": args.get("department", "Finance"),
            "assignee": args.get("assignee", "David Chen (Finance Ops)"),
            "priority": args.get("priority", "HIGH"),
            "details": args.get("details", "Investigate 2.4% payment gateway transition delay prior to Oct 5 quarterly close.")
        }
        return await mcp_manager.call_tool("task_create_ticket", params, user_role, actor_id, session_id)

    elif tool_name in ["send_email", "gmail_send_message"]:
        params = {
            "recipient": args.get("recipient", "elena.rostova@enterprise.internal"),
            "subject": args.get("subject", "Executive Summary: Q3 Sales Report & Finance Action Items"),
            "body": args.get("body", "Executive summary report dispatched per directive.")
        }
        return await mcp_manager.call_tool("gmail_send_message", params, user_role, actor_id, session_id)

    elif tool_name in ["send_slack_message", "slack_post_message"]:
        params = {
            "channel": args.get("channel", "#finance-ops"),
            "message": args.get("message", "Operational update posted.")
        }
        return await mcp_manager.call_tool("slack_post_message", params, user_role, actor_id, session_id)

    elif tool_name in ["schedule_calendar_event", "calendar_create_event"]:
        params = {
            "title": args.get("title", "Q3 Operational Debrief"),
            "start_time": args.get("start_time", "2026-09-28T14:00:00Z"),
            "duration_minutes": int(args.get("duration_minutes", 45)),
            "attendees": args.get("attendees", ["elena.rostova@enterprise.internal", "david.chen@enterprise.internal"])
        }
        return await mcp_manager.call_tool("calendar_create_event", params, user_role, actor_id, session_id)

    else:
        # Generic MCP tool execution
        return await mcp_manager.call_tool(tool_name, args, user_role, actor_id, session_id)

