import uuid
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer

drive_mcp = MCPServer("google-drive-mcp")

DRIVE_STORAGE = {
    "FILE-SLS-001": {
        "file_id": "FILE-SLS-001",
        "name": "Q3_2026_Global_Sales_Report.pdf",
        "mime_type": "application/pdf",
        "folder": "Executive / Quarterly Reports",
        "size_kb": 1420,
        "content": (
            "Q3 2026 Enterprise Sales Report: Total ARR reached $48.2M (+18% YoY). "
            "Key drivers: North America (+24%), EMEA Cloud (+14%). "
            "Alert: 2.4% APAC invoicing lag due to payment gateway transition, reconciliation needed by Oct 5."
        )
    },
    "FILE-FIN-002": {
        "file_id": "FILE-FIN-002",
        "name": "Corporate_Budget_Policy_2026.docx",
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "folder": "Finance / Policies",
        "size_kb": 320,
        "content": (
            "All discretionary expenses above $5,000 require secondary approval from Finance Operations. "
            "Q4 budget lock date is October 15, 2026."
        )
    },
    "FILE-SEC-003": {
        "file_id": "FILE-SEC-003",
        "name": "SOC2_Compliance_Audit_Protocol.pdf",
        "mime_type": "application/pdf",
        "folder": "Security / Audit",
        "size_kb": 890,
        "content": (
            "SOC 2 Type II controls require human clearance on all external communication actions. "
            "Audit records are preserved for 7 years."
        )
    }
}

@drive_mcp.tool(description="Searches Google Drive repository for files, reports, and spreadsheets matching query.")
async def drive_search_files(query: str, mime_type: Optional[str] = None) -> Dict[str, Any]:
    q = query.lower()
    matches = []
    for f in DRIVE_STORAGE.values():
        if (
            q in f["name"].lower() or
            q in f["content"].lower() or
            any(w in f["name"].lower() for w in q.split()) or
            "report" in q or "sale" in q or "financ" in q
        ):
            if not mime_type or mime_type in f["mime_type"]:
                matches.append({
                    "file_id": f["file_id"],
                    "name": f["name"],
                    "folder": f["folder"],
                    "size_kb": f["size_kb"],
                    "mime_type": f["mime_type"]
                })
    return {
        "mcp_server": "google-drive-mcp",
        "status": "success",
        "query": query,
        "total_found": len(matches),
        "files": matches or list(DRIVE_STORAGE.values())[:2]
    }

@drive_mcp.tool(description="Retrieves full text contents and metadata of a designated Google Drive file.")
async def drive_read_file(file_id: str) -> Dict[str, Any]:
    file_record = DRIVE_STORAGE.get(file_id)
    if not file_record:
        file_record = DRIVE_STORAGE["FILE-SLS-001"]
    return {
        "mcp_server": "google-drive-mcp",
        "status": "success",
        "file_id": file_record["file_id"],
        "name": file_record["name"],
        "folder": file_record["folder"],
        "content": file_record["content"]
    }

@drive_mcp.tool(description="Creates a new document or spreadsheet in Google Drive.")
async def drive_create_doc(title: str, content: str, folder: Optional[str] = "Operations") -> Dict[str, Any]:
    new_id = f"FILE-DOC-{uuid.uuid4().hex[:6].upper()}"
    return {
        "mcp_server": "google-drive-mcp",
        "status": "created",
        "file_id": new_id,
        "title": title,
        "folder": folder,
        "url": f"https://drive.google.com/open?id={new_id}",
        "message": f"Successfully created document '{title}' in Google Drive folder '{folder}'"
    }
