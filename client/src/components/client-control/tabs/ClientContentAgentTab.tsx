"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { InlineAgentChat } from "./InlineAgentChat";
import { ClientMediaLibrary } from "./ClientMediaLibrary";
import ReactMarkdown from "react-markdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ContentIdea {
  id: string;
  title: string;
  type: string; // "post" | "reel" | "story" | "carousel" | "campaign"
  caption?: string;
  copy?: string;
  notes?: string;
  status: "idea" | "draft" | "approved" | "sent_to_team";
  createdAt: string;
  sentAt?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  post: "📸", reel: "🎬", story: "📱", carousel: "🎠", campaign: "🎯", blog: "📝", email: "✉️",
};

interface FlowDesigner {
  id: string;
  name: string;
  email?: string;
  role: string;
}

const STATUS_CONFIG: Record<string, { label: string; darkCls: string; lightCls: string }> = {
  idea: { label: "💡 Idea", darkCls: "bg-amber-500/20 text-amber-400", lightCls: "bg-amber-100 text-amber-700" },
  draft: { label: "✏️ Draft", darkCls: "bg-blue-500/20 text-blue-400", lightCls: "bg-blue-100 text-blue-700" },
  approved: { label: "✅ Approved", darkCls: "bg-emerald-500/20 text-emerald-400", lightCls: "bg-emerald-100 text-emerald-700" },
  sent_to_team: { label: "🚀 Sent", darkCls: "bg-purple-500/20 text-purple-400", lightCls: "bg-purple-100 text-purple-700" },
};

// Store content ideas in localStorage per client
const STORAGE_KEY = (clientId: string) => `2fly-content-ideas-${clientId}`;

