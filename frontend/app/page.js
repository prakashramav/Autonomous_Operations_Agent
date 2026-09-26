"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Layers,
  FileText,
  Mail,
  Calendar,
  MessageSquare,
  Database
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROMPTS = [
  "Find the latest sales report, summarize the important changes, create a task for the finance team, and send the summary to the manager.",
  "Check my calendar for tomorrow afternoon and draft a briefing email for the executive sync.",
  "Search our company documents for Q3 compliance updates and list all action items.",
  "What is the system status and which tools are configured in this environment?"
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to **EnterpriseOps Agent**. I am your autonomous enterprise workflow assistant.\n\n" +
        "You can issue natural language operations requests across your enterprise stack. In **Phase 1 (Core Scaffold)**, end-to-end streaming between Next.js and FastAPI proxying Claude is active.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    model: "claude-3-7-sonnet-20250219",
    anthropicConfigured: false
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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
          model: data.model || "claude-3-7-sonnet-20250219",
          anthropicConfigured: data.anthropic_configured
        });
      } else {
        setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
      }
    } catch {
      setBackendStatus(prev => ({ ...prev, connected: false, checking: false }));
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          stream: true
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
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.delta) {
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
              // Non-JSON SSE event data or raw chunk
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between hidden md:flex">
        {/* Brand & Status */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                EnterpriseOps
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  v0.1
                </span>
              </h1>
              <p className="text-xs text-slate-400">Autonomous Operations Agent</p>
            </div>
          </div>

          {/* Backend Connection Badge */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-slate-500" />
              FastAPI Engine
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
                  ? "Online"
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Checklist & Tool Previews */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-slate-300">
          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" /> Architecture Phase
            </p>
            <div className="space-y-1.5">
              <div className="p-2 rounded bg-indigo-950/40 border border-indigo-700/50 flex items-start gap-2 text-indigo-200">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-white block">Phase 1: Core Scaffold</span>
                  <span className="text-[11px] text-indigo-300">Next.js + FastAPI + Claude SSE Stream</span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-500">
                <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0 mt-0.5 flex items-center justify-center text-[10px]">2</div>
                <div>
                  <span className="font-medium text-slate-400 block">Phase 2: LangGraph Brain</span>
                  <span className="text-[11px] text-slate-500">Planner, Memory & Retry Edges</span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-2 text-slate-500">
                <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0 mt-0.5 flex items-center justify-center text-[10px]">3-6</div>
                <div>
                  <span className="font-medium text-slate-400 block">MCP Tools & Governance</span>
                  <span className="text-[11px] text-slate-500">pgvector RAG + Human-in-the-Loop</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Operational Integrations
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-300">Google Drive</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-slate-300">Gmail</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] text-slate-300">Slack</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-300">Calendar</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[11px] text-slate-300">pgvector & Redis</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">DOCKER READY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Model info footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500">Active Model</span>
            <span className="font-mono text-indigo-400 font-medium">{backendStatus.model.replace("claude-", "")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Anthropic Key</span>
            <span className={backendStatus.anthropicConfigured ? "text-emerald-400" : "text-amber-400"}>
              {backendStatus.anthropicConfigured ? "Configured" : "Dev Simulation"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center md:hidden">
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white">Operations Console</h2>
              <p className="text-[11px] text-slate-400">End-to-End Enterprise Agent Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkBackendHealth}
              title="Refresh Backend Status"
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus.checking ? "animate-spin" : ""}`} />
            </button>
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${backendStatus.connected ? "bg-emerald-400" : "bg-rose-500"}`} />
              <span className="text-slate-300 font-medium">
                {backendStatus.connected ? "FastAPI Connected" : "Backend Disconnected"}
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
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-indigo-400" />
                  </div>
                </div>
              )}

              <div
                className={`relative group max-w-2xl rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none backdrop-blur-sm"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                  {isStreaming && msg.id.startsWith("assistant") && msg === messages[messages.length - 1] && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                  )}
                </div>

                <div className="mt-2 pt-1 border-t border-slate-700/30 flex items-center justify-between text-[10px] opacity-70">
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
                <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-slate-300">
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
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Suggested Operations:
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
        <div className="p-4 md:p-6 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
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
                placeholder="Give an operational directive (e.g. Find sales report, summarize changes, notify manager)..."
                rows={2}
                disabled={isStreaming}
                className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-sans"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center shrink-0 transition shadow-md shadow-indigo-600/30"
              >
                {isStreaming ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Enter</kbd> to execute, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Shift + Enter</kbd> for new line</span>
              <span>EnterpriseOps Agent • Phase 1 Core Scaffold</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
