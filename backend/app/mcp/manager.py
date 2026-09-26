import logging
from typing import Dict, Any, List, Optional
from mcp.server.mcpserver import MCPServer
from app.mcp.servers.drive_server import drive_mcp
from app.mcp.servers.gmail_server import gmail_mcp
from app.mcp.servers.slack_server import slack_mcp
from app.mcp.servers.calendar_server import calendar_mcp
from app.mcp.servers.task_server import task_mcp

logger = logging.getLogger(__name__)

class MCPManager:
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {
            "google-drive-mcp": drive_mcp,
            "gmail-mcp": gmail_mcp,
            "slack-mcp": slack_mcp,
            "google-calendar-mcp": calendar_mcp,
            "enterprise-tasks-mcp": task_mcp,
        }
        self.server_meta: Dict[str, Dict[str, Any]] = {
            "google-drive-mcp": {
                "display_name": "Google Drive MCP Server",
                "category": "Storage & Documents",
                "icon": "FileText",
                "transport": "In-process JSON-RPC 2.0",
                "status": "online",
                "latency_ms": 2
            },
            "gmail-mcp": {
                "display_name": "Gmail Corporate MCP Server",
                "category": "Communications",
                "icon": "Mail",
                "transport": "In-process JSON-RPC 2.0",
                "status": "online",
                "latency_ms": 3
            },
            "slack-mcp": {
                "display_name": "Slack Enterprise MCP Server",
                "category": "Messaging & Alerts",
                "icon": "MessageSquare",
                "transport": "In-process JSON-RPC 2.0",
                "status": "online",
                "latency_ms": 2
            },
            "google-calendar-mcp": {
                "display_name": "Google Calendar MCP Server",
                "category": "Scheduling",
                "icon": "Calendar",
                "transport": "In-process JSON-RPC 2.0",
                "status": "online",
                "latency_ms": 4
            },
            "enterprise-tasks-mcp": {
                "display_name": "Jira / Linear Tasks MCP Server",
                "category": "Operations Tracker",
                "icon": "Workflow",
                "transport": "In-process JSON-RPC 2.0",
                "status": "online",
                "latency_ms": 2
            },
        }
        self._tool_cache: Optional[Dict[str, Any]] = None

    async def initialize(self):
        """Pre-warms and discovers all registered MCP server tools."""
        if self._tool_cache is None:
            self._tool_cache = {}
            for server_id, server in self.servers.items():
                tools = await server.list_tools()
                for t in tools:
                    # Mark sensitivity
                    is_sensitive = t.name in ["gmail_send_message", "slack_post_message"]
                    risk_level = "HIGH" if t.name == "gmail_send_message" else ("MEDIUM" if t.name == "slack_post_message" else "LOW")

                    self._tool_cache[t.name] = {
                        "name": t.name,
                        "server_id": server_id,
                        "server_name": self.server_meta[server_id]["display_name"],
                        "description": t.description or "",
                        "parameters": t.inputSchema.get("properties", {}) if hasattr(t, "inputSchema") and t.inputSchema else {},
                        "is_sensitive": is_sensitive,
                        "risk_level": risk_level
                    }

    async def list_servers(self) -> List[Dict[str, Any]]:
        """Returns health, metadata, and tool counts for all connected MCP servers."""
        await self.initialize()
        res = []
        for s_id, meta in self.server_meta.items():
            server = self.servers[s_id]
            tools = await server.list_tools()
            res.append({
                "server_id": s_id,
                "display_name": meta["display_name"],
                "category": meta["category"],
                "icon": meta["icon"],
                "transport": meta["transport"],
                "status": meta["status"],
                "latency_ms": meta["latency_ms"],
                "total_tools": len(tools),
                "tools": [t.name for t in tools]
            })
        return res

    async def list_tools(self) -> List[Dict[str, Any]]:
        """Returns the unified catalog of all discovered MCP tools."""
        await self.initialize()
        return list(self._tool_cache.values())

    def is_sensitive(self, tool_name: str) -> bool:
        """Determines if the given tool requires human supervisor clearance."""
        if not self._tool_cache:
            return tool_name in ["gmail_send_message", "send_email", "slack_post_message", "send_slack_message"]
        tool_info = self._tool_cache.get(tool_name)
        return tool_info.get("is_sensitive", False) if tool_info else False

    async def call_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Routes a tool call to the appropriate MCP Server via standard JSON-RPC."""
        await self.initialize()

        tool_meta = self._tool_cache.get(tool_name)
        if not tool_meta:
            # Fallback alias mapping (e.g. create_task -> task_create_ticket, send_email -> gmail_send_message)
            alias_map = {
                "create_task": "task_create_ticket",
                "send_email": "gmail_send_message",
                "send_slack_message": "slack_post_message",
                "search_documents": "drive_search_files",
                "schedule_calendar_event": "calendar_create_event"
            }
            mapped_name = alias_map.get(tool_name)
            if mapped_name and mapped_name in self._tool_cache:
                tool_name = mapped_name
                tool_meta = self._tool_cache.get(tool_name)

        if not tool_meta:
            return {
                "status": "error",
                "error": f"MCP tool '{tool_name}' not found on any connected server."
            }

        server_id = tool_meta["server_id"]
        server = self.servers[server_id]

        try:
            # Native MCP Server call
            result = await server.call_tool(tool_name, args)
            
            # Extract structured payload from MCP CallToolResult
            payload = {}
            if hasattr(result, "structured_content") and result.structured_content:
                if isinstance(result.structured_content, dict) and "result" in result.structured_content:
                    payload = result.structured_content["result"]
                else:
                    payload = result.structured_content
            elif hasattr(result, "content") and result.content:
                text_items = [c.text for c in result.content if hasattr(c, "text")]
                text_combined = "\n".join(text_items)
                try:
                    import json
                    payload = json.loads(text_combined)
                except Exception:
                    payload = {"text": text_combined}
            
            if isinstance(payload, dict):
                payload["mcp_server"] = server_id
                payload["mcp_tool"] = tool_name
            return payload
        except Exception as e:
            logger.exception(f"Error calling MCP tool {tool_name} on {server_id}")
            return {
                "status": "error",
                "mcp_server": server_id,
                "error": str(e)
            }

mcp_manager = MCPManager()
