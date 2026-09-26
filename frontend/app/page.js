"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  Layers,
  FileText,
  Mail,
  Calendar,
  MessageSquare,
  Database,
  Workflow,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  Search,
  BookOpen,
  Plus,
  ExternalLink,
  Server,
  Zap,
  Play,
  Lock,
  Unlock,
  Fingerprint,
  Power,
  Filter,
  BarChart2,
  Activity,
  TrendingUp,
  Radio,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://autonomous-operations-agent.vercel.app"
    : "http://localhost:8000");

const ENTERPRISE_ROLES = [
  {
    role: "EMPLOYEE",
    title: "Operational Employee",
    actor_id: "emp-7492 (Sarah Lin)",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    rank: 1,
    desc: "Can query corporate knowledge, search Drive, summarize reports, draft emails, and read channels. External dispatches require supervisor clearance."
  },
  {
    role: "MANAGER",
    title: "Operations Manager",
    actor_id: "mgr-0182 (Elena Rostova)",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    rank: 2,
    desc: "Authorized to broadcast Slack updates, schedule executive reviews, file & triage Jira tasks, and grant clearance on human approval gates."
  },
  {
    role: "ADMIN",
    title: "Security & System Admin",
    actor_id: "adm-sec-01 (Marcus Vance)",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    rank: 3,
    desc: "Full administrative authority across all enterprise tools, audit trail inspection, policy reconfiguration, and Emergency Circuit Breaker kill switch."
  }
];

