"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Terminal,
  ShieldCheck,
  ShieldAlert,
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
  Play
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        "I am an autonomous enterprise operations assistant running on a multi-step **LangGraph Brain**, **Google Gemini**, **3072-dim pgvector RAG**, and 5 connected **Model Context Protocol (MCP) Servers**:\n\n" +
        "- **Google Drive MCP**: Search reports and read enterprise documents.\n" +
        "- **Enterprise Tasks MCP**: File Jira & Linear operational tickets.\n" +
        "- **Gmail MCP**: Draft and dispatch formal executive briefing emails.\n" +
        "- **Slack MCP**: Broadcast team announcements and operational alerts.\n" +
        "- **Google Calendar MCP**: Schedule reviews and verify team availability.\n\n" +
        "All sensitive external communications are protected by the **Supervisor Clearance Gate**.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

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

  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    model: "gemini-2.5-flash",
    geminiConfigured: false,
    phase: "Phase 4 (MCP + RAG + LangGraph)"
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, approvalLoading]);

  // Check backend health and capabilities
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
          phase: data.phase || "Phase 4 (MCP + RAG + LangGraph)"
        });
      } else {
        setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
      }
    } catch {
      setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
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

  useEffect(() => {
    checkBackendHealth();
    fetchRagDocs();
    fetchMCPData();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, []);

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

  // Execute MCP Tool directly in Sandbox
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
          arguments: parsedArgs
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMcpTestResult(data.result);
      } else {
        setMcpTestResult({ error: `Server error ${res.status}` });
      }
    } catch (err) {
      setMcpTestResult({ error: err.message });
    } finally {
      setMcpExecuting(false);
    }
  };

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
      timestamp: timeNow
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
          use_agent: true
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

  const handleApprovalDecision = async (messageId, sessionId, decision) => {
    if (!sessionId || approvalLoading) return;
    setApprovalLoading(true);

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
          decision: decision
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
              } else if (parsed.event === "approval_required") {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === messageId
                      ? { ...msg, pendingApproval: parsed.approval }
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
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Phase 4
                </span>
              </h1>
              <p className="text-xs text-slate-400">Autonomous Operations Agent</p>
            </div>
          </div>

          {/* Engine & RAG Status Badge */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              MCP + LangGraph
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendStatus.connected
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/80 animate-ping"
                    : "bg-amber-500"
                }`}
              />
              <span
                className={`text-[11px] font-medium ${
                  backendStatus.connected ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {backendStatus.checking
                  ? "Checking..."
                  : backendStatus.connected
                  ? "All 5 MCPs Online"
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Checklist & Features */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Quick Hub Launchers */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowMCPModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <Server className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition" />
                <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">5 MCPs</span>
              </div>
              <span className="font-semibold text-white block text-xs">MCP Hub</span>
              <span className="text-[10px] text-slate-400">15 JSON-RPC Tools</span>
            </button>

            <button
              onClick={() => setShowRAGModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-left transition group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <Database className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition" />
                <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-mono">{ragDocs.length} Docs</span>
              </div>
              <span className="font-semibold text-white block text-xs">RAG Store</span>
              <span className="text-[10px] text-slate-400">3072-dim pgvector</span>
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
              <div className="p-2.5 rounded-lg bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 flex items-start gap-2 text-emerald-100 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Phase 4: MCP Tool Integrations</span>
                  <span className="text-[11px] text-emerald-300 leading-tight block">
                    Gmail, Drive, Slack, Calendar, Jira MCP servers
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-500">
                <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0 mt-0.5 flex items-center justify-center text-[10px]">5-6</div>
                <div>
                  <span className="font-medium text-slate-400 block">Governance & Tracing</span>
                  <span className="text-[11px] text-slate-500">Audit logs & observability</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Active MCP Servers
            </p>
            <div className="space-y-1">
              {mcpServers.map((s) => (
                <div key={s.server_id} className="p-1.5 px-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300 font-medium truncate max-w-[130px]">{s.display_name.replace(" MCP Server", "")}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{s.total_tools} tools</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System info footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">MCP Protocol</span>
            <span className="font-mono text-emerald-400 font-medium">JSON-RPC 2.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Active Model</span>
            <span className="font-mono text-indigo-400 font-medium">{backendStatus.model}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Human Gate</span>
            <span className="text-emerald-400 font-medium">Active (interrupt/resume)</span>
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
                  MCP + LangGraph Agent
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Autonomous Workflow Execution across Gmail, Drive, Slack, Calendar & Jira</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowMCPModal(true)}
              className="px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-950/30 text-indigo-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5"
            >
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              <span>MCP Hub</span>
            </button>
            <button
              onClick={() => setShowRAGModal(true)}
              className="px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/30 text-cyan-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>RAG Docs</span>
            </button>
            <button
              onClick={checkBackendHealth}
              title="Refresh Engine Status"
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus.checking ? "animate-spin" : ""}`} />
            </button>
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${backendStatus.connected ? "bg-emerald-400 shadow-sm shadow-emerald-500/60" : "bg-rose-500"}`} />
              <span className="text-slate-300 font-medium text-[11px]">
                {backendStatus.connected ? "Agent Online" : "Engine Offline"}
              </span>
            </div>
          </div>
        </header>

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
                {/* User Message Text */}
                {msg.role === "user" && (
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
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
                            Multi-Step Operations Plan ({msg.plan.filter(s => s.status === "completed" || s.status === "rejected").length}/{msg.plan.length} Steps)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            SESSION: {msg.sessionId ? msg.sessionId.slice(0, 14) : "mcp-session"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {msg.plan.map((step) => {
                            const stepKey = `${msg.id}-step-${step.step_number}`;
                            const isExpanded = !!expandedSteps[stepKey];
                            const isPending = step.status === "pending";
                            const isInProgress = step.status === "in_progress";
                            const isWaitingApproval = step.status === "waiting_approval";
                            const isCompleted = step.status === "completed";
                            const isRejected = step.status === "rejected";
                            const mcpServer = getMCPServerForTool(step.tool);

                            // Parse RAG results if available
                            let ragData = null;
                            if (step.result && (step.tool.includes("document") || step.tool.includes("rag"))) {
                              try {
                                const parsed = JSON.parse(step.result);
                                if (parsed.documents && parsed.documents.length > 0) {
                                  ragData = parsed.documents[0];
                                }
                              } catch {}
                            }

                            return (
                              <div
                                key={step.step_number}
                                className={`rounded-lg border p-2.5 transition text-xs ${
                                  isWaitingApproval
                                    ? "bg-amber-950/20 border-amber-500/50 shadow-sm shadow-amber-500/10"
                                    : isInProgress
                                    ? "bg-cyan-950/20 border-cyan-500/40"
                                    : isCompleted
                                    ? "bg-slate-900/60 border-slate-800"
                                    : isRejected
                                    ? "bg-rose-950/20 border-rose-800/50 opacity-80"
                                    : "bg-slate-950/40 border-slate-800/40 opacity-70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                                    {ragData && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono">
                                        RAG: {Math.round(ragData.similarity_score * 100)}%
                                      </span>
                                    )}
                                    {step.is_sensitive && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
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

                                {/* Expanded Step Details with MCP Metadata */}
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
                                      <span className="text-slate-500">JSON-RPC 2.0 Transport</span>
                                    </div>
                                    {ragData && (
                                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-200 space-y-1 font-sans">
                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                          <span className="text-blue-400 font-bold">SOURCE: {ragData.doc_id}</span>
                                          <span className="text-cyan-300">{Math.round(ragData.similarity_score * 100)}% Similarity Score</span>
                                        </div>
                                        <p className="text-xs font-medium text-white">{ragData.title}</p>
                                        <p className="text-[11px] text-slate-300 line-clamp-3 italic">"{ragData.summary_content}"</p>
                                      </div>
                                    )}
                                    {step.tool_args && Object.keys(step.tool_args).length > 0 && (
                                      <div className="p-2 rounded bg-slate-950 border border-slate-800/80 overflow-x-auto text-[10px]">
                                        <span className="text-slate-500 font-bold block mb-0.5">Parameters:</span>
                                        <pre>{JSON.stringify(step.tool_args, null, 2)}</pre>
                                      </div>
                                    )}
                                    {step.result && !ragData && (
                                      <div className="p-2 rounded bg-slate-950 border border-emerald-900/40 text-emerald-300 overflow-x-auto text-[10px]">
                                        <span className="text-emerald-500 font-bold block mb-0.5">MCP Output:</span>
                                        <pre className="whitespace-pre-wrap">{step.result}</pre>
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
                                Supervisor Clearance Required
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
                            {msg.pendingApproval.parameters.channel && (
                              <div>
                                <span className="text-slate-500">Channel: </span>
                                <span className="text-emerald-300 font-mono">{msg.pendingApproval.parameters.channel}</span>
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

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => handleApprovalDecision(msg.id, msg.sessionId, "approved")}
                            disabled={approvalLoading}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/30"
                          >
                            {approvalLoading ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Approve & Execute via MCP
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(msg.id, msg.sessionId, "rejected")}
                            disabled={approvalLoading}
                            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-slate-300 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 transition"
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
                placeholder="Issue an operational directive across Gmail, Drive, Slack, Calendar & Jira..."
                rows={2}
                disabled={isStreaming || approvalLoading}
                className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-sans"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming || approvalLoading}
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
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Enter</kbd> to execute, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Shift + Enter</kbd> for new line</span>
              <span className="flex items-center gap-1.5">
                <Server className="h-3 w-3 text-emerald-400" />
                5 MCP Servers • LangGraph Agent • RAG pgvector
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* MCP Integrations Hub Slide-Out Modal */}
      {showMCPModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    Model Context Protocol (MCP) Hub
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      5 Servers Online
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Standardized JSON-RPC 2.0 tool endpoints connected to the autonomous agent</p>
                </div>
              </div>
              <button
                onClick={() => setShowMCPModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Server Grid */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  Connected MCP Servers ({mcpServers.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {mcpServers.map((s) => (
                    <div
                      key={s.server_id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white truncate">{s.display_name.replace(" MCP Server", "")}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {s.latency_ms}ms
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Category: {s.category}
                      </div>
                      <div className="text-[10px] text-indigo-300 font-mono">
                        {s.total_tools} tools registered
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MCP Tool Execution Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    MCP Tool Execution Sandbox
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">Live JSON-RPC 2.0 Dispatch</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Select Discovered MCP Tool:</label>
                    <select
                      value={selectedMCPTool}
                      onChange={(e) => {
                        setSelectedMCPTool(e.target.value);
                        // Provide default sample args
                        if (e.target.value === "drive_search_files") setMcpToolArgs('{"query": "sales report"}');
                        else if (e.target.value === "slack_list_channels") setMcpToolArgs('{}');
                        else if (e.target.value === "calendar_list_events") setMcpToolArgs('{}');
                        else if (e.target.value === "gmail_list_messages") setMcpToolArgs('{"query": "is:inbox", "max_results": 2}');
                        else if (e.target.value === "task_get_ticket") setMcpToolArgs('{"ticket_id": "TASK-FIN-8492"}');
                        else setMcpToolArgs('{}');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono"
                    >
                      {mcpTools.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.server_name.replace(" MCP Server", "")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">JSON-RPC Arguments:</label>
                    <textarea
                      value={mcpToolArgs}
                      onChange={(e) => setMcpToolArgs(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleExecuteMCPTool}
                    disabled={mcpExecuting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                  >
                    {mcpExecuting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Execute MCP Tool
                  </button>
                </div>

                {/* MCP Test Result Output */}
                {mcpTestResult && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-indigo-500/40 text-[11px] font-mono overflow-x-auto space-y-1">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                      MCP Response Payload:
                    </span>
                    <pre className="text-emerald-300 whitespace-pre-wrap">
                      {JSON.stringify(mcpTestResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
              <span>Standard: Model Context Protocol (MCP) 2.0 • In-process JSON-RPC</span>
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
          <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Database className="h-5 w-5" />
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
                      Semantic Similarity Results for "{ragSearchQuery}" ({ragSearchResults.length} matches)
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
