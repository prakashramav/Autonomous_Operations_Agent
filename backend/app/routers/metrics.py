"""
Phase 6: Observability & Analytics API Router
Exposes real-time KPIs, time-series trends, tool/role breakdowns,
and live activity feed for the Analytics Dashboard.
"""
from typing import Optional
from fastapi import APIRouter, Query
from app.services.metrics import metrics_store

router = APIRouter(prefix="/metrics", tags=["Observability & Analytics"])


@router.get("/kpis")
async def get_kpis(hours: float = Query(24.0, ge=0.5, le=168.0, description="Time window in hours")):
    """
    Top-level KPI summary:
    - Total tool calls, success/block/approval rates
    - Average and P95 latency
    - Active sessions, unique actors
    """
    kpis = metrics_store.get_kpis(hours=hours)
    return {"status": "success", "window_hours": hours, "kpis": kpis}


@router.get("/time-series")
async def get_time_series(
    hours: float = Query(6.0, ge=0.5, le=48.0, description="Time window in hours"),
    bucket_minutes: int = Query(10, ge=1, le=60, description="Bucket size in minutes")
):
    """
    Bucketed time-series data: call volume, success, blocks, and avg latency per bucket.
    Used for area/bar chart visualization in the Analytics Dashboard.
    """
    series = metrics_store.get_time_series(hours=hours, bucket_minutes=bucket_minutes)
    return {"status": "success", "window_hours": hours, "bucket_minutes": bucket_minutes, "series": series}


@router.get("/tools")
async def get_tool_breakdown(hours: float = Query(24.0, ge=0.5, le=168.0)):
    """
    Per-tool telemetry: call count, success rate, avg latency, blocked count.
    Used for horizontal bar chart / ranked table in the dashboard.
    """
    breakdown = metrics_store.get_tool_breakdown(hours=hours)
    return {"status": "success", "window_hours": hours, "tools": breakdown}


@router.get("/roles")
async def get_role_breakdown(hours: float = Query(24.0, ge=0.5, le=168.0)):
    """
    Per-role activity summary: call counts, success/block split, success rate.
    Used for donut/pie chart visualization.
    """
    breakdown = metrics_store.get_role_breakdown(hours=hours)
    return {"status": "success", "window_hours": hours, "roles": breakdown}


@router.get("/activity")
async def get_recent_activity(limit: int = Query(15, ge=1, le=100)):
    """
    Latest N tool call records for the live activity feed ticker.
    Returns timestamp, tool, role, latency, and outcome status.
    """
    activity = metrics_store.get_recent_activity(limit=limit)
    return {"status": "success", "count": len(activity), "activity": activity}


@router.get("/summary")
async def get_full_summary():
    """
    Consolidated payload: KPIs (24h) + tool breakdown + role breakdown + recent activity.
    Single endpoint for the full analytics panel load.
    """
    return {
        "status": "success",
        "kpis": metrics_store.get_kpis(hours=24.0),
        "time_series": metrics_store.get_time_series(hours=6.0, bucket_minutes=10),
        "tools": metrics_store.get_tool_breakdown(hours=24.0),
        "roles": metrics_store.get_role_breakdown(hours=24.0),
        "activity": metrics_store.get_recent_activity(limit=10)
    }