const EXAMPLE_PROMPTS = [
  "Find the latest sales report, summarize the important changes, create a task for the finance team, and send the summary to the manager.",
  "Check my calendar for meetings this week and draft a Slack briefing for the operations channel.",
  "Search our company documents for Q3 compliance updates and list all action items.",
  "Check corporate budget policy and schedule a finance review meeting with David Chen."
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to **EnterpriseOps Agent**.\n\n" +
        "I am an autonomous enterprise operations assistant running on a multi-step **LangGraph Brain**, **Google Gemini**, **3072-dim pgvector RAG**, 5 connected **Model Context Protocol (MCP) Servers**, enterprise **Safety & RBAC Governance**, and a real-time **Observability Dashboard**:\n\n" +
        "- **Google Drive MCP**: Search reports and read enterprise documents.\n" +
        "- **Enterprise Tasks MCP**: File Jira & Linear operational tickets.\n" +
        "- **Gmail MCP**: Draft and dispatch formal executive briefing emails.\n" +
        "- **Slack MCP**: Broadcast team announcements and operational alerts.\n" +
        "- **Google Calendar MCP**: Schedule reviews and verify team availability.\n\n" +
        "🛡️ **Phase 5 Governance Active**: All actions validated against **RBAC** matrix, recorded to a **cryptographically hashed audit ledger**, protected by the **Emergency Circuit Breaker**.\n\n" +
        "📊 **Phase 6 Observability Active**: Real-time **KPI dashboard**, **time-series tool telemetry**, per-role activity breakdown, and a **live activity feed** — click **Analytics** in the header.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

  // RBAC & Identity State
  const [activeRole, setActiveRole] = useState(ENTERPRISE_ROLES[0]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Governance & Audit State
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [governanceTab, setGovernanceTab] = useState("audit"); // "audit" | "policies"
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState("ALL");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [circuitBreaker, setCircuitBreaker] = useState({
    is_active: false,
    triggered_by: null,
    reason: null,
    timestamp: null
  });
  const [policies, setPolicies] = useState([]);
  const [togglingCircuitBreaker, setTogglingCircuitBreaker] = useState(false);

  // RAG State
  const [showRAGModal, setShowRAGModal] = useState(false);
  const [ragDocs, setRagDocs] = useState([]);
  const [ragSearchQuery, setRagSearchQuery] = useState("");
  const [ragSearchResults, setRagSearchResults] = useState(null);
  const [ragSearching, setRagSearching] = useState(false);
  const [showIngestForm, setShowIngestForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", department: "Operations", content: "" });
  const [ingesting, setIngesting] = useState(false);

  // MCP State
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [mcpTools, setMcpTools] = useState([]);
  const [selectedMCPTool, setSelectedMCPTool] = useState("slack_list_channels");
  const [mcpToolArgs, setMcpToolArgs] = useState("{}");
  const [mcpTestResult, setMcpTestResult] = useState(null);
  const [mcpExecuting, setMcpExecuting] = useState(false);

  // Phase 6: Analytics & Observability State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsWindow, setAnalyticsWindow] = useState(24);

  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    model: "gemini-2.5-flash",
    geminiConfigured: false,
    phase: "Phase 6 (Observability & Analytics)"
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, approvalLoading]);

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      setBackendStatus(prev => ({ ...prev, checking: true }));
      const res = await fetch(`${BACKEND_URL}/api/chat/status`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({
          connected: true,
          checking: false,
          model: data.model || "gemini-2.5-flash",
          geminiConfigured: data.gemini_configured,
          phase: data.phase || "Phase 5 (Safety & Governance + MCP + RAG)"
        });
      } else {
        setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
      }
    } catch {
      setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
    }
  };

  // Fetch Governance Policies and Audit Logs
  const fetchGovernanceData = async () => {
    try {
      setAuditLoading(true);
      const [resPolicies, resAudit] = await Promise.all([
        fetch(`${BACKEND_URL}/api/governance/policies`),
        fetch(`${BACKEND_URL}/api/governance/audit-logs?limit=50`)
      ]);

      if (resPolicies.ok) {
        const pData = await resPolicies.json();
        setPolicies(pData.policies || []);
        if (pData.circuit_breaker) {
          setCircuitBreaker(pData.circuit_breaker);
        }
      }

      if (resAudit.ok) {
        const aData = await resAudit.json();
        setAuditLogs(aData.records || []);
        if (typeof aData.circuit_breaker_active === "boolean") {
          setCircuitBreaker(prev => ({ ...prev, is_active: aData.circuit_breaker_active }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch governance data", e);
    } finally {
      setAuditLoading(false);
    }
  };

  // Toggle Circuit Breaker (Emergency Kill Switch)
  const handleToggleCircuitBreaker = async (newActiveState) => {
    setTogglingCircuitBreaker(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/governance/circuit-breaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: newActiveState,
          actor_id: activeRole.actor_id,
          reason: newActiveState
            ? `Emergency Kill Switch engaged by ${activeRole.actor_id}`
            : `Circuit Breaker released by ${activeRole.actor_id}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCircuitBreaker(data.circuit_breaker);
        await fetchGovernanceData();
      }
    } catch (err) {
      console.error("Error toggling circuit breaker", err);
    } finally {
      setTogglingCircuitBreaker(false);
    }
  };

  // Clear / Reset Audit Trail
  const handleClearAuditLogs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/governance/audit-logs`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchGovernanceData();
      }
    } catch (err) {
      console.error("Failed to clear audit logs", err);
    }
  };

  // Fetch RAG documents
  const fetchRagDocs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setRagDocs(data.documents || []);
      }
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  // Fetch MCP servers & tools
  const fetchMCPData = async () => {
    try {
      const [resServers, resTools] = await Promise.all([
        fetch(`${BACKEND_URL}/api/mcp/servers`),
        fetch(`${BACKEND_URL}/api/mcp/tools`)
      ]);
      if (resServers.ok && resTools.ok) {
        const dataServers = await resServers.json();
        const dataTools = await resTools.json();
        setMcpServers(dataServers.servers || []);
        setMcpTools(dataTools.tools || []);
      }
    } catch (e) {
      console.error("Failed to fetch MCP data", e);
    }
  };

  // Fetch Phase 6 Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/metrics/summary`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    fetchRagDocs();
    fetchMCPData();
    fetchGovernanceData();
    fetchAnalytics();
    const interval = setInterval(() => {
      checkBackendHealth();
      fetchGovernanceData();
      if (showAnalyticsModal) fetchAnalytics();
    }, 15000);
    return () => clearInterval(interval);
  }, [showAnalyticsModal, fetchAnalytics]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleStepDetails = (stepKey) => {
    setExpandedSteps(prev => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // RAG Search
  const handleRAGSearch = async (e) => {
    e?.preventDefault();
    if (!ragSearchQuery.trim()) return;
    setRagSearching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ragSearchQuery, top_k: 3 })
      });
      if (res.ok) {
        const data = await res.json();
        setRagSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("RAG search failed", err);
    } finally {
      setRagSearching(false);
    }
  };

  // Document Ingest
  const handleIngestDocument = async (e) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        setNewDoc({ title: "", department: "Operations", content: "" });
        setShowIngestForm(false);
        await fetchRagDocs();
      }
    } catch (err) {
      console.error("Ingestion failed", err);
    } finally {
      setIngesting(false);
    }
  };

  // Execute MCP Tool directly in Sandbox with Active Role Context
  const handleExecuteMCPTool = async () => {
    setMcpExecuting(true);
    setMcpTestResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(mcpToolArgs);
      } catch {
        parsedArgs = {};
      }

      const res = await fetch(`${BACKEND_URL}/api/mcp/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedMCPTool,
          arguments: parsedArgs,
          user_role: activeRole.role,
          actor_id: activeRole.actor_id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMcpTestResult(data.result);
        await fetchGovernanceData();
      } else {
        setMcpTestResult({ error: `Server error ${res.status}` });
      }
    } catch (err) {
      setMcpTestResult({ error: err.message });
    } finally {
      setMcpExecuting(false);
    }
  };

  // Send Operational Directive with Active Role & Actor ID
  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isStreaming) return;

    const userMessageId = "user-" + Date.now();
    const assistantMessageId = "assistant-" + Date.now();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMsg = {
      id: userMessageId,
      role: "user",
      content: text.trim(),
      timestamp: timeNow,
      actor: activeRole.actor_id,
      userRole: activeRole.role
    };

    const newAssistantMsg = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      plan: [],
      observations: {},
      pendingApproval: null,
      sessionId: null,
      timestamp: timeNow
    };

    const updatedHistory = [...messages, newUserMsg];
    setMessages([...updatedHistory, newAssistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          use_agent: true,
          user_role: activeRole.role,
          actor_id: activeRole.actor_id
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event === "session_init") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, sessionId: parsed.session_id }
                      : msg
                  )
                );
              } else if (parsed.event === "plan") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, plan: parsed.plan, sessionId: parsed.session_id || msg.sessionId }
                      : msg
                  )
                );
              } else if (parsed.event === "step_executed") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          plan: parsed.plan,
                          observations: parsed.observations,
                          sessionId: parsed.session_id || msg.sessionId
                        }
                      : msg
                  )
                );
              } else if (parsed.event === "approval_required") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          pendingApproval: parsed.approval,
                          sessionId: parsed.session_id || msg.sessionId
                        }
                      : msg
                  )
                );
              } else if (parsed.event === "final_response") {
                accumulated = parsed.content;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
                // Refresh audit trail
                fetchGovernanceData();
              } else if (parsed.delta) {
                accumulated += parsed.delta;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
              } else if (parsed.error) {
                accumulated += `\n\n*(Error: ${parsed.error})*`;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
              }
            } catch {
              if (dataStr) {
                accumulated += dataStr;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  `**Connection Error**: Unable to reach backend at \`${BACKEND_URL}\`.\n\n` +
                  `Please ensure the FastAPI service is running:\n` +
                  "```bash\ncd backend\nuvicorn app.main:app --reload\n```\n" +
                  `*Details: ${err.message}*`
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Human Supervisor Approval with Role Enforcement
  const handleApprovalDecision = async (messageId, sessionId, decision, approverOverrideRole) => {
    if (!sessionId || approvalLoading) return;
    setApprovalLoading(true);

    const roleToUse = approverOverrideRole || activeRole.role;
    const actorToUse = approverOverrideRole === "MANAGER"
      ? "mgr-0182 (Elena Rostova)"
      : activeRole.actor_id;

    try {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, pendingApproval: null }
            : msg
        )
      );

      const response = await fetch(`${BACKEND_URL}/api/chat/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          decision: decision,
          approver_role: roleToUse,
          approver_id: actorToUse
        })
      });

      if (!response.ok) {
        throw new Error(`Approval resume failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event === "step_executed") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          plan: parsed.plan,
                          observations: parsed.observations
                        }
                      : msg
                  )
                );
              } else if (parsed.event === "final_response") {
                accumulated = parsed.content;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === messageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
                await fetchGovernanceData();
              } else if (parsed.delta) {
                accumulated += parsed.delta;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === messageId
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Resume parse error", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Approval resumption error:", err);
    } finally {
      setApprovalLoading(false);
      await fetchGovernanceData();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getToolIcon = (toolName) => {
    if (toolName.includes("mail") || toolName.includes("gmail")) {
      return <Mail className="h-3.5 w-3.5 text-rose-400" />;
    }
    if (toolName.includes("slack")) {
      return <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />;
    }
    if (toolName.includes("drive") || toolName.includes("doc")) {
      return <FileText className="h-3.5 w-3.5 text-blue-400" />;
    }
    if (toolName.includes("task") || toolName.includes("ticket")) {
      return <Workflow className="h-3.5 w-3.5 text-purple-400" />;
    }
    if (toolName.includes("calendar")) {
      return <Calendar className="h-3.5 w-3.5 text-amber-400" />;
    }
    return <Sparkles className="h-3.5 w-3.5 text-cyan-400" />;
  };

  const getMCPServerForTool = (toolName) => {
    if (toolName.includes("mail") || toolName === "send_email") return "gmail-mcp";
    if (toolName.includes("slack") || toolName === "send_slack_message") return "slack-mcp";
    if (toolName.includes("task") || toolName === "create_task") return "enterprise-tasks-mcp";
    if (toolName.includes("calendar") || toolName === "schedule_calendar_event") return "google-calendar-mcp";
    if (toolName.includes("drive") || toolName.includes("doc")) return "google-drive-mcp";
    return "mcp-server";
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter !== "ALL") {
      if (auditFilter === "HIGH_RISK" && log.risk_level !== "HIGH" && log.risk_level !== "CRITICAL") return false;
      if (auditFilter === "DENIED" && log.status !== "DENIED") return false;
      if (auditFilter === "PENDING_APPROVAL" && log.status !== "PENDING_APPROVAL") return false;
      if (auditFilter === "APPROVED" && log.status !== "APPROVED") return false;
      if (auditFilter === "EXECUTED" && log.status !== "EXECUTED") return false;
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.tool_name.toLowerCase().includes(q) ||
        log.actor_id.toLowerCase().includes(q) ||
        log.input_summary.toLowerCase().includes(q) ||
        (log.output_summary || "").toLowerCase().includes(q) ||
        (log.policy_reason || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between hidden md:flex shrink-0">
        {/* Brand & Status */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Workflow className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                EnterpriseOps
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  Phase 6
                </span>
              </h1>
              <p className="text-xs text-slate-400">Autonomous Operations Agent</p>
            </div>
          </div>

          {/* Circuit Breaker & Engine Status Badge */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              Governance & Guardrails
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  circuitBreaker.is_active
                    ? "bg-rose-500 shadow-sm shadow-rose-500/80 animate-ping"
                    : backendStatus.connected
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/80"
                    : "bg-amber-500"
                }`}
              />
              <span
                className={`text-[11px] font-medium ${
                  circuitBreaker.is_active
                    ? "text-rose-400 font-bold"
                    : backendStatus.connected
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {circuitBreaker.is_active ? "CIRCUIT BREAKER" : "Active & Enforced"}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Checklist & Features */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Quick Hub Launchers */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowGovernanceModal(true)}
              className="p-2 rounded-xl bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/40 hover:border-rose-400 text-left transition group shadow-sm col-span-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-rose-400 group-hover:scale-110 transition" />
                <div>
                  <span className="font-semibold text-white block text-xs flex items-center gap-1.5">
                    Safety & Governance Ledger
                    {circuitBreaker.is_active && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold animate-pulse">
                        HALTED
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    RBAC Matrix • Cryptographic Audit Trail • Kill Switch
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-mono">
                {auditLogs.length} Events
              </span>
            </button>

            <button
              onClick={() => setShowMCPModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition group shadow-sm col-span-1"
            >
              <div className="flex items-center justify-between mb-1">
                <Server className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition" />
                <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">5 MCPs</span>
              </div>
              <span className="font-semibold text-white block text-xs">MCP Hub</span>
              <span className="text-[10px] text-slate-400">15 Tools</span>
            </button>

            <button
              onClick={() => setShowRAGModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-left transition group shadow-sm col-span-2"
            >
              <div className="flex items-center justify-between mb-1">
                <Database className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition" />
                <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-mono">{ragDocs.length} Docs</span>
              </div>
              <span className="font-semibold text-white block text-xs">RAG Vector Store</span>
              <span className="text-[10px] text-slate-400">3072-dim pgvector</span>
            </button>

            <button
              onClick={() => { setShowAnalyticsModal(true); fetchAnalytics(); }}
              className="p-2 rounded-xl bg-gradient-to-br from-violet-950/50 to-slate-900 border border-violet-500/40 hover:border-violet-400 text-left transition group shadow-sm col-span-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <BarChart2 className="h-5 w-5 text-violet-400 group-hover:scale-110 transition" />
                <div>
                  <span className="font-semibold text-white block text-xs flex items-center gap-1.5">
                    Observability & Analytics
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 font-bold">Phase 6</span>
                  </span>
                  <span className="text-[10px] text-slate-400">KPI Dashboard · Time-Series · Live Activity Feed</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-violet-500/20 text-violet-300 font-mono">
                {analyticsData?.kpis?.total_calls ?? "—"} Calls
              </span>
            </button>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" /> Architecture Roadmap
            </p>
            <div className="space-y-1.5">
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-300 block">Phase 1: Core Scaffold</span>
                  <span className="text-[11px] text-slate-500">FastAPI Gateway + Next.js SSE</span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-300 block">Phase 2: LangGraph Brain</span>
                  <span className="text-[11px] text-slate-500">Planner, Execution & Human Gate</span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-300 block">Phase 3: Document RAG</span>
                  <span className="text-[11px] text-slate-500">pgvector & 3072-dim Embeddings</span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-300 block">Phase 4: MCP Tool Integrations</span>
                  <span className="text-[11px] text-slate-500">Gmail, Drive, Slack, Calendar, Tasks</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-gradient-to-r from-rose-950/70 to-slate-900 border border-rose-500/40 flex items-start gap-2 text-rose-100 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Phase 5: Safety & Governance</span>
                  <span className="text-[11px] text-rose-300 leading-tight block">
                    RBAC Roles, Chained Audit Ledger & Kill Switch
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setShowAnalyticsModal(true); fetchAnalytics(); }}
                className="w-full text-left p-2.5 rounded-lg bg-gradient-to-r from-violet-950/70 to-slate-900 border border-violet-500/40 hover:border-violet-400 flex items-start gap-2 text-violet-100 shadow-sm transition group"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block flex items-center gap-1.5">Phase 6: Observability
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 font-bold">NEW</span>
                  </span>
                  <span className="text-[11px] text-violet-300 leading-tight block">KPI Dashboard · Time-Series · Live Activity</span>
                </div>
                <BarChart2 className="h-4 w-4 text-violet-400 ml-auto shrink-0 mt-0.5 group-hover:scale-110 transition" />
              </button>
            </div>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-blue-400" /> Active Identity (RBAC)
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-xs">{activeRole.title}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${activeRole.badgeColor}`}>
                  {activeRole.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{activeRole.actor_id}</p>
            </div>
          </div>
        </div>

        {/* System info footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Audit Chaining</span>
            <span className="font-mono text-emerald-400 font-medium">SHA-256 Ledger</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">MCP Protocol</span>
            <span className="font-mono text-emerald-400 font-medium">JSON-RPC 2.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Active Model</span>
            <span className="font-mono text-indigo-400 font-medium">{backendStatus.model}</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center md:hidden">
              <Workflow className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                Operations Console
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Governance Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Autonomous Workflow Execution with Human-in-the-Loop & RBAC</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                id="role-switcher-btn"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition shadow-sm ${activeRole.badgeColor}`}
                title="Change active corporate identity and permission role"
              >
                <Fingerprint className="h-3.5 w-3.5" />
                <span className="font-semibold">{activeRole.role}</span>
                <span className="text-slate-400 hidden lg:inline truncate max-w-[110px]">
                  ({activeRole.actor_id.split(" ")[0]})
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Corporate Persona (RBAC)
                  </div>
                  {ENTERPRISE_ROLES.map((r) => (
                    <button
                      key={r.role}
                      id={`role-option-${r.role.toLowerCase()}`}
                      onClick={() => {
                        setActiveRole(r);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition flex items-start gap-2.5 ${
                        activeRole.role === r.role
                          ? "bg-slate-800 text-white font-medium border border-slate-700"
                          : "text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border mt-0.5 ${r.badgeColor}`}>
                        {r.role}
                      </span>
                      <div className="flex-1 truncate">
                        <span className="font-semibold block text-slate-200">{r.title}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{r.actor_id}</span>
                        <span className="text-[10px] text-slate-500 block line-clamp-1">{r.desc}</span>
                      </div>
                      {activeRole.role === r.role && <Check className="h-3.5 w-3.5 text-emerald-400 mt-1" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Governance Hub Button */}
            <button
              id="governance-hub-btn"
              onClick={() => setShowGovernanceModal(true)}
              className={`px-3 py-1.5 rounded-lg border transition text-xs font-medium flex items-center gap-1.5 shadow-sm ${
                circuitBreaker.is_active
                  ? "border-rose-500 bg-rose-950/60 text-rose-200 animate-pulse"
                  : "border-rose-500/40 hover:border-rose-400 bg-rose-950/20 text-rose-300 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              <span>Governance & Audit</span>
            </button>

            {/* Phase 6 Analytics Button */}
            <button
              id="analytics-dashboard-btn"
              onClick={() => { setShowAnalyticsModal(true); fetchAnalytics(); }}
              className="px-3 py-1.5 rounded-lg border border-violet-500/40 hover:border-violet-400/60 bg-violet-950/30 text-violet-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5"
            >
              <BarChart2 className="h-3.5 w-3.5 text-violet-400" />
              <span className="hidden sm:inline">Analytics</span>
            </button>


            {/* MCP Hub */}
            <button
              onClick={() => setShowMCPModal(true)}
              className="px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-950/30 text-indigo-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5"
            >
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">MCP Hub</span>
            </button>

            {/* RAG Docs */}
            <button
              onClick={() => setShowRAGModal(true)}
              className="px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/30 text-cyan-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">RAG Docs</span>
            </button>

            <button
              onClick={() => {
                checkBackendHealth();
                fetchGovernanceData();
              }}
              title="Refresh Engine & Governance"
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus.checking ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Emergency Circuit Breaker Banner (when active) */}
        {circuitBreaker.is_active && (
          <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-950 border-b border-rose-500/60 p-3 px-6 text-xs text-rose-100 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-rose-500/30 border border-rose-400 flex items-center justify-center text-rose-200 animate-pulse">
                <Power className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-white block">
                  EMERGENCY CIRCUIT BREAKER ENGAGED: Autonomous operations & MCP tool dispatches are FROZEN.
                </span>
                <span className="text-rose-300 text-[11px]">
                  Reason: {circuitBreaker.reason || "Administrative freeze"} • Triggered by: {circuitBreaker.triggered_by || "System Admin"}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggleCircuitBreaker(false)}
              disabled={togglingCircuitBreaker}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-md"
            >
              {togglingCircuitBreaker ? "Resuming..." : "Resume Operations"}
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 md:gap-4 max-w-4xl mx-auto ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0 mt-1">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-indigo-400" />
                  </div>
                </div>
              )}

              <div
                className={`relative group max-w-3xl rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none backdrop-blur-sm space-y-4"
                }`}
              >
                {/* User Message Header & Text */}
                {msg.role === "user" && (
                  <div>
                    {msg.actor && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-200 mb-1 opacity-90">
                        <Fingerprint className="h-3 w-3" />
                        <span>{msg.actor}</span>
                        <span className="px-1 rounded bg-indigo-500/40 text-[9px] font-bold">[{msg.userRole}]</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  </div>
                )}

                {/* Assistant Message with Plan & Gates */}
                {msg.role === "assistant" && (
                  <>
                    {/* Execution Plan Stepper */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <Workflow className="h-3.5 w-3.5 text-indigo-400" />
                            Multi-Step Operations Plan ({msg.plan.filter(s => s.status === "completed" || s.status === "rejected" || s.status === "denied_policy").length}/{msg.plan.length} Steps)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            SESSION: {msg.sessionId ? msg.sessionId.slice(0, 14) : "gov-session"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {msg.plan.map((step) => {
                            const stepKey = `${msg.id}-step-${step.step_number}`;
                            const isExpanded = expandedSteps[stepKey];
                            const isCompleted = step.status === "completed";
                            const isInProgress = step.status === "in_progress";
                            const isWaitingApproval = step.status === "waiting_approval";
                            const isRejected = step.status === "rejected";
                            const isDeniedPolicy = step.status === "denied_policy";
                            const isBlockedCircuitBreaker = step.status === "blocked_circuit_breaker";
                            const isPending = step.status === "pending";

                            const mcpServer = getMCPServerForTool(step.tool);
                            const observationData = msg.observations ? msg.observations[`step_${step.step_number}`] : null;
                            const ragData = observationData?.documents?.[0] || null;

                            return (
                              <div
                                key={step.step_number}
                                className={`rounded-xl border p-2.5 transition text-xs ${
                                  isBlockedCircuitBreaker
                                    ? "bg-rose-950/30 border-rose-500/60 text-rose-200"
                                    : isDeniedPolicy
                                    ? "bg-rose-950/20 border-rose-500/40 text-rose-200"
                                    : isWaitingApproval
                                    ? "bg-amber-950/30 border-amber-500/60 text-amber-200"
                                    : isCompleted
                                    ? "bg-slate-900/60 border-slate-800 text-slate-300"
                                    : isInProgress
                                    ? "bg-indigo-950/30 border-indigo-500/50 text-indigo-200"
                                    : "bg-slate-950/40 border-slate-800/40 text-slate-500"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 truncate">
                                    <div className="shrink-0">
                                      {isCompleted && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                      )}
                                      {isInProgress && (
                                        <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                                      )}
                                      {isWaitingApproval && (
                                        <ShieldAlert className="h-4 w-4 text-amber-400 animate-pulse" />
                                      )}
                                      {isRejected && (
                                        <X className="h-4 w-4 text-rose-400" />
                                      )}
                                      {isDeniedPolicy && (
                                        <Lock className="h-4 w-4 text-rose-400" />
                                      )}
                                      {isBlockedCircuitBreaker && (
                                        <Power className="h-4 w-4 text-rose-500" />
                                      )}
                                      {isPending && (
                                        <Clock className="h-4 w-4 text-slate-500" />
                                      )}
                                    </div>

                                    <div className="flex-1 truncate">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-200 truncate">
                                          {step.step_number}. {step.title}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 shrink-0">
                                          {getToolIcon(step.tool)}
                                          <code>{step.tool}</code>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono">
                                      MCP: {mcpServer.replace("-mcp", "")}
                                    </span>
                                    {isDeniedPolicy && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                        RBAC DENIED
                                      </span>
                                    )}
                                    {isBlockedCircuitBreaker && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">
                                        HALTED
                                      </span>
                                    )}
                                    {step.is_sensitive && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                        GATE
                                      </span>
                                    )}
                                    <button
                                      onClick={() => toggleStepDetails(stepKey)}
                                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Step Details with Governance Metadata */}
                                {isExpanded && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] space-y-2 text-slate-400 font-mono">
                                    <p className="text-slate-300 font-sans">{step.description}</p>
                                    {step.thought && (
                                      <p className="italic text-slate-400 font-sans">
                                        <span className="text-indigo-400 font-medium not-italic">Reasoning: </span>
                                        {step.thought}
                                      </p>
                                    )}
                                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[10px]">
                                      <span>MCP Server: <code className="text-indigo-300">{mcpServer}</code></span>
                                      <span className="text-slate-500">Security: SHA-256 Chained</span>
                                    </div>
                                    {ragData && (
                                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-200 space-y-1 font-sans">
                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                          <span className="text-blue-400 font-bold">SOURCE: {ragData.doc_id}</span>
                                          <span className="text-cyan-300">{Math.round(ragData.similarity_score * 100)}% Match</span>
                                        </div>
                                        <p className="text-xs font-medium text-white">{ragData.title}</p>
                                        <p className="text-[11px] text-slate-300 line-clamp-3 italic">&quot;{ragData.summary_content}&quot;</p>
                                      </div>
                                    )}
                                    {step.result && (
                                      <div className="p-2 rounded bg-slate-950/90 border border-slate-800 text-[10px]">
                                        <span className="text-slate-400 font-semibold block mb-0.5">Execution Result:</span>
                                        <pre className="text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                                          {step.result}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Human Approval Gate Card */}
                    {msg.pendingApproval && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/30 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                              <ShieldAlert className="h-4 w-4 animate-bounce" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                                Supervisor Clearance Required (Governance Gate)
                              </h4>
                              <p className="text-[11px] text-slate-300">
                                Step {msg.pendingApproval.step_number}: <code className="text-amber-200">{msg.pendingApproval.tool}</code> via <code className="text-indigo-300">{getMCPServerForTool(msg.pendingApproval.tool)}</code>
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {msg.pendingApproval.risk_level || "HIGH RISK"}
                          </span>
                        </div>

                        {/* Approver role requirement alert */}
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>
                              <strong>Policy Requirement</strong>: Must be approved by a <strong>Manager</strong> or <strong>Admin</strong>.
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            Current Role: {activeRole.role}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                          {msg.pendingApproval.reason || msg.pendingApproval.action_description}
                        </p>

                        {/* Parameter details preview */}
                        {msg.pendingApproval.parameters && (
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                              Payload Preview
                            </span>
                            {msg.pendingApproval.parameters.recipient && (
                              <div>
                                <span className="text-slate-500">Recipient: </span>
                                <span className="text-indigo-300 font-mono">{msg.pendingApproval.parameters.recipient}</span>
                              </div>
                            )}
                            {msg.pendingApproval.parameters.subject && (
                              <div>
                                <span className="text-slate-500">Subject: </span>
                                <span className="text-slate-200">{msg.pendingApproval.parameters.subject}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          {activeRole.role === "EMPLOYEE" ? (
                            <button
                              onClick={() => {
                                const mgrRole = ENTERPRISE_ROLES.find(r => r.role === "MANAGER");
                                if (mgrRole) setActiveRole(mgrRole);
                                handleApprovalDecision(msg.id, msg.sessionId, "approved", "MANAGER");
                              }}
                              disabled={approvalLoading}
                              className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-md"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Elevate to Manager & Approve Dispatch
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprovalDecision(msg.id, msg.sessionId, "approved")}
                              disabled={approvalLoading}
                              className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/30"
                            >
                              {approvalLoading ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Grant Manager Clearance & Execute
                            </button>
                          )}

                          <button
                            onClick={() => handleApprovalDecision(msg.id, msg.sessionId, "rejected")}
                            disabled={approvalLoading}
                            className="w-full sm:w-auto py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-slate-300 disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject & Skip
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Synthesized Response Body */}
                    {msg.content && (
                      <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed pt-1">
                        {msg.content}
                      </div>
                    )}

                    {/* Streaming Cursor */}
                    {isStreaming && msg.id.startsWith("assistant") && msg === messages[messages.length - 1] && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>LangGraph agent orchestrating MCP servers & workflow...</span>
                      </div>
                    )}
                  </>
                )}

                {/* Footer metadata */}
                <div className="pt-1 border-t border-slate-700/30 flex items-center justify-between text-[10px] opacity-70">
                  <span>{msg.timestamp}</span>
                  {msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-slate-300 mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        {messages.length <= 2 && (
          <div className="px-6 py-2 max-w-4xl mx-auto w-full">
            <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Multi-Step Operational Workflows:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-left p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 text-xs text-slate-300 hover:text-white transition group"
                >
                  <span className="line-clamp-2">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 md:p-6 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-end gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20 transition shadow-lg"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  circuitBreaker.is_active
                    ? "Execution frozen by Circuit Breaker. Resume in Governance console..."
                    : `Issue directive as ${activeRole.title} (${activeRole.actor_id})...`
                }
                rows={2}
                disabled={isStreaming || approvalLoading || circuitBreaker.is_active}
                className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-sans disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming || approvalLoading || circuitBreaker.is_active}
                className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center shrink-0 transition shadow-md shadow-indigo-600/30"
              >
                {isStreaming || approvalLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Executing as <strong>{activeRole.actor_id}</strong> (Role: <code className="text-slate-400">{activeRole.role}</code>)</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                RBAC Enforced • SHA-256 Audit Chained • 5 MCPs
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          Phase 6: Observability & Analytics Dashboard Modal
          ══════════════════════════════════════════════════════════════════ */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <BarChart2 className="h-5 w-5 text-violet-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    Observability & Analytics
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">Phase 6</span>
                    {analyticsLoading && <RefreshCw className="h-3.5 w-3.5 text-violet-400 animate-spin" />}
                  </h3>
                  <p className="text-xs text-slate-400">Real-time KPIs · Tool Telemetry · Time-Series Trends · Live Activity Feed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={analyticsWindow}
                  onChange={e => setAnalyticsWindow(Number(e.target.value))}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none"
                >
                  <option value={6}>Last 6h</option>
                  <option value={12}>Last 12h</option>
                  <option value={24}>Last 24h</option>
                  <option value={48}>Last 48h</option>
                </select>
                <button
                  onClick={fetchAnalytics}
                  className="p-1.5 rounded-lg border border-slate-700 hover:border-violet-500/50 bg-slate-800/60 text-slate-400 hover:text-violet-300 transition"
                  title="Refresh metrics"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowAnalyticsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── KPI Cards Row ── */}
              {analyticsData && (() => {
                const kpis = analyticsData.kpis || {};
                const cards = [
                  {
                    label: "Total Tool Calls",
                    value: kpis.total_calls ?? 0,
                    sub: `${analyticsWindow}h window`,
                    color: "text-violet-300",
                    bg: "from-violet-950/60 to-slate-900",
                    border: "border-violet-500/30",
                    icon: <Activity className="h-4 w-4 text-violet-400" />,
                    trend: null
                  },
                  {
                    label: "Success Rate",
                    value: `${kpis.success_rate ?? 0}%`,
                    sub: `${kpis.total_calls ? Math.round((kpis.success_rate / 100) * kpis.total_calls) : 0} succeeded`,
                    color: "text-emerald-300",
                    bg: "from-emerald-950/50 to-slate-900",
                    border: "border-emerald-500/30",
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
                    trend: "up"
                  },
                  {
                    label: "Block Rate",
                    value: `${kpis.block_rate ?? 0}%`,
                    sub: "Policy / CB blocks",
                    color: "text-rose-300",
                    bg: "from-rose-950/50 to-slate-900",
                    border: "border-rose-500/30",
                    icon: <Lock className="h-4 w-4 text-rose-400" />,
                    trend: "down"
                  },
                  {
                    label: "Approval Rate",
                    value: `${kpis.approval_rate ?? 0}%`,
                    sub: "Human gate triggered",
                    color: "text-amber-300",
                    bg: "from-amber-950/50 to-slate-900",
                    border: "border-amber-500/30",
                    icon: <ShieldAlert className="h-4 w-4 text-amber-400" />,
                    trend: null
                  },
                  {
                    label: "Avg Latency",
                    value: `${kpis.avg_latency_ms ?? 0}ms`,
                    sub: `P95: ${kpis.p95_latency_ms ?? 0}ms`,
                    color: "text-cyan-300",
                    bg: "from-cyan-950/50 to-slate-900",
                    border: "border-cyan-500/30",
                    icon: <Zap className="h-4 w-4 text-cyan-400" />,
                    trend: null
                  },
                  {
                    label: "Unique Actors",
                    value: kpis.unique_actors ?? 0,
                    sub: `${kpis.active_sessions ?? 0} active sessions`,
                    color: "text-blue-300",
                    bg: "from-blue-950/50 to-slate-900",
                    border: "border-blue-500/30",
                    icon: <Fingerprint className="h-4 w-4 text-blue-400" />,
                    trend: null
                  }
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {cards.map((c, i) => (
                      <div key={i} className={`p-3.5 rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} space-y-1.5 relative overflow-hidden`}>
                        <div className="flex items-center justify-between">
                          {c.icon}
                          {c.trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />}
                          {c.trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />}
                        </div>
                        <div className={`text-xl font-bold ${c.color} font-mono leading-none`}>{c.value}</div>
                        <div className="text-[10px] text-slate-400 font-medium leading-tight">{c.label}</div>
                        <div className="text-[10px] text-slate-500">{c.sub}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Time-Series SVG Chart ── */}
              {analyticsData?.time_series && analyticsData.time_series.length > 0 && (() => {
                const series = analyticsData.time_series;
                const maxTotal = Math.max(...series.map(b => b.total), 1);
                const W = 800;
                const H = 120;
                const pad = { l: 32, r: 8, t: 8, b: 28 };
                const chartW = W - pad.l - pad.r;
                const chartH = H - pad.t - pad.b;
                const n = series.length;
                const xStep = chartW / Math.max(n - 1, 1);

                const pts = (key) => series.map((b, i) => {
                  const x = pad.l + i * xStep;
                  const y = pad.t + chartH - (b[key] / maxTotal) * chartH;
                  return `${x},${y}`;
                }).join(" ");

                const area = (key, fill) => {
                  const points = series.map((b, i) => ({
                    x: pad.l + i * xStep,
                    y: pad.t + chartH - (b[key] / maxTotal) * chartH
                  }));
                  const d = `M ${points[0].x},${pad.t + chartH} ` +
                    points.map(p => `L ${p.x},${p.y}`).join(" ") +
                    ` L ${points[points.length - 1].x},${pad.t + chartH} Z`;
                  return <path d={d} fill={fill} opacity="0.4" />;
                };

                // Tick labels — show every Nth label to avoid crowding
                const labelEvery = Math.max(1, Math.floor(n / 8));

                return (
                  <div className="rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                        Tool Call Volume — Last {analyticsWindow}h
                      </span>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-emerald-500/60 inline-block"></span>Success</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-rose-500/60 inline-block"></span>Blocked</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-violet-500/60 inline-block"></span>Total</span>
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:"120px"}}>
                      <defs>
                        <linearGradient id="areaTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="areaSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="areaBlocked" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal grid lines */}
                      {[0.25, 0.5, 0.75, 1].map(frac => (
                        <line
                          key={frac}
                          x1={pad.l} y1={pad.t + chartH - frac * chartH}
                          x2={W - pad.r} y2={pad.t + chartH - frac * chartH}
                          stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4"
                        />
                      ))}
                      {[0.25, 0.5, 0.75, 1].map(frac => (
                        <text
                          key={frac}
                          x={pad.l - 4}
                          y={pad.t + chartH - frac * chartH + 4}
                          textAnchor="end" fontSize="8" fill="#64748b"
                        >
                          {Math.round(frac * maxTotal)}
                        </text>
                      ))}

                      {/* Area fills */}
                      {area("total", "url(#areaTotal)")}
                      {area("success", "url(#areaSuccess)")}
                      {area("blocked", "url(#areaBlocked)")}

                      {/* Lines */}
                      <polyline points={pts("total")} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
                      <polyline points={pts("success")} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" />
                      <polyline points={pts("blocked")} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinejoin="round" />

                      {/* X-axis labels */}
                      {series.map((b, i) => i % labelEvery === 0 && (
                        <text
                          key={i}
                          x={pad.l + i * xStep}
                          y={H - 4}
                          textAnchor="middle" fontSize="8" fill="#94a3b8"
                        >
                          {b.label}
                        </text>
                      ))}
                    </svg>
                  </div>
                );
              })()}

              {/* ── Tool Breakdown + Role Breakdown Row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Tool Breakdown Table */}
                <div className="lg:col-span-3 rounded-xl bg-slate-950/70 border border-slate-800 overflow-hidden">
                  <div className="p-3.5 border-b border-slate-800 flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200">Tool Execution Breakdown</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800/60">
                          <th className="text-left px-4 py-2 text-slate-400 font-medium">Tool</th>
                          <th className="text-right px-3 py-2 text-slate-400 font-medium">Calls</th>
                          <th className="text-right px-3 py-2 text-slate-400 font-medium">Success</th>
                          <th className="text-right px-3 py-2 text-slate-400 font-medium">Avg Lat.</th>
                          <th className="text-right px-3 py-2 text-slate-400 font-medium">Blocked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData?.tools || []).slice(0, 8).map((t, i) => (
                          <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition">
                            <td className="px-4 py-2 font-mono text-slate-300 flex items-center gap-1.5">
                              {getToolIcon(t.tool_name)}
                              <span className="truncate max-w-[160px]">{t.tool_name}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-300 font-mono">{t.total_calls}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-mono font-medium ${
                                t.success_rate >= 90 ? "text-emerald-400" :
                                t.success_rate >= 70 ? "text-amber-400" : "text-rose-400"
                              }`}>{t.success_rate}%</span>
                            </td>
                            <td className="px-3 py-2 text-right text-cyan-400 font-mono">{t.avg_latency_ms}ms</td>
                            <td className="px-3 py-2 text-right text-rose-400 font-mono">{t.blocked_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Role Breakdown */}
                <div className="lg:col-span-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="p-3.5 border-b border-slate-800 flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Activity by Role</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {(analyticsData?.roles || []).map((r, i) => {
                      const roleColors = {
                        EMPLOYEE: { bar: "bg-blue-500", text: "text-blue-300", badge: "bg-blue-500/10 border-blue-500/30" },
                        MANAGER: { bar: "bg-amber-500", text: "text-amber-300", badge: "bg-amber-500/10 border-amber-500/30" },
                        ADMIN: { bar: "bg-rose-500", text: "text-rose-300", badge: "bg-rose-500/10 border-rose-500/30" }
                      };
                      const rc = roleColors[r.role] || roleColors.EMPLOYEE;
                      const maxCalls = Math.max(...(analyticsData?.roles || []).map(x => x.total_calls), 1);
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`font-semibold font-mono px-1.5 py-0.5 rounded border ${rc.badge} ${rc.text}`}>
                              {r.role}
                            </span>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="text-emerald-400 font-mono">{r.success_count}✓</span>
                              <span className="text-rose-400 font-mono">{r.blocked_count}✗</span>
                              <span className="text-slate-300 font-bold font-mono">{r.total_calls}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${rc.bar} transition-all duration-700`}
                              style={{ width: `${(r.total_calls / maxCalls) * 100}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500">Success rate: <span className={rc.text}>{r.success_rate}%</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Live Activity Feed ── */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 overflow-hidden">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200">Live Activity Feed</span>
                    <span className="text-[10px] text-slate-500">Latest tool executions</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    {(analyticsData?.activity || []).length} records
                  </span>
                </div>
                <div className="divide-y divide-slate-800/50 max-h-64 overflow-y-auto">
                  {(analyticsData?.activity || []).map((a, i) => {
                    const ts = new Date(a.timestamp);
                    const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/30 transition text-[11px]">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          a.was_blocked ? "bg-rose-500" :
                          a.was_approval_required ? "bg-amber-500 animate-pulse" :
                          a.success ? "bg-emerald-500" : "bg-slate-500"
                        }`} />
                        <span className="font-mono text-slate-500 w-20 shrink-0">{timeStr}</span>
                        <span className="flex items-center gap-1 flex-1 truncate">
                          {getToolIcon(a.tool_name)}
                          <code className="text-slate-300 truncate">{a.tool_name}</code>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${
                          a.role === "ADMIN" ? "bg-rose-500/10 text-rose-300 border-rose-500/30" :
                          a.role === "MANAGER" ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                          "bg-blue-500/10 text-blue-300 border-blue-500/30"
                        }`}>{a.user_role}</span>
                        <span className="text-cyan-400 font-mono shrink-0 w-16 text-right">{a.latency_ms}ms</span>
                        <span className={`font-bold shrink-0 ${
                          a.was_blocked ? "text-rose-400" :
                          a.was_approval_required ? "text-amber-400" :
                          a.success ? "text-emerald-400" : "text-slate-500"
                        }`}>
                          {a.was_blocked ? "BLOCKED" : a.was_approval_required ? "GATED" : a.success ? "OK" : "ERR"}
                        </span>
                      </div>
                    );
                  })}
                  {(analyticsData?.activity || []).length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No activity data yet. Run agent workflows to generate telemetry.
                    </div>
                  )}
                </div>
              </div>

            </div>{/* end scrollable body */}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between text-[11px] text-slate-500">
              <span>Telemetry: In-memory rolling 24h window · Thread-safe time-series buckets</span>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance & Audit Trail Slide-Out Modal */}
      {showGovernanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-rose-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    Safety & Governance Operations Hub
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      Phase 5 Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Role-Based Access Control (RBAC), Cryptographic Audit Ledger & Emergency Circuit Breaker
                  </p>
                </div>
              </div>
              <button
                id="close-governance-modal-btn"
                onClick={() => setShowGovernanceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Emergency Kill Switch Banner */}
            <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${
              circuitBreaker.is_active
                ? "bg-rose-950/60 border-rose-500/60 text-rose-100"
                : "bg-slate-950/60 border-slate-800 text-slate-300"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  circuitBreaker.is_active ? "bg-rose-500 text-white animate-bounce" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  <Power className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-xs block">
                    {circuitBreaker.is_active
                      ? "EMERGENCY FREEZE ENGAGED: Autonomous operations halted enterprise-wide"
                      : "Autonomous Execution Normal: All MCP tools and agent workflows authorized"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {circuitBreaker.is_active
                      ? `Reason: ${circuitBreaker.reason || "Administrative freeze"}`
                      : "System monitors role policies, rate limits, and human approval gates"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {circuitBreaker.is_active ? (
                  <button
                    id="circuit-breaker-toggle-btn"
                    onClick={() => handleToggleCircuitBreaker(false)}
                    disabled={togglingCircuitBreaker}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-md"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {togglingCircuitBreaker ? "Resuming..." : "Resume Autonomous Operations"}
                  </button>
                ) : (
                  <button
                    id="circuit-breaker-toggle-btn"
                    onClick={() => handleToggleCircuitBreaker(true)}
                    disabled={togglingCircuitBreaker}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-md shadow-rose-600/30"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {togglingCircuitBreaker ? "Freezing..." : "Engage Emergency Freeze"}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  id="tab-audit-trail-btn"
                  onClick={() => setGovernanceTab("audit")}
                  className={`px-4 py-2 border-b-2 text-xs font-semibold flex items-center gap-2 transition ${
                    governanceTab === "audit"
                      ? "border-rose-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Fingerprint className="h-3.5 w-3.5" />
                  Live Audit Trail ({auditLogs.length})
                </button>
                <button
                  id="tab-rbac-matrix-btn"
                  onClick={() => setGovernanceTab("policies")}
                  className={`px-4 py-2 border-b-2 text-xs font-semibold flex items-center gap-2 transition ${
                    governanceTab === "policies"
                      ? "border-rose-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  RBAC Policy Matrix ({policies.length} Tools)
                </button>
              </div>


              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={fetchGovernanceData}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition text-xs flex items-center gap-1"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className={`h-3 w-3 ${auditLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleClearAuditLogs}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-300 transition text-[11px]"
                  title="Reset audit trail"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            {/* Tab 1: Live Audit Trail */}
            {governanceTab === "audit" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-3 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search audit trail by tool, actor ID, or reason..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto">
                    {["ALL", "DENIED", "PENDING_APPROVAL", "APPROVED", "EXECUTED", "HIGH_RISK"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setAuditFilter(f)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                          auditFilter === f
                            ? "bg-rose-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {f.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit Records Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No audit records match the current filter.
                    </div>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isDenied = log.status === "DENIED" || log.status === "BLOCKED_CIRCUIT_BREAKER";
                      const isPending = log.status === "PENDING_APPROVAL";
                      const isApproved = log.status === "APPROVED" || log.status === "EXECUTED" || log.status === "GRANTED";

                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isDenied
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    : isPending
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                }`}
                              >
                                {log.status}
                              </span>
                              <span className="font-semibold text-white font-mono">{log.tool_name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">[{log.action_type}]</span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              <span>{log.iso_time ? log.iso_time.slice(11, 19) : "12:00:00"} UTC</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                                {log.actor_role}
                              </span>
                            </div>
                          </div>

                          <div className="text-slate-300 text-[11px] font-sans">
                            <p>{log.input_summary}</p>
                            {log.output_summary && (
                              <p className="text-slate-400 italic mt-0.5">Outcome: {log.output_summary}</p>
                            )}
                          </div>

                          {/* Cryptographic Hash Chaining Verification Badge */}
                          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <div className="flex items-center gap-1.5 truncate">
                              <Fingerprint className="h-3 w-3 text-rose-400 shrink-0" />
                              <span className="truncate">Hash: <code className="text-slate-400">{log.integrity_hash.slice(0, 16)}...</code></span>
                              {log.previous_hash && (
                                <span className="text-slate-600 hidden sm:inline truncate">
                                  &lt;= Chained from <code className="text-slate-500">{log.previous_hash.slice(0, 8)}</code>
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 shrink-0">{log.actor_id}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: RBAC Policy Matrix */}
            {governanceTab === "policies" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Enterprise Role-Based Access Control (RBAC)</span>
                    <span>Tools enforce minimum role hierarchy: Employee &lt; Manager &lt; Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono">
                      Active: {activeRole.role}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Tool Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Min Role Required</th>
                        <th className="p-3">Risk Level</th>
                        <th className="p-3">Supervisor Gate?</th>
                        <th className="p-3">Active Persona Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                      {policies.map((p) => {
                        const roleRank = { EMPLOYEE: 1, MANAGER: 2, ADMIN: 3 };
                        const isAllowed = (roleRank[activeRole.role] || 1) >= (roleRank[p.min_role] || 99);

                        return (
                          <tr key={p.tool_name} className="hover:bg-slate-900/40 transition">
                            <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                              {getToolIcon(p.tool_name)}
                              {p.tool_name}
                            </td>
                            <td className="p-3 text-slate-400 font-sans">{p.category}</td>
                            <td className="p-3">
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] ${
                                  p.min_role === "ADMIN"
                                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                    : p.min_role === "MANAGER"
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                }`}
                              >
                                {p.min_role}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  p.risk_level === "HIGH" || p.risk_level === "CRITICAL"
                                    ? "text-rose-400 bg-rose-950/40 border border-rose-500/40"
                                    : p.risk_level === "MEDIUM"
                                    ? "text-amber-400 bg-amber-950/40 border border-amber-500/40"
                                    : "text-emerald-400 bg-emerald-950/40 border border-emerald-500/40"
                                }`}
                              >
                                {p.risk_level}
                              </span>
                            </td>
                            <td className="p-3 font-sans">
                              {p.requires_approval ? (
                                <span className="text-amber-400 font-medium flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" /> Yes (Gate)
                                </span>
                              ) : (
                                <span className="text-slate-500">Auto</span>
                              )}
                            </td>
                            <td className="p-3 font-sans">
                              {isAllowed ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Authorized
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> Policy Blocked
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-emerald-400" />
                Audit records immutably chained with SHA-256 genesis verification
              </span>
              <button
                onClick={() => setShowGovernanceModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MCP Integrations Hub Slide-Out Modal */}
      {showMCPModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Server className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    Model Context Protocol (MCP) Hub
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Official Python SDK (v2.2.0)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Standardized enterprise tool servers executing over JSON-RPC 2.0 with RBAC guardrails
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMCPModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Server Health Cards Grid */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-b border-slate-800 bg-slate-950/40">
              {mcpServers.map((server) => (
                <div
                  key={server.server_id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-indigo-400" />
                      {server.display_name.replace(" MCP Server", "")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {server.latency_ms}ms
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>{server.category}</span>
                    <span className="text-indigo-300 font-bold">{server.total_tools} tools</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {server.tools.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono text-slate-400 border border-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Tool Sandbox Execution */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  Live MCP Tool Execution Sandbox (JSON-RPC 2.0 with RBAC)
                </span>
                <p className="text-[11px] text-slate-400">
                  Select an enterprise MCP tool to dispatch a JSON-RPC call as <strong className="text-white">{activeRole.title}</strong>:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Target MCP Tool
                    </label>
                    <select
                      value={selectedMCPTool}
                      onChange={(e) => setSelectedMCPTool(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      {mcpTools.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.server_name.replace(" MCP Server", "")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      JSON Arguments
                    </label>
                    <textarea
                      rows={5}
                      value={mcpToolArgs}
                      onChange={(e) => setMcpToolArgs(e.target.value)}
                      placeholder='{"channel": "#finance-ops"}'
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleExecuteMCPTool}
                    disabled={mcpExecuting}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/30"
                  >
                    {mcpExecuting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Execute via JSON-RPC 2.0 (as {activeRole.role})
                  </button>
                </div>

                {/* Output Inspection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    MCP Server JSON-RPC Response
                  </label>
                  <div className="h-56 rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-y-auto text-xs font-mono text-slate-300">
                    {mcpTestResult ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(mcpTestResult, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-500 italic">Select a tool and press execute to view the JSON-RPC response payload...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
              <span>All tool calls enforce Active Role policy and log to the SHA-256 Audit Trail</span>
              <button
                onClick={() => setShowMCPModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAG Knowledge Base Slide-Out Modal */}
      {showRAGModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Database className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    Enterprise Knowledge Base (RAG)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      3072-dim pgvector
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Indexed documents accessible by the autonomous operations agent</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRAGModal(false);
                  setRagSearchResults(null);
                  setRagSearchQuery("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vector Search Testing Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <form onSubmit={handleRAGSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={ragSearchQuery}
                    onChange={(e) => setRagSearchQuery(e.target.value)}
                    placeholder="Test vector similarity search (e.g. 'reconciliation policy', 'soc 2 compliance')..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ragSearching || !ragSearchQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                >
                  {ragSearching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Vector Query
                </button>
                <button
                  type="button"
                  onClick={() => setShowIngestForm(!showIngestForm)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ingest
                </button>
              </form>

              {/* Dynamic Ingestion Form */}
              {showIngestForm && (
                <form onSubmit={handleIngestDocument} className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5 text-xs">
                  <div className="font-semibold text-slate-200 text-xs">Ingest Custom Enterprise Document</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Document Title"
                      value={newDoc.title}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      required
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs"
                    />
                    <select
                      value={newDoc.department}
                      onChange={(e) => setNewDoc({ ...newDoc, department: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Document Content (will be embedded into 3072-dimensional vector space)..."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                    required
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIngestForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={ingesting}
                      className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1"
                    >
                      {ingesting && <RefreshCw className="h-3 w-3 animate-spin" />}
                      Index Document
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Document List or Search Results */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {ragSearchResults ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Semantic Similarity Results for &quot;{ragSearchQuery}&quot; ({ragSearchResults.length} matches)
                    </span>
                    <button
                      onClick={() => setRagSearchResults(null)}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Show All Documents
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {ragSearchResults.map((res) => (
                      <div
                        key={res.chunk_id}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white">{res.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            {Math.round(res.similarity_score * 100)}% Similarity
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {res.doc_id} • Department: {res.department}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{res.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    All Indexed Documents ({ragDocs.length})
                  </div>
                  {ragDocs.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white">{doc.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.department}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {doc.doc_id} • Embeddings: {doc.dimension}-dim
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{doc.preview}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
              <span>Vector Similarity: Cosine Distance &lt;=&gt; (pgvector / Embedded index)</span>
              <button
                onClick={() => setShowRAGModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
