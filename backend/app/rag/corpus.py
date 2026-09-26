from typing import List, Dict, Any

DEFAULT_ENTERPRISE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "doc_id": "DOC-SLS-2026-Q3",
        "title": "Q3 2026 Global Enterprise Sales & Revenue Report",
        "department": "Sales",
        "content": (
            "Executive Summary: Q3 Total ARR reached $48.2M (+18% YoY vs $40.8M in Q3 2025). "
            "Key drivers: North America Enterprise expansion (+24%) and EMEA Cloud Migration (+14%). "
            "Gross Margin improved to 76.4% (up 180 bps from Q2). Churn decreased to 1.9%.\n"
            "Critical Financial Alerts & Important Changes:\n"
            "1. APAC Invoicing Lag: Payment gateway transition caused a 2.4% invoicing lag in APAC, "
            "requiring an immediate reconciliation review by the Finance team before the Oct 5 quarterly close.\n"
            "2. Top Closed Deals: $1.8M 3-year agreement with Apex Global Holdings; $920K expansion with Orion Financial.\n"
            "3. Department Action: Finance Operations must reconcile APAC payment receivables and prepare adjusted forecasts."
        ),
        "metadata": {
            "author": "Sarah Jenkins (VP of Revenue)",
            "date": "2026-09-15",
            "access": "Internal",
            "tags": ["sales", "revenue", "q3", "apac", "invoicing", "reconciliation"]
        }
    },
    {
        "doc_id": "DOC-FIN-2026-POL",
        "title": "Corporate Budget Allocation & Travel Expense Policy 2026",
        "department": "Finance",
        "content": (
            "Corporate Finance Operations Guidance (FY2026):\n"
            "1. Discretionary Expense Thresholds: All discretionary department travel, vendor retainers, and "
            "software tool subscriptions exceeding $5,000 must receive secondary approval from the Finance Operations desk.\n"
            "2. Quarter-End Budget Lock: Q4 budget allocation lock date is strictly October 15, 2026.\n"
            "3. Escalation Contact: For emergency budget reallocations or invoice clearance, submit a Jira ticket to "
            "David Chen (Finance Ops Lead) or email david.chen@enterprise.internal."
        ),
        "metadata": {
            "author": "Marcus Vance (CFO)",
            "date": "2026-08-01",
            "access": "Internal",
            "tags": ["finance", "policy", "budget", "expenses", "david chen"]
        }
    },
    {
        "doc_id": "DOC-HR-OPS-DIR",
        "title": "Operations & Leadership Directory 2026",
        "department": "Operations",
        "content": (
            "Key Leadership Contacts and Operational Routing:\n"
            "- VP Operations & General Manager: Elena Rostova (elena.rostova@enterprise.internal)\n"
            "- Finance Operations Lead: David Chen (david.chen@enterprise.internal)\n"
            "- VP Revenue / Sales: Sarah Jenkins (sarah.j@enterprise.internal)\n"
            "- Chief Information Security Officer: Tariq Al-Mansoor (tariq.sec@enterprise.internal)\n"
            "- Official Slack Channels: #finance-ops (ticket updates), #leadership-announcements, #general (company-wide), #ops-incidents."
        ),
        "metadata": {
            "author": "People Operations",
            "date": "2026-09-01",
            "access": "Public Internal",
            "tags": ["directory", "contacts", "elena rostova", "david chen", "slack"]
        }
    },
    {
        "doc_id": "DOC-ENG-2026-INFRA",
        "title": "Cloud Infrastructure & Database Architecture Specification",
        "department": "Engineering",
        "content": (
            "Infrastructure and Database Stack Overview:\n"
            "- Core Relational Store: PostgreSQL 16 with pgvector extension enabled for vector similarity embeddings.\n"
            "- Caching & Agent Short-term Memory: Redis 7 cluster with < 5ms response time SLA.\n"
            "- Gateway: FastAPI asynchronous ASGI microservice with Server-Sent Events (SSE) streaming.\n"
            "- Frontend: Next.js 16 App Router with Turbopack and dynamic streaming telemetry."
        ),
        "metadata": {
            "author": "Engineering Platform Team",
            "date": "2026-08-20",
            "access": "Internal Engineering",
            "tags": ["architecture", "postgres", "pgvector", "redis", "fastapi", "nextjs"]
        }
    },
    {
        "doc_id": "DOC-SEC-2026-INC",
        "title": "SOC 2 Type II Compliance & Incident Response Standard",
        "department": "Security",
        "content": (
            "Information Security and Governance Protocol:\n"
            "- Human-in-the-Loop Governance: Any autonomous agent or automated script performing external communications, "
            "email dispatch, or public messaging must obtain explicit human supervisor clearance prior to execution.\n"
            "- Audit Logging: All AI agent tool executions, approval decisions, and data access requests are recorded in immutable logs "
            "retained for 7 years.\n"
            "- Severity-1 Incident Protocol: Immediate broadcast to #ops-incidents and page on-call operations lead."
        ),
        "metadata": {
            "author": "Security & Compliance Desk",
            "date": "2026-07-10",
            "access": "Internal",
            "tags": ["security", "compliance", "soc2", "governance", "human-in-the-loop"]
        }
    }
]
