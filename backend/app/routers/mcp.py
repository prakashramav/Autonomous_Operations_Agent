from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.mcp.manager import mcp_manager

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

class MCPCallRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)

@router.get("/servers")
async def list_mcp_servers():
    """Returns all connected enterprise Model Context Protocol (MCP) servers and their health."""
    servers = await mcp_manager.list_servers()
    return {
        "status": "success",
        "total_servers": len(servers),
        "protocol": "Model Context Protocol (MCP) 2.0 (JSON-RPC)",
        "servers": servers
    }

@router.get("/tools")
async def list_mcp_tools():
    """Lists all dynamically discovered tools across all connected MCP servers."""
    tools = await mcp_manager.list_tools()
    return {
        "status": "success",
        "total_tools": len(tools),
        "tools": tools
    }

@router.post("/call")
async def call_mcp_tool_endpoint(request: MCPCallRequest):
    """Executes a designated tool via its parent MCP Server over JSON-RPC."""
    result = await mcp_manager.call_tool(request.tool, request.arguments)
    return {
        "status": "success",
        "tool": request.tool,
        "result": result
    }
