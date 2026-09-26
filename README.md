# EnterpriseOps-Agent: Enterprise AI Operations Agent

Autonomous enterprise operations agent system where an employee can issue multi-step operational directives (e.g., *"Find the latest sales report, summarize the important changes, create a task for the finance team, and send the summary to the manager"*), executing workflows across Gmail, Drive, Slack, Calendar via MCP servers with human-in-the-loop governance.

---

## 🏗️ Architecture Overview

```
User (Next.js App Router UI)
       │
       ▼ (SSE Streaming / REST)
FastAPI Backend Gateway
       │
       ▼
LangGraph Agent Engine (Phase 2+)
 ├── Planner Node
 ├── Memory (Short-Term: Redis | Long-Term: PostgreSQL + pgvector)
 ├── Tool Selector Node
 ├── Human Approval Gate (Phase 5)
 └── Tool Execution Node
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
  [Gmail MCP]    [Drive MCP]    [Slack MCP]   [Calendar MCP]
```

### Core Agent Loop
> **Reason → Plan → Select Tool → Execute → Observe → Validate → Continue / Retry / Ask Human**

---

## 📁 Monorepo Structure

```
AI_Operation_agent/
├── backend/
│   ├── app/
│   │   ├── config.py           # Pydantic environment configuration
│   │   ├── main.py             # FastAPI entry point & CORS
│   │   ├── routers/
│   │   │   └── chat.py         # /chat & /api/chat SSE streaming endpoints
│   │   └── services/
│   │       └── claude_client.py # Anthropic Claude streaming service & dev simulator
│   ├── .env.example
│   ├── Dockerfile              # Backend container definition
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.js           # App layout with typography & metadata
│   │   ├── page.js             # Modern dark-mode streaming Operations Console
│   │   └── globals.css         # Tailwind CSS styling
│   ├── Dockerfile              # Next.js container definition
│   └── package.json            # Frontend dependencies
├── docker-compose.yml          # Postgres (pgvector), Redis, FastAPI, Next.js orchestration
├── .env.example                # Unified environment variables template
└── README.md                   # System documentation & setup guide
```

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **Docker & Docker Compose** (optional for local non-container development)

---

### Option A: Local Non-Docker Development (Fast Iteration)

#### 1. Setup Backend (FastAPI)
```bash
# In the project root:
# 1. Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Configure environment
copy backend\.env.example backend\.env   # On Windows
# cp backend/.env.example backend/.env   # On Linux/macOS
# Add your ANTHROPIC_API_KEY if available (runs in dev simulation mode if left blank)

# 4. Run FastAPI backend
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`).

#### 2. Setup Frontend (Next.js)
```bash
# In another terminal:
cd frontend
npm install
npm run dev
```
Frontend UI will be accessible at: `http://localhost:3000`.

---

### Option B: Docker Compose (All Services)

```bash
# 1. Copy root environment template
cp .env.example .env

# 2. Add your ANTHROPIC_API_KEY into .env

# 3. Build and launch all services (Postgres + pgvector, Redis, FastAPI, Next.js)
docker compose up --build
```

Services started:
- **Frontend UI**: `http://localhost:3000`
- **FastAPI API & Docs**: `http://localhost:8000/docs`
- **PostgreSQL (pgvector)**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

---

## 🧪 Testing Phase 1 End-to-End

1. Open `http://localhost:3000` in your browser.
2. Verify the top right status badge shows **FastAPI Connected (Online)**.
3. Test with the example prompt:
   > *"Find the latest sales report, summarize the important changes, create a task for the finance team, and send the summary to the manager."*
4. Confirm:
   - User message appears on the right.
   - Response streams into the UI token-by-token using Server-Sent Events (SSE).
   - If an `ANTHROPIC_API_KEY` is provided, live Claude 3.7 / 3.5 Sonnet generates the response.
   - If no key is provided, the built-in dev simulator safely streams an informative onboarding message without crashing.

---

## 🗺️ Project Implementation Roadmap

- [x] **Phase 1: Core scaffold** (Monorepo structure, FastAPI `/chat` SSE streaming, Next.js App Router UI, Docker Compose).
- [x] **Phase 2: Agent brain (LangGraph)** (Planner, ToolSelector, Executor, Validator, Human gate interrupt/resume, MemorySaver checkpointer).
- [ ] **Phase 3: RAG over company documents** (Ingestion pipeline, pgvector similarity search, `search_company_docs` tool).
- [ ] **Phase 4: MCP tool integrations** (Gmail, Drive, Slack, Calendar MCP servers, `create_task`).
- [ ] **Phase 5: Safety & governance** (Human approval gate, role-based access control, structured audit logging).
- [ ] **Phase 6: Observability & evaluation** (Agent tracing, evaluation test scenarios, hallucination benchmark).
