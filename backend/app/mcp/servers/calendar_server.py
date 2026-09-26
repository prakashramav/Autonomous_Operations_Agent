import uuid
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer

calendar_mcp = MCPServer("google-calendar-mcp")

EVENTS = [
    {
        "event_id": "EVT-CAL-100",
        "title": "Quarterly Operations Review",
        "start": "2026-09-28T14:00:00Z",
        "duration_minutes": 60,
        "organizer": "elena.rostova@enterprise.internal",
        "attendees": ["elena.rostova@enterprise.internal", "david.chen@enterprise.internal"]
    },
    {
        "event_id": "EVT-CAL-101",
        "title": "Finance Close & Reconciliation Standup",
        "start": "2026-09-29T10:00:00Z",
        "duration_minutes": 30,
        "organizer": "david.chen@enterprise.internal",
        "attendees": ["david.chen@enterprise.internal"]
    }
]

@calendar_mcp.tool(description="Lists scheduled Google Calendar meetings and review sessions.")
async def calendar_list_events(time_min: Optional[str] = None, time_max: Optional[str] = None) -> Dict[str, Any]:
    return {
        "mcp_server": "google-calendar-mcp",
        "status": "success",
        "total_events": len(EVENTS),
        "events": EVENTS
    }

@calendar_mcp.tool(description="Schedules a new meeting or review session in Google Calendar with Google Meet link.")
async def calendar_create_event(
    title: str,
    start_time: str,
    duration_minutes: int,
    attendees: List[str],
    description: Optional[str] = None
) -> Dict[str, Any]:
    evt_id = f"EVT-CAL-{uuid.uuid4().hex[:6].upper()}"
    meet_code = f"ent-{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:3]}"
    return {
        "mcp_server": "google-calendar-mcp",
        "status": "scheduled",
        "event_id": evt_id,
        "title": title,
        "start_time": start_time,
        "duration_minutes": duration_minutes,
        "attendees": attendees,
        "meet_link": f"https://meet.google.com/{meet_code}",
        "message": f"Calendar invitation created: '{title}' with {len(attendees)} participants."
    }

@calendar_mcp.tool(description="Checks participant calendar schedules for scheduling conflicts.")
async def calendar_check_conflicts(attendees: List[str], target_time: str) -> Dict[str, Any]:
    return {
        "mcp_server": "google-calendar-mcp",
        "status": "available",
        "target_time": target_time,
        "conflicts_found": 0,
        "attendees_available": attendees,
        "recommendation": f"Slot {target_time} is open for all {len(attendees)} participants."
    }