function loadIdeas(clientId: string): ContentIdea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY(clientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIdeas(clientId: string, ideas: ContentIdea[]) {
  localStorage.setItem(STORAGE_KEY(clientId), JSON.stringify(ideas));
}

// Split multi-idea agent responses into separate ideas
function splitIntoIdeas(content: string): string[] {
  // Try splitting by ### headers
  const headerSplit = content.split(/\n(?=###\s)/).filter(s => s.trim());
  if (headerSplit.length > 1) return headerSplit;

  // Try splitting by numbered items (1. **Title**, 2. **Title**)
  const numbered = content.split(/\n(?=\d+\.\s+\*\*)/).filter(s => s.trim());
  if (numbered.length > 1) return numbered;

  // Try splitting by --- or *** dividers
  const divider = content.split(/\n(?:---|\*\*\*)\n/).filter(s => s.trim());
  if (divider.length > 1) return divider;

  // Single idea
  return [content];
}

export function ClientContentAgentTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [showChat, setShowChat] = useState(true); // Always start with chat open
  const [context, setContext] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "idea" | "draft" | "approved" | "sent_to_team">("all");
  const [section, setSection] = useState<"ideas" | "media">("ideas");
  const [designers, setDesigners] = useState<FlowDesigner[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<{ ideaId: string; designerId: string; priority: string; deadline: string } | null>(null);

  useEffect(() => { setIdeas(loadIdeas(clientId)); }, [clientId]);

  // Fetch team from Flow
  useEffect(() => {
    fetch(`${API}/api/flow/team`)
      .then(r => r.json())
      .then(d => setDesigners(d.team || []))
      .catch(() => {});
  }, []);

  // Fetch tab context for the agent
  useEffect(() => {
    fetch(`${API}/api/agents/context/${clientId}/content`)
      .then(r => r.json())
      .then(d => setContext(d.context || ""))
      .catch(() => {});
  }, [clientId]);

  const updateIdeas = useCallback((newIdeas: ContentIdea[]) => {
    setIdeas(newIdeas);
    saveIdeas(clientId, newIdeas);
  }, [clientId]);

  const handleAcceptFromChat = useCallback((content: string) => {
    // Try to split multi-idea responses (numbered lists, ### headers)
    const ideaBlocks = splitIntoIdeas(content);

    const newIdeas = ideaBlocks.map((block) => {
      const lines = block.split("\n").filter(l => l.trim());
      const titleLine = lines[0]?.replace(/^[#*\d.\-)\s]+/, "").replace(/\*\*/g, "").slice(0, 120) || "AI Content Idea";

      // Detect type from content
      let type = "post";
      const lower = block.toLowerCase();
      if (lower.includes("reel") || lower.includes("video")) type = "reel";
      else if (lower.includes("story") || lower.includes("stories")) type = "story";
      else if (lower.includes("carousel") || lower.includes("swipe")) type = "carousel";
      else if (lower.includes("campaign")) type = "campaign";

      return {
        id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: titleLine,
        type,
        copy: block,
        status: "idea" as const,
        createdAt: new Date().toISOString(),
      };
    });

    updateIdeas([...newIdeas, ...ideas]);
  }, [ideas, updateIdeas]);

  const updateStatus = useCallback((id: string, status: ContentIdea["status"]) => {
    updateIdeas(ideas.map(i => i.id === id ? { ...i, status, sentAt: status === "sent_to_team" ? new Date().toISOString() : i.sentAt } : i));
  }, [ideas, updateIdeas]);

  const deleteIdea = useCallback((id: string) => {
    if (window.confirm("Delete this content idea?")) {
      updateIdeas(ideas.filter(i => i.id !== id));
    }
  }, [ideas, updateIdeas]);

  const updateField = useCallback((id: string, field: keyof ContentIdea, value: string) => {
    updateIdeas(ideas.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, [ideas, updateIdeas]);

  const sendToTeam = useCallback(async (ideaId: string, designerId: string, priority: string, deadline: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    setSendingId(ideaId);
    try {
      const res = await fetch(`${API}/api/flow/send-to-team/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.title,
          caption: idea.copy || "",
          copyText: idea.copy || "",
          briefNotes: idea.notes || "",
          designerId,
          priority,
          deadline,
        }),
      });
      const data = await res.json();
      if (data.success || data.task) {
        updateStatus(ideaId, "sent_to_team");
        setSendModal(null);
      } else {
        alert(data.error || "Failed to send to team");
      }
    } catch (err) {
      alert("Failed to send to 2FLY Flow");
    } finally {
      setSendingId(null);
    }
  }, [ideas, clientId, updateStatus]);

  const filtered = filter === "all" ? ideas : ideas.filter(i => i.status === filter);

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  const counts = {
    all: ideas.length,
    idea: ideas.filter(i => i.status === "idea").length,
    draft: ideas.filter(i => i.status === "draft").length,
    approved: ideas.filter(i => i.status === "approved").length,
    sent_to_team: ideas.filter(i => i.status === "sent_to_team").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ minHeight: "600px" }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <div className="flex items-center gap-1">
          <button onClick={() => setSection("ideas")}
            className={`text-sm font-semibold px-3 py-1 rounded-lg ${section === "ideas" ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700" : isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            📝 Content ({ideas.length})
          </button>
          <button onClick={() => setSection("media")}
            className={`text-sm font-semibold px-3 py-1 rounded-lg ${section === "media" ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700" : isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            📁 Media
          </button>
        </div>
        <button
          onClick={() => setShowChat(v => !v)}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-all ${
            showChat
              ? isDark ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/40" : "bg-purple-100 text-purple-700"
              : isDark ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300" : "bg-blue-50 text-blue-700"
          }`}
        >
          {showChat ? "✕ Close Agent" : "🤖 Ask Agent"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Media Library */}
        {section === "media" && (
          <div className="flex-1 overflow-hidden">
            <ClientMediaLibrary clientId={clientId} />
          </div>
        )}

        {/* Ideas List */}
        {section === "ideas" && (<>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter Tabs */}
          <div className={`flex gap-1 px-4 py-2 ${isDark ? "bg-[#08080c]" : "bg-gray-50"}`}>
            {(["all", "idea", "draft", "approved", "sent_to_team"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1 rounded-lg ${
                  filter === f
                    ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                    : isDark ? "text-[#5a5040]" : "text-gray-500"
                }`}
              >
                {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f} ({counts[f]})
              </button>
            ))}
          </div>

          {/* Ideas */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filtered.length === 0 && (
              <div className={`text-center py-12 ${subCls}`}>
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-sm font-medium">No content ideas yet</p>
                <p className="text-xs mt-1">Ask the AI agent to generate content ideas, captions, or campaign plans.</p>
                <p className="text-xs mt-1">Click <strong>"✅ Save to Notes"</strong> on any response to create an idea here.</p>
              </div>
            )}

            {filtered.map(idea => {
              const expanded = expandedId === idea.id;
              const sc = STATUS_CONFIG[idea.status];
              return (
                <div key={idea.id} className={`rounded-xl border transition-all ${cardCls} ${expanded ? "ring-1 ring-emerald-500/30" : ""}`}>
                  {/* Header */}
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : idea.id)}>
                    <span className="text-lg">{TYPE_EMOJI[idea.type] || "📝"}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${textCls}`}>{idea.title}</div>
                      <div className={`text-xs mt-0.5 ${subCls}`}>
                        {new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {idea.sentAt && ` · Sent ${new Date(idea.sentAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? sc?.darkCls : sc?.lightCls}`}>
                      {sc?.label || idea.status}
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {expanded && (
                    <div className={`px-4 pb-4 border-t ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                      {/* Content Type */}
                      <div className="flex gap-2 mt-3 mb-3">
                        {Object.entries(TYPE_EMOJI).map(([type, emoji]) => (
                          <button key={type} onClick={() => updateField(idea.id, "type", type)}
                            className={`text-xs px-2 py-1 rounded-lg ${
                              idea.type === type
                                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                                : isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {emoji} {type}
                          </button>
                        ))}
                      </div>

                      {/* Copy/Content */}
                      {idea.copy && (
                        <div className={`rounded-lg p-3 text-sm mb-3 ${isDark ? "bg-[#08080c]" : "bg-gray-50"}`}>
                          <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
                            <ReactMarkdown>{idea.copy}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <textarea
                        value={idea.notes || ""}
                        onChange={(e) => updateField(idea.id, "notes", e.target.value)}
                        placeholder="Add notes for the team..."
                        rows={2}
                        className={`w-full text-sm rounded-lg px-3 py-2 resize-none mb-3 ${
                          isDark ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8] placeholder-[#3a3020]" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                        } border`}
                      />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {idea.status === "idea" && (
                          <button onClick={() => updateStatus(idea.id, "draft")}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                            ✏️ Move to Draft
                          </button>
                        )}
                        {(idea.status === "idea" || idea.status === "draft") && (
                          <button onClick={() => updateStatus(idea.id, "approved")}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                            ✅ Approve
                          </button>
                        )}
                        {idea.status !== "sent_to_team" && (
                          <button onClick={() => setSendModal({
                            ideaId: idea.id,
                            designerId: designers[0]?.id || "",
                            priority: "medium",
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                          })}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                            🚀 Send to Team
                          </button>
                        )}
                        <button onClick={() => deleteIdea(idea.id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50"}`}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Send to Team Modal */}
        {sendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className={`rounded-2xl border p-6 w-[420px] max-w-[90vw] ${cardCls}`}>
              <h3 className={`text-sm font-semibold mb-4 ${textCls}`}>🚀 Send to 2FLY Flow</h3>
              <p className={`text-xs mb-4 ${subCls}`}>
                This will create a production task in 2FLY Flow for your design team.
              </p>

              {/* Team Member Select */}
              <label className={`text-xs font-medium block mb-1 ${subCls}`}>Assign to</label>
              <select
                value={sendModal.designerId}
                onChange={(e) => setSendModal({ ...sendModal, designerId: e.target.value })}
                className={`w-full text-sm rounded-lg px-3 py-2 mb-3 border ${
                  isDark ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8]" : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                {designers.length === 0 && <option value="">Loading team...</option>}
                {designers.map(d => {
                  const emoji = d.role === "DESIGNER" ? "🎨" : "📱";
                  const roleLabel = d.role === "DESIGNER" ? "Designer" : "Social Media";
                  return (
                    <option key={d.id} value={d.id}>
                      {emoji} {d.name || d.email} ({roleLabel})
                    </option>
                  );
                })}
              </select>

              {/* Priority */}
              <label className={`text-xs font-medium block mb-1 ${subCls}`}>Priority</label>
              <div className="flex gap-2 mb-3">
                {["low", "medium", "high", "urgent"].map(p => (
                  <button key={p} onClick={() => setSendModal({ ...sendModal, priority: p })}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      sendModal.priority === p
                        ? p === "urgent" ? "bg-red-500/20 text-red-400"
                          : p === "high" ? "bg-orange-500/20 text-orange-400"
                          : p === "medium" ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                        : isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p === "urgent" ? "🔴" : p === "high" ? "🟠" : p === "medium" ? "🟡" : "🟢"} {p}
                  </button>
                ))}
              </div>

              {/* Deadline */}
              <label className={`text-xs font-medium block mb-1 ${subCls}`}>Deadline</label>
              <input
                type="date"
                value={sendModal.deadline}
                onChange={(e) => setSendModal({ ...sendModal, deadline: e.target.value })}
                className={`w-full text-sm rounded-lg px-3 py-2 mb-4 border ${
                  isDark ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8]" : "bg-white border-gray-200 text-gray-900"
                }`}
              />

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSendModal(null)}
                  className={`text-xs font-medium px-4 py-2 rounded-lg ${isDark ? "text-[#8a7e6d] hover:bg-[#1a1810]" : "text-gray-500 hover:bg-gray-100"}`}>
                  Cancel
                </button>
                <button
                  disabled={!sendModal.designerId || sendingId === sendModal.ideaId}
                  onClick={() => sendToTeam(sendModal.ideaId, sendModal.designerId, sendModal.priority, sendModal.deadline)}
                  className={`text-xs font-medium px-4 py-2 rounded-lg ${
                    isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  } disabled:opacity-50`}
                >
                  {sendingId === sendModal.ideaId ? "Sending..." : "🚀 Send to Flow"}
                </button>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* Agent Chat Side Panel */}
        {showChat && (
          <div className={`w-[400px] flex-shrink-0 border-l ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
            <InlineAgentChat
              clientId={clientId}
              tab="content"
              agent={{ id: "content-strategist", label: "Content Strategist", emoji: "🎨" }}
              context={context || `You are helping create content ideas for this client. Generate social media posts, reels, stories, carousels, or campaign ideas. Be specific with captions, hooks, and visual descriptions.`}
              onAccept={handleAcceptFromChat}
              placeholder="Generate content ideas, captions, campaigns..."
              emptyHint="Ask me to create content ideas, write captions, plan campaigns, or brainstorm hooks."
            />
          </div>
        )}
      </div>
    </div>
  );
}
