"""
Phase 6: Real-Time Observability & Telemetry Engine
In-memory metrics store with time-series buckets, performance tracking,
and aggregated KPI computation for the Analytics Dashboard.
"""
import time
import threading
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ToolCallRecord:
    """Single tool call telemetry record."""
    timestamp: float
    tool_name: str
    user_role: str
    actor_id: str
    session_id: str
    latency_ms: float
    success: bool
    was_blocked: bool
    was_approval_required: bool
    error_type: Optional[str] = None


@dataclass
class AgentRunRecord:
    """Tracks a complete agent reasoning run (multi-step)."""
    session_id: str
    start_time: float
    end_time: Optional[float] = None
    total_steps: int = 0
    tools_invoked: int = 0
    was_successful: bool = False
    user_role: str = "EMPLOYEE"


class MetricsStore:
    """
    Thread-safe in-memory time-series metrics store.
    Stores rolling 24h of telemetry with bucketed aggregation.
    """
    _MAX_RECORDS = 2000
    _BUCKET_SECONDS = 60  # 1-minute buckets for trend data

    def __init__(self):
        self._lock = threading.Lock()
        self._tool_calls: deque = deque(maxlen=self._MAX_RECORDS)
        self._agent_runs: Dict[str, AgentRunRecord] = {}
        self._completed_runs: deque = deque(maxlen=500)
        # Seed with realistic demo data
        self._seed_demo_data()

    def _seed_demo_data(self):
        """Seed with realistic historical telemetry for demo visualization."""
        now = time.time()
        tools = [
            "search_documents", "query_database", "send_slack_message",
            "schedule_meeting", "search_drive", "summarize_document",
            "create_jira_ticket", "send_email_draft"
        ]
        roles = ["EMPLOYEE", "EMPLOYEE", "MANAGER", "EMPLOYEE", "ADMIN", "MANAGER"]
        actor_ids = ["emp-7492", "emp-7492", "mgr-0182", "emp-3301", "adm-sec-01", "mgr-0182"]

        import random
        random.seed(42)
        # Seed 48 hours of data, ~200 calls
        for i in range(200):
            offset = random.uniform(0, 48 * 3600)
            ts = now - offset
            role_idx = random.randint(0, len(roles) - 1)
            tool = random.choice(tools)
            blocked = random.random() < 0.08
            approval = (not blocked) and random.random() < 0.12
            success = (not blocked) and random.random() > 0.05
            latency = random.uniform(80, 800) if success else random.uniform(200, 1200)
            record = ToolCallRecord(
                timestamp=ts,
                tool_name=tool,
                user_role=roles[role_idx],
                actor_id=actor_ids[role_idx],
                session_id=f"seed-{i}",
                latency_ms=round(latency, 1),
                success=success,
                was_blocked=blocked,
                was_approval_required=approval,
                error_type=None if success else random.choice(["TIMEOUT", "PERMISSION_DENIED", "NETWORK_ERROR"])
            )
            self._tool_calls.append(record)

    # ─── Write Methods ────────────────────────────────────────────────────────

    def record_tool_call(
        self,
        tool_name: str,
        user_role: str,
        actor_id: str,
        session_id: str,
        latency_ms: float,
        success: bool,
        was_blocked: bool = False,
        was_approval_required: bool = False,
        error_type: Optional[str] = None
    ):
        with self._lock:
            self._tool_calls.append(ToolCallRecord(
                timestamp=time.time(),
                tool_name=tool_name,
                user_role=user_role,
                actor_id=actor_id,
                session_id=session_id,
                latency_ms=round(latency_ms, 1),
                success=success,
                was_blocked=was_blocked,
                was_approval_required=was_approval_required,
                error_type=error_type
            ))

    def start_agent_run(self, session_id: str, user_role: str = "EMPLOYEE"):
        with self._lock:
            self._agent_runs[session_id] = AgentRunRecord(
                session_id=session_id,
                start_time=time.time(),
                user_role=user_role
            )

    def complete_agent_run(self, session_id: str, total_steps: int, tools_invoked: int, success: bool):
        with self._lock:
            run = self._agent_runs.pop(session_id, None)
            if run:
                run.end_time = time.time()
                run.total_steps = total_steps
                run.tools_invoked = tools_invoked
                run.was_successful = success
                self._completed_runs.append(run)

    # ─── Read / Aggregation Methods ───────────────────────────────────────────

    def _get_records_window(self, hours: float = 24.0) -> List[ToolCallRecord]:
        """Returns records within the given time window (thread-safe snapshot)."""
        cutoff = time.time() - (hours * 3600)
        with self._lock:
            return [r for r in self._tool_calls if r.timestamp >= cutoff]

    def get_kpis(self, hours: float = 24.0) -> Dict[str, Any]:
        """Aggregate top-level KPIs for the dashboard summary cards."""
        records = self._get_records_window(hours)
        if not records:
            return {
                "total_calls": 0, "success_rate": 0.0, "block_rate": 0.0,
                "approval_rate": 0.0, "avg_latency_ms": 0.0, "p95_latency_ms": 0.0,
                "active_sessions": 0, "unique_actors": 0
            }

        total = len(records)
        successful = sum(1 for r in records if r.success)
        blocked = sum(1 for r in records if r.was_blocked)
        approval_pending = sum(1 for r in records if r.was_approval_required)
        latencies = sorted([r.latency_ms for r in records])
        avg_lat = sum(latencies) / len(latencies)
        p95_idx = int(0.95 * len(latencies))
        p95_lat = latencies[min(p95_idx, len(latencies) - 1)]

        with self._lock:
            active = len(self._agent_runs)
            unique_actors = len(set(r.actor_id for r in records))

        return {
            "total_calls": total,
            "success_rate": round(successful / total * 100, 1),
            "block_rate": round(blocked / total * 100, 1),
            "approval_rate": round(approval_pending / total * 100, 1),
            "avg_latency_ms": round(avg_lat, 1),
            "p95_latency_ms": round(p95_lat, 1),
            "active_sessions": active,
            "unique_actors": unique_actors
        }

    def get_tool_breakdown(self, hours: float = 24.0) -> List[Dict[str, Any]]:
        """Per-tool call frequency, success rate, and avg latency."""
        records = self._get_records_window(hours)
        by_tool: Dict[str, List[ToolCallRecord]] = defaultdict(list)
        for r in records:
            by_tool[r.tool_name].append(r)

        result = []
        for tool_name, calls in sorted(by_tool.items(), key=lambda x: -len(x[1])):
            total = len(calls)
            success = sum(1 for c in calls if c.success)
            avg_lat = sum(c.latency_ms for c in calls) / total if total else 0
            result.append({
                "tool_name": tool_name,
                "total_calls": total,
                "success_rate": round(success / total * 100, 1) if total else 0,
                "avg_latency_ms": round(avg_lat, 1),
                "blocked_count": sum(1 for c in calls if c.was_blocked)
            })
        return result

    def get_role_breakdown(self, hours: float = 24.0) -> List[Dict[str, Any]]:
        """Per-role activity breakdown."""
        records = self._get_records_window(hours)
        by_role: Dict[str, List[ToolCallRecord]] = defaultdict(list)
        for r in records:
            by_role[r.user_role].append(r)

        result = []
        for role, calls in by_role.items():
            total = len(calls)
            success = sum(1 for c in calls if c.success)
            blocked = sum(1 for c in calls if c.was_blocked)
            result.append({
                "role": role,
                "total_calls": total,
                "success_count": success,
                "blocked_count": blocked,
                "success_rate": round(success / total * 100, 1) if total else 0
            })
        return sorted(result, key=lambda x: -x["total_calls"])

    def get_time_series(self, hours: float = 6.0, bucket_minutes: int = 10) -> List[Dict[str, Any]]:
        """Bucketed time-series: calls per minute bucket, with success/block split."""
        records = self._get_records_window(hours)
        bucket_secs = bucket_minutes * 60
        now = time.time()
        cutoff = now - (hours * 3600)
        num_buckets = int((hours * 3600) / bucket_secs) + 1

        # Initialize buckets
        buckets: List[Dict[str, Any]] = []
        for i in range(num_buckets):
            bucket_start = cutoff + i * bucket_secs
            buckets.append({
                "timestamp": datetime.fromtimestamp(bucket_start, tz=timezone.utc).isoformat(),
                "label": datetime.fromtimestamp(bucket_start, tz=timezone.utc).strftime("%H:%M"),
                "total": 0, "success": 0, "blocked": 0, "avg_latency": 0.0,
                "_latencies": []
            })

        # Place records
        for r in records:
            idx = int((r.timestamp - cutoff) / bucket_secs)
            if 0 <= idx < num_buckets:
                buckets[idx]["total"] += 1
                if r.success:
                    buckets[idx]["success"] += 1
                if r.was_blocked:
                    buckets[idx]["blocked"] += 1
                buckets[idx]["_latencies"].append(r.latency_ms)

        # Compute avg latency per bucket
        for b in buckets:
            lats = b.pop("_latencies")
            b["avg_latency"] = round(sum(lats) / len(lats), 1) if lats else 0.0

        return buckets

    def get_recent_activity(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Most recent tool call records for live activity feed."""
        with self._lock:
            recent = sorted(self._tool_calls, key=lambda r: r.timestamp, reverse=True)[:limit]

        result = []
        for r in recent:
            result.append({
                "timestamp": datetime.fromtimestamp(r.timestamp, tz=timezone.utc).isoformat(),
                "tool_name": r.tool_name,
                "user_role": r.user_role,
                "actor_id": r.actor_id,
                "latency_ms": r.latency_ms,
                "success": r.success,
                "was_blocked": r.was_blocked,
                "was_approval_required": r.was_approval_required,
                "error_type": r.error_type
            })
        return result


# Global singleton
metrics_store = MetricsStore()
