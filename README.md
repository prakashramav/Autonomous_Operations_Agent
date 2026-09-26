# EnterpriseOps Agent 🤖

> **Autonomous AI Operations Agent** — Multi-step workflow execution across enterprise tools with human-in-the-loop governance, RBAC, cryptographic audit logging, and real-time observability.

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-purple)](https://langchain-ai.github.io/langgraph/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🚨 The Problem

Modern enterprise teams waste enormous time on **repetitive, multi-step operational workflows** that span disconnected tools:

- An employee needs to **find a sales report → summarize it → create a Jira task → email the manager** — but each step lives in a different tool (Google Drive, Jira, Gmail), requiring manual context-switching.
- **Critical actions** (sending emails to executives, posting to Slack channels) go out **without any approval process**, creating compliance and security risks.
- **No one knows what the AI did.** When an AI assistant takes actions on behalf of users, there is no audit trail, no role enforcement, and no way to stop runaway automation.
- Different employees have **different permission levels**, but most AI tools apply a one-size-fits-all approach — a junior intern can trigger the same actions as a VP.
- Operations teams have **zero visibility** into how their AI agents perform: which tools fail, which roles trigger approvals, where latency spikes occur.

---

## ✅ How I Solved It

**EnterpriseOps Agent** is a production-grade autonomous operations platform that solves each problem systematically:

### 1. 🔁 Autonomous Multi-Step Workflow Engine (Phase 1 & 2)
Instead of switching between tools manually, employees issue a **single natural language directive**:
> *"Find the latest sales report, summarize the key changes, create a task for the finance team, and send the summary to the manager."*

A **LangGraph StateGraph** decomposes this into a structured plan, executes each step in order using the correct enterprise tool, and streams real-time progress back to the UI via **Server-Sent Events (SSE)**.

**Agent Loop:** `Plan → Select Tool → Check Guardrails → Execute → Observe → Validate → Next Step`

### 2. 📚 Enterprise Knowledge Retrieval (Phase 3)
The agent can search and reason over **internal company documents** using a **RAG (Retrieval-Augmented Generation)** pipeline:
- Documents are embedded into **3072-dimensional vectors** using Google's text-embedding model
- Stored in **pgvector** (PostgreSQL vector extension) or an in-memory embedded store
- Retrieved using **cosine similarity** search — the agent cites its sources with similarity scores

### 3. 🔌 Real Enterprise Tool Integrations via MCP (Phase 4)
The agent connects to **5 enterprise tools** through the official **Model Context Protocol (MCP)** SDK (JSON-RPC 2.0):

| MCP Server | Tools Available |
|---|---|
| **Google Drive MCP** | Search files, read documents, create drafts |
| **Gmail MCP** | List messages, create drafts, send emails |
| **Slack MCP** | List channels, read history, post messages |
| **Google Calendar MCP** | List events, create events, check conflicts |
| **Enterprise Tasks MCP** | Create Jira/Linear tickets, get status, update tickets |

### 4. 🛡️ Safety, RBAC & Human Approval Gates (Phase 5)
Every tool invocation passes through a **3-layer security guardrail**:

1. **Circuit Breaker** — An emergency kill switch that instantly freezes all autonomous operations enterprise-wide
2. **RBAC Policy Matrix** — 24 tools mapped to role requirements (`EMPLOYEE → MANAGER → ADMIN`). Insufficient role = action denied & logged
3. **Human Approval Gate** — Sensitive actions (e.g. `gmail_send_message`) trigger a **LangGraph `interrupt()`**, pausing the agent mid-workflow until a qualified supervisor approves or rejects

All decisions are written to a **SHA-256 cryptographically chained audit ledger** — tamper-evident and fully queryable.

### 5. 📊 Real-Time Observability Dashboard (Phase 6)
A full analytics dashboard gives ops teams live visibility into:
- **KPI cards**: Total calls, success rate, block rate, approval rate, avg/P95 latency, unique actors
- **Time-series area chart**: Tool call volume trends (success vs. blocked) over configurable windows
- **Tool breakdown table**: Per-tool call count, success rate, avg latency, blocked count
- **Role activity bar chart**: EMPLOYEE / MANAGER / ADMIN usage split
- **Live activity feed**: Last N tool executions with timestamps and outcomes

---

## 🏗️ Architecture

```
User (Next.js App Router UI)
       │
       ▼ (SSE Streaming / REST)
FastAPI Backend Gateway  (/api/chat, /api/governance, /api/mcp, /api/metrics)
       │
       ▼
LangGraph StateGraph Agent Engine
 ├── Planner Node         (Gemini → decompose directive into steps)
 ├── Tool Selector Node   (Guardrail check: Circuit Breaker → RBAC → Approval Gate)
 ├── Human Approval Gate  (LangGraph interrupt/resume — supervisor clearance)
 ├── Executor Node        (Run MCP tool / RAG / analysis)
 ├── Validator Node       (Advance step index, check completion)
 └── Synthesizer Node     (Gemini → generate final executive debrief)
       │
       ├── [Gmail MCP]    [Drive MCP]    [Slack MCP]   [Calendar MCP]   [Tasks MCP]
       │
       └── [RAG Engine]  (pgvector / embedded → 3072-dim cosine similarity)

Governance Layer (cross-cutting):
 ├── RBAC Policy Engine   (24-tool policy matrix, role hierarchy)
 ├── SHA-256 Audit Ledger (cryptographically chained, tamper-evident)
 ├── Circuit Breaker      (emergency kill switch, admin-controlled)
 └── Metrics Store        (in-memory time-series, KPI aggregation)
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI, Python 3.11+, Uvicorn, SSE (Server-Sent Events) |
| **AI / LLM** | Google Gemini 2.5 Flash (via `google-genai` SDK) |
| **Agent Framework** | LangGraph (StateGraph, interrupt/resume, MemorySaver) |
| **RAG / Embeddings** | Google text-embedding-004 (3072-dim), pgvector / in-memory store |
| **MCP Protocol** | Official `mcp` SDK v2.2.0 (JSON-RPC 2.0) |
| **Governance** | Custom RBAC engine, SHA-256 audit chaining, circuit breaker |
| **Observability** | In-memory time-series metrics store, KPI aggregation |
| **Containerization** | Docker, Docker Compose (Postgres + pgvector, Redis, FastAPI, Next.js) |

---

## 📁 Project Structure

```
AI_Operation_agent/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py          # LangGraph StateGraph definition
│   │   │   ├── nodes.py          # Planner, ToolSelector, Gate, Executor, Synthesizer
│   │   │   ├── state.py          # AgentState TypedDict
│   │   │   └── tools.py          # Tool registry & execution
│   │   ├── governance/
│   │   │   ├── audit.py          # SHA-256 chained AuditLogger
│   │   │   ├── guardrails.py     # 3-layer guardrail validation
│   │   │   ├── models.py         # Pydantic models (AuditRecord, PolicyRule, etc.)
│   │   │   └── policies.py       # RBAC policy matrix & PolicyEngine
│   │   ├── mcp/
│   │   │   └── servers/          # Gmail, Drive, Slack, Calendar, Tasks MCP servers
│   │   ├── rag/                  # RAG ingestion pipeline & vector store
│   │   ├── routers/
│   │   │   ├── chat.py           # /chat SSE + /chat/approve resume endpoints
│   │   │   ├── governance.py     # /governance/audit-logs, /policies, /circuit-breaker
│   │   │   ├── mcp.py            # /mcp/servers, /mcp/tools, /mcp/call sandbox
│   │   │   ├── documents.py      # /documents CRUD + /documents/search RAG
│   │   │   └── metrics.py        # /metrics/kpis, /time-series, /tools, /roles, /activity
│   │   ├── services/
│   │   │   ├── gemini_client.py  # Google Gemini streaming client
│   │   │   └── metrics.py        # MetricsStore (thread-safe time-series telemetry)
│   │   ├── config.py             # Pydantic settings
│   │   └── main.py               # FastAPI app entry point + CORS
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.js               # Main UI: Chat, Plan Stepper, Approval Gate, Modals
│   │   ├── layout.js             # App layout & metadata
│   │   └── globals.css           # Global styles
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml            # Postgres (pgvector), Redis, FastAPI, Next.js
├── .env.example
└── README.md
```

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **Google Gemini API Key** (optional — runs in dev simulation mode without it)

### Option A: Local Development (Recommended)

**1. Backend (FastAPI on port 8000)**
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment (add GEMINI_API_KEY for live AI)
copy backend\.env.example backend\.env

# Start FastAPI with hot-reload
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
> API: `http://localhost:8000` | Interactive Docs: `http://localhost:8000/docs`

**2. Frontend (Next.js on port 3000)**
```bash
cd frontend
npm install
npm run dev
```
> UI: `http://localhost:3000`

---

### Option B: Docker Compose (All Services)

```bash
# Copy and configure environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Build and launch everything
docker compose up --build
```

Services started:
| Service | URL |
|---|---|
| Frontend UI | http://localhost:3000 |
| FastAPI + Docs | http://localhost:8000/docs |
| PostgreSQL (pgvector) | localhost:5432 |
| Redis | localhost:6379 |

---

## 🧪 Testing the Full Workflow

1. Open `http://localhost:3000`
2. Verify **FastAPI Connected (Online)** in the header status badge
3. Select a role from the top-right role switcher (start with **EMPLOYEE**)
4. Paste this directive and hit Send:
   > *"Find the latest sales report, summarize the important changes, create a task for the finance team, and send the summary to the manager."*
5. Watch the **Multi-Step Operations Plan** unfold step by step
6. When the **Supervisor Clearance Required** gate appears (for email dispatch), approve or reject it
7. Open **Governance & Audit** to see the cryptographic audit trail update in real time
8. Open **Analytics** to view the KPI dashboard and time-series telemetry

### Testing RBAC Enforcement
- Switch to **EMPLOYEE** role → try sending an email → agent will trigger the Human Approval Gate
- Switch to **ADMIN** role → open Governance Hub → engage the **Emergency Circuit Breaker** → all tool executions are instantly frozen

---

## 🔌 API Reference

### Chat & Agent
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chat/status` | Engine health, model, capabilities |
| `POST` | `/api/chat` | Stream agent workflow (SSE) |
| `POST` | `/api/chat/approve` | Resume workflow after human approval decision |

### Governance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/governance/policies` | Full RBAC policy matrix |
| `GET` | `/api/governance/roles` | Role metadata and tool counts |
| `GET` | `/api/governance/audit-logs` | Queryable cryptographic audit trail |
| `POST` | `/api/governance/circuit-breaker` | Toggle emergency kill switch |

### MCP Tools
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mcp/servers` | Status, latency for all 5 MCP servers |
| `GET` | `/api/mcp/tools` | All 15 tools with schemas & sensitivity tags |
| `POST` | `/api/mcp/call` | Direct JSON-RPC 2.0 tool execution sandbox |

### Observability
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/metrics/kpis` | Aggregate KPIs for a given time window |
| `GET` | `/api/metrics/time-series` | Bucketed call volume trends |
| `GET` | `/api/metrics/tools` | Per-tool telemetry breakdown |
| `GET` | `/api/metrics/roles` | Per-role activity summary |
| `GET` | `/api/metrics/activity` | Live activity feed (latest N records) |
| `GET` | `/api/metrics/summary` | Consolidated payload for dashboard load |

---

## 🗺️ Implementation Roadmap

- [x] **Phase 1: Core Scaffold** — Monorepo, FastAPI SSE streaming gateway, Next.js App Router UI, Docker Compose orchestration
- [x] **Phase 2: LangGraph Agent Brain** — Planner, ToolSelector, Executor, Validator, Synthesizer nodes; human gate `interrupt`/resume; MemorySaver checkpointer
- [x] **Phase 3: RAG over Company Documents** — Ingestion pipeline, 3072-dim Google text-embedding-004, pgvector / embedded store, cosine similarity search
- [x] **Phase 4: MCP Tool Integrations** — Official MCP SDK v2.2.0 servers for Gmail, Drive, Slack, Calendar, and Jira/Linear Tasks; JSON-RPC 2.0 sandbox
- [x] **Phase 5: Safety & Governance** — Human Approval Gate (LangGraph interrupt/resume), RBAC policy matrix (24 tools, 3 roles), SHA-256 cryptographically chained audit ledger, Emergency Circuit Breaker kill switch, Governance Hub frontend modal
- [x] **Phase 6: Observability & Analytics** — Real-time KPI dashboard, SVG time-series chart, tool execution breakdown, role activity bar chart, live activity feed, `/api/metrics/*` REST API

---

## 📸 Key UI Features

| Feature | Description |
|---|---|
| **Operations Console** | Dark-mode chat interface with SSE streaming |
| **Plan Stepper** | Live multi-step execution tracker with tool icons and MCP server labels |
| **Approval Gate Card** | Animated supervisor clearance prompt with role enforcement |
| **Governance Hub** | Audit log viewer, RBAC policy matrix, circuit breaker toggle |
| **Analytics Dashboard** | KPI cards, SVG area chart, tool table, role breakdown, live feed |
| **MCP Sandbox** | Direct JSON-RPC tool testing with active role context |
| **RAG Vector Store** | Document ingestion, semantic search with similarity scores |
| **Role Switcher** | Switch between EMPLOYEE / MANAGER / ADMIN personas |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ using FastAPI · LangGraph · Google Gemini · Next.js · MCP</p>
  <p><strong>All 6 phases complete ✅</strong></p>
</div>
