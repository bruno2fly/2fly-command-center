"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Diagnosis = { issue: string; severity: "critical" | "high" | "medium" | "low"; detail: string };
type Goal = { goal: string; metric: string; target: string };
type Action = { action: string; owner: string; deadline: string; status: "pending" | "in_progress" | "done"; priority: "urgent" | "high" | "normal" };
type Campaign = { name: string; platform: string; budget: string; offer: string; audience: string; status: "planned" | "live" | "paused" | "completed" };

type Strategy = {
  id: string;
  clientId: string;
  month: string;
  title: string;
  status: string;
  summary: string | null;
  diagnosis: string | null;
  goals: string | null;
  actions: string | null;
  campaigns: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseJSON<T>(s: string | null): T[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

function severityColor(s: string, isDark: boolean) {
  switch (s) {
    case "critical": return isDark ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-100 text-red-700 border-red-200";
    case "high": return isDark ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-orange-100 text-orange-700 border-orange-200";
    case "medium": return isDark ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "low": return isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-green-100 text-green-700 border-green-200";
    default: return isDark ? "bg-gray-500/20 text-gray-400 border-gray-500/30" : "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function priorityColor(p: string, isDark: boolean) {
  switch (p) {
    case "urgent": return isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700";
    case "high": return isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-700";
    default: return isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600";
  }
}

function statusBadge(s: string, isDark: boolean) {
  const map: Record<string, string> = {
    draft: isDark ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-600",
    active: isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-green-100 text-green-700",
    completed: isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700",
    archived: isDark ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-500",
    planned: isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700",
    live: isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-green-100 text-green-700",
    paused: isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700",
  };
  return map[s] || map.draft;
}

function campaignStatusBadge(s: string, isDark: boolean) {
  return statusBadge(s, isDark);
}

function platformIcon(p: string) {
  switch (p.toLowerCase()) {
    case "meta": return "📘";
    case "google": return "🔍";
    case "instagram": return "📸";
    case "tiktok": return "🎵";
    case "email": return "📧";
    case "meta + email": return "📘📧";
    default: return "📣";
  }
}

function actionStatusIcon(s: string) {
  switch (s) {
    case "done": return "✅";
    case "in_progress": return "🔄";
    default: return "⬜";
  }
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

type Props = { clientId: string };

export function ClientStrategyTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["diagnosis", "goals", "actions", "campaigns", "notes"]));
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/strategies/${clientId}`);
      const data = await res.json();
      setStrategies(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch (err) {
      console.error("Failed to fetch strategies:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedId]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  const selected = strategies.find((s) => s.id === selectedId);
  const diagnosis = parseJSON<Diagnosis>(selected?.diagnosis ?? null);
  const goals = parseJSON<Goal>(selected?.goals ?? null);
  const actions = parseJSON<Action>(selected?.actions ?? null);
  const campaigns = parseJSON<Campaign>(selected?.campaigns ?? null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleActionStatus = async (idx: number) => {
    if (!selected) return;
    const updated = [...actions];
    const current = updated[idx].status;
    updated[idx].status = current === "done" ? "pending" : current === "pending" ? "in_progress" : "done";
    try {
      await fetch(`${API}/api/strategies/${clientId}/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: updated }),
      });
      fetchStrategies();
    } catch (err) {
      console.error(err);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    try {
      await fetch(`${API}/api/strategies/${clientId}/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
      setEditingNotes(false);
      fetchStrategies();
    } catch (err) {
      console.error(err);
    }
  };

  const createStrategy = async () => {
    if (!newMonth || !newTitle) return;
    try {
      const res = await fetch(`${API}/api/strategies/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: newMonth, title: newTitle, status: "draft" }),
      });
      const created = await res.json();
      setSelectedId(created.id);
      setShowCreate(false);
      setNewMonth("");
      setNewTitle("");
      fetchStrategies();
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!selected) return;
    try {
      await fetch(`${API}/api/strategies/${clientId}/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchStrategies();
    } catch (err) {
      console.error(err);
    }
  };

  // Card wrapper
  const Card = ({ title, icon, id, children, count }: { title: string; icon: string; id: string; children: React.ReactNode; count?: number }) => (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"}`}>
      <button
        onClick={() => toggleSection(id)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{title}</h3>
          {count !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-500"}`}>{count}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${expandedSections.has(id) ? "rotate-180" : ""} ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expandedSections.has(id) && (
        <div className={`border-t px-5 py-4 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>{children}</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center p-12 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
        Loading strategies...
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-auto p-6 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header: Month selector + New button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {strategies.length > 0 ? (
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className={`text-sm font-medium rounded-lg px-3 py-2 border ${
                  isDark
                    ? "bg-[#0a0a0e] border-[#1a1810] text-[#c4b8a8]"
                    : "bg-white border-gray-200 text-gray-800"
                }`}
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatMonth(s.month)} — {s.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No strategies yet</span>
            )}
            {selected && (
              <select
                value={selected.status}
                onChange={(e) => updateStatus(e.target.value)}
                className={`text-xs font-medium rounded-full px-3 py-1 border-0 ${statusBadge(selected.status, isDark)}`}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            + New Strategy
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className={`rounded-xl border p-5 space-y-3 ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"}`}>
            <div className="flex gap-3">
              <input
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className={`text-sm rounded-lg px-3 py-2 border flex-shrink-0 ${
                  isDark ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8]" : "bg-white border-gray-200 text-gray-800"
                }`}
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Strategy title..."
                className={`text-sm rounded-lg px-3 py-2 border flex-1 ${
                  isDark ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]" : "bg-white border-gray-200 text-gray-800"
                }`}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={createStrategy} className={`text-sm px-4 py-1.5 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-600 text-white"}`}>
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className={`text-sm px-4 py-1.5 rounded-lg ${isDark ? "text-[#8a7e6d] hover:text-[#c4b8a8]" : "text-gray-500 hover:text-gray-700"}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selected && !showCreate && (
          <div className={`text-center py-16 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-sm">No strategy for this client yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className={`mt-4 text-sm font-medium px-4 py-2 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-600 text-white"}`}
            >
              Create First Strategy
            </button>
          </div>
        )}

        {selected && (
          <>
            {/* Summary */}
            {selected.summary && (
              <div className={`rounded-xl border p-5 ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"}`}>
                <p className={`text-sm leading-relaxed ${isDark ? "text-[#a89880]" : "text-gray-600"}`}>{selected.summary}</p>
              </div>
            )}

            {/* Diagnosis */}
            <Card title="Diagnosis" icon="🔍" id="diagnosis" count={diagnosis.length}>
              {diagnosis.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No issues identified.</p>
              ) : (
                <div className="space-y-3">
                  {diagnosis.map((d, i) => (
                    <div key={i} className={`rounded-lg border p-4 ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${severityColor(d.severity, isDark)}`}>
                          {d.severity}
                        </span>
                        <span className={`text-sm font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{d.issue}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>{d.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Goals */}
            <Card title="Goals" icon="🎯" id="goals" count={goals.length}>
              {goals.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No goals set.</p>
              ) : (
                <div className={`rounded-lg border overflow-hidden ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? "bg-[#0c0c10]" : "bg-gray-50"}>
                        <th className={`text-left px-4 py-2.5 font-medium ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>Goal</th>
                        <th className={`text-left px-4 py-2.5 font-medium ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>Metric</th>
                        <th className={`text-left px-4 py-2.5 font-medium ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.map((g, i) => (
                        <tr key={i} className={`border-t ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                          <td className={`px-4 py-3 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{g.goal}</td>
                          <td className={`px-4 py-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>{g.metric}</td>
                          <td className={`px-4 py-3 ${isDark ? "text-[#a89880]" : "text-gray-700"}`}>{g.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Action Plan */}
            <Card title="Action Plan" icon="⚡" id="actions" count={actions.length}>
              {actions.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No actions planned.</p>
              ) : (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div
                      key={i}
                      onClick={() => toggleActionStatus(i)}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        a.status === "done"
                          ? isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-green-200 bg-green-50"
                          : isDark ? "border-[#1a1810] bg-[#08080c] hover:bg-[#0c0c10]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base mt-0.5 flex-shrink-0">{actionStatusIcon(a.status)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${a.status === "done" ? "line-through" : ""} ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                            {a.action}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColor(a.priority, isDark)}`}>{a.priority}</span>
                        </div>
                        <div className={`flex items-center gap-3 mt-1 text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                          <span>👤 {a.owner}</span>
                          <span>📅 {a.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                        {actions.filter((a) => a.status === "done").length}/{actions.length} completed
                      </span>
                      <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                        {Math.round((actions.filter((a) => a.status === "done").length / actions.length) * 100)}%
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-[#1a1810]" : "bg-gray-200"}`}>
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(actions.filter((a) => a.status === "done").length / actions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Campaigns */}
            <Card title="Campaigns" icon="📣" id="campaigns" count={campaigns.length}>
              {campaigns.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No campaigns planned.</p>
              ) : (
                <div className="grid gap-3">
                  {campaigns.map((c, i) => (
                    <div key={i} className={`rounded-lg border p-4 ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{platformIcon(c.platform)}</span>
                          <span className={`text-sm font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{c.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${campaignStatusBadge(c.status, isDark)}`}>{c.status}</span>
                      </div>
                      <div className={`grid grid-cols-3 gap-3 text-xs ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
                        <div>
                          <span className={`block font-medium mb-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>Budget</span>
                          {c.budget}
                        </div>
                        <div className="col-span-2">
                          <span className={`block font-medium mb-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>Audience</span>
                          {c.audience}
                        </div>
                      </div>
                      <div className={`mt-2 text-xs ${isDark ? "text-[#a89880]" : "text-gray-600"}`}>
                        <span className={`font-medium ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>Offer: </span>
                        {c.offer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card title="Notes" icon="📝" id="notes">
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={12}
                    className={`w-full text-sm rounded-lg p-3 border font-mono ${
                      isDark
                        ? "bg-[#08080c] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]"
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveNotes} className={`text-sm px-4 py-1.5 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-600 text-white"}`}>
                      Save
                    </button>
                    <button onClick={() => setEditingNotes(false)} className={`text-sm px-4 py-1.5 rounded-lg ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {selected.notes ? (
                    <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
                      <ReactMarkdown>{selected.notes}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>No notes yet.</p>
                  )}
                  <button
                    onClick={() => { setNotesText(selected.notes || ""); setEditingNotes(true); }}
                    className={`mt-3 text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-[#1a1810] text-[#8a7e6d] hover:text-[#c4b8a8]" : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}
                  >
                    ✏️ Edit Notes
                  </button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
