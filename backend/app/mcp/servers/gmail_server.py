import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer

gmail_mcp = MCPServer("gmail-mcp")

GMAIL_INBOX = [
    {
        "id": "MSG-9021",
        "sender": "sarah.j@enterprise.internal",
        "subject": "Q3 Revenue Numbers Ready for Operations Review",
        "snippet": "Elena, the final numbers are compiled. North America exceeded target by 24%...",
        "date": "2026-09-26T08:30:00Z"
    },
    {
        "id": "MSG-8841",
        "sender": "david.chen@enterprise.internal",
        "subject": "APAC Payment Gateway Transition Alert",
        "snippet": "We noticed reconciliation delays of 2.4% following the gateway migration...",
        "date": "2026-09-25T14:15:00Z"
    }
]

@gmail_mcp.tool(description="Lists messages in the enterprise Gmail mailbox matching a search query.")
async def gmail_list_messages(query: str = "is:inbox", max_results: int = 5) -> Dict[str, Any]:
    return {
        "mcp_server": "gmail-mcp",
        "status": "success",
        "query": query,
        "total_results": len(GMAIL_INBOX),
        "messages": GMAIL_INBOX[:max_results]
    }

@gmail_mcp.tool(description="Dispatches a formal email to an enterprise recipient via Gmail. REQUIRES SUPERVISOR CLEARANCE.")
async def gmail_send_message(
    recipient: str,
    subject: str,
    body: str,
    cc: Optional[str] = None
) -> Dict[str, Any]:
    msg_id = f"<MSG-GMAIL-{uuid.uuid4().hex[:8].upper()}@enterprise.internal>"
    return {
        "mcp_server": "gmail-mcp",
        "status": "dispatched",
        "message_id": msg_id,
        "recipient": recipient,
        "cc": cc,
        "subject": subject,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "confirmation": f"Email successfully dispatched to {recipient} with subject '{subject}'"
    }

@gmail_mcp.tool(description="Prepares a draft email in the user's Gmail mailbox without sending.")
async def gmail_create_draft(recipient: str, subject: str, body: str) -> Dict[str, Any]:
    draft_id = f"DRAFT-{uuid.uuid4().hex[:6].upper()}"
    return {
        "mcp_server": "gmail-mcp",
        "status": "draft_created",
        "draft_id": draft_id,
        "recipient": recipient,
        "subject": subject,
        "preview": body[:120] + "...",
        "message": f"Draft saved in Gmail for {recipient}"
    }
