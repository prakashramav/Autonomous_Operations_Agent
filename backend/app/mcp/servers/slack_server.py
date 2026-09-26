from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer

slack_mcp = MCPServer("slack-mcp")

CHANNELS = [
    {"name": "#finance-ops", "id": "C01FINOPS", "topic": "Financial operations, invoices, and reconciliation alerts"},
    {"name": "#leadership-announcements", "id": "C02LEADER", "topic": "Executive updates and operational milestones"},
    {"name": "#general", "id": "C03GEN", "topic": "Company-wide announcements"},
    {"name": "#ops-incidents", "id": "C04INC", "topic": "Operational alerts and incident triaging"}
]

@slack_mcp.tool(description="Publishes a message to a designated Slack channel or user direct message. SENSITIVE when posting to public channels.")
async def slack_post_message(
    channel: str,
    message: str,
    thread_ts: Optional[str] = None
) -> Dict[str, Any]:
    norm_channel = channel if channel.startswith("#") or channel.startswith("@") else f"#{channel}"
    ts = f"{datetime.now(timezone.utc).timestamp():.6f}"
    return {
        "mcp_server": "slack-mcp",
        "status": "delivered",
        "channel": norm_channel,
        "ts": ts,
        "thread_ts": thread_ts,
        "delivery_status": "ok",
        "receipt": f"Message published to {norm_channel} at timestamp {ts}"
    }

@slack_mcp.tool(description="Lists accessible enterprise Slack channels and their primary topics.")
async def slack_list_channels() -> Dict[str, Any]:
    return {
        "mcp_server": "slack-mcp",
        "status": "success",
        "total_channels": len(CHANNELS),
        "channels": CHANNELS
    }

@slack_mcp.tool(description="Reads recent operational messages posted to a Slack channel.")
async def slack_read_channel(channel: str, limit: int = 5) -> Dict[str, Any]:
    norm_channel = channel if channel.startswith("#") else f"#{channel}"
    return {
        "mcp_server": "slack-mcp",
        "status": "success",
        "channel": norm_channel,
        "messages": [
            {
                "user": "David Chen",
                "text": "Waiting on APAC invoicing numbers to finalize reconciliation spreadsheet.",
                "ts": "1727339000.100"
            },
            {
                "user": "Sarah Jenkins",
                "text": "Apex deal confirmed! Revenue recognized for Q3.",
                "ts": "1727338500.050"
            }
        ][:limit]
    }
