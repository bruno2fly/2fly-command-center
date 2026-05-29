"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──

interface WebsiteConfig {
  configured: boolean;
  id?: string;
  url?: string;
  gitRepo?: string;
  gitBranch?: string;
  hostingPlatform?: string;
  analyticsId?: string;
  status?: string;
  lastCheckedAt?: string;
  uptimePercent?: number;
  pagespeedScore?: number;
  seoScore?: number;
  notes?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  authorLogin?: string;
  avatar?: string;
  date: string;
  url: string;
}

interface PageSpeedScores {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

interface SeoAudits {
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  isHttps: boolean;
  hasViewport: boolean;
  hasCanonical: boolean;
  fontSizeOk: boolean;
  tapTargetsOk: boolean;
}

interface InsightItem {
  category: "performance" | "seo" | "ux" | "accessibility" | "content";
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  suggestedFix: string;
  fix?: string;
}

interface FixState {
  [index: number]: { loading?: boolean; jobId?: string; polling?: boolean; prUrl?: string; error?: string; summary?: string };
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

function ScoreCircle({ score, label, isDark }: { score: number; label: string; isDark: boolean }) {
  const color = score > 89 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const bgRing = score > 89 ? "stroke-emerald-400" : score >= 50 ? "stroke-amber-400" : "stroke-red-400";
  const bgTrack = isDark ? "stroke-white/5" : "stroke-gray-200";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" strokeWidth="6" className={bgTrack} />
          <circle
            cx="40" cy="40" r="36" fill="none" strokeWidth="6"
            className={bgRing}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>
          {score}
        </span>
      </div>
      <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}

function SeoCheckRow({ label, pass, isDark }: { label: string; pass: boolean; isDark: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
      <span className={`text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-700"}`}>{label}</span>
      <span className={`text-sm font-medium ${pass ? "text-emerald-400" : "text-red-400"}`}>
        {pass ? "✓ Pass" : "✗ Fail"}
      </span>
    </div>
  );
}

// ── Severity & Category Badges ──

function SeverityBadge({ severity, isDark }: { severity: InsightItem["severity"]; isDark: boolean }) {
  const cls =
    severity === "critical"
      ? isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
      : severity === "warning"
        ? isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
        : isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {severity}
    </span>
  );
}

function CategoryBadge({ category, isDark }: { category: InsightItem["category"]; isDark: boolean }) {
  const cls =
    category === "performance"
      ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
      : category === "seo"
        ? isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
        : category === "ux"
          ? isDark ? "bg-pink-500/10 text-pink-400" : "bg-pink-50 text-pink-600"
          : category === "accessibility"
            ? isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"
            : isDark ? "bg-orange-500/10 text-orange-400" : "bg-orange-50 text-orange-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {category}
    </span>
  );
}

// ── Setup Form ──

function SetupForm({ clientId, isDark, onSaved }: { clientId: string; isDark: boolean; onSaved: () => void }) {
  const [url, setUrl] = useState("");
  const [gitRepo, setGitRepo] = useState("");
  const [hostingPlatform, setHostingPlatform] = useState("");
  const [saving, setSaving] = useState(false);

  const cardBg = isDark ? "bg-[#0d0d12] border border-white/5 rounded-xl" : "bg-white border border-gray-200 shadow-sm rounded-xl";
  const inputBg = isDark
    ? "bg-white/5 border-white/10 text-[#c4b8a8] placeholder-gray-600 focus:border-emerald-500/50"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500";
  const btnPrimary = isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-blue-600 text-white hover:bg-blue-500";

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/website/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), gitRepo: gitRepo.trim() || null, hostingPlatform: hostingPlatform || null }),
      });
      onSaved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${cardBg} p-6`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
        Configure Website
      </h3>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        Add a website URL to start monitoring performance, SEO, and uptime.
      </p>
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Website URL *</label>
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>GitHub Repo (optional)</label>
          <input
            type="text" value={gitRepo} onChange={(e) => setGitRepo(e.target.value)}
            placeholder="owner/repo"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Hosting Platform (optional)</label>
          <select
            value={hostingPlatform} onChange={(e) => setHostingPlatform(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
          >
            <option value="">Select...</option>
            <option value="vercel">Vercel</option>
            <option value="netlify">Netlify</option>
            <option value="cloudflare">Cloudflare</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button onClick={handleSave} disabled={saving || !url.trim()} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${btnPrimary} disabled:opacity-50`}>
          {saving ? "Saving..." : "Save & Start Monitoring"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──

export function ClientWebsiteTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [scores, setScores] = useState<PageSpeedScores | null>(null);
  const [seoAudits, setSeoAudits] = useState<SeoAudits | null>(null);
  const [psLoading, setPsLoading] = useState(false);
  const [psError, setPsError] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsRepo, setCommitsRepo] = useState<string | null>(null);
  const [commitsBranch, setCommitsBranch] = useState<string | null>(null);
  const [gitOpen, setGitOpen] = useState(false);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [fixStates, setFixStates] = useState<FixState>({});
  const pollingRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // Dev Chat state
  const [devMessage, setDevMessage] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const [devJobId, setDevJobId] = useState<string | null>(null);
  const [devResult, setDevResult] = useState<{ prUrl?: string; summary?: string; error?: string } | null>(null);
  const [devHistory, setDevHistory] = useState<Array<{ jobId: string; message: string; status: string; prUrl?: string; branch?: string; summary?: string; error?: string; startedAt: string; completedAt?: string }>>([]);
  const devPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval);
      if (devPollingRef.current) clearInterval(devPollingRef.current);
    };
  }, []);

  const cardBg = isDark ? "bg-[#0d0d12] border border-white/5 rounded-xl" : "bg-white border border-gray-200 shadow-sm rounded-xl";
  const subtleText = isDark ? "text-gray-400" : "text-gray-500";
  const btnPrimary = isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-500";

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/website/${clientId}`);
      const data = await r.json();
      setConfig(data);
    } catch {
      setConfig({ configured: false });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch(`${API}/api/website/${clientId}/check`, { method: "POST" });
      const data = await r.json();
      setConfig((prev) => prev ? { ...prev, ...data, configured: true } : prev);
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }, [clientId]);

  const fetchPageSpeed = useCallback(async () => {
    setPsLoading(true);
    setPsError(null);
    try {
      const r = await fetch(`${API}/api/website/${clientId}/pagespeed`);
      const data = await r.json();
      if (data.error) {
        setPsError(data.error);
      } else {
        if (data.scores) setScores(data.scores);
        if (data.seoAudits) setSeoAudits(data.seoAudits);
      }
    } catch {
      setPsError("Failed to connect to PageSpeed API");
    } finally {
      setPsLoading(false);
    }
  }, [clientId]);

  const fetchCommits = useCallback(async () => {
    setCommitsLoading(true);
    try {
      const r = await fetch(`${API}/api/website/${clientId}/commits`);
      const data = await r.json();
      setCommits(data.commits || []);
      setCommitsRepo(data.repo || null);
      setCommitsBranch(data.branch || null);
    } catch {
      // ignore
    } finally {
      setCommitsLoading(false);
    }
  }, [clientId]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const r = await fetch(`${API}/api/website/${clientId}/insights`, { method: "POST" });
      if (!r.ok) {
        setInsightsError("Website analysis agent coming soon.");
        return;
      }
      const data = await r.json();
      setInsights(data.insights || []);
    } catch {
      setInsightsError("Website analysis agent coming soon.");
    } finally {
      setInsightsLoading(false);
    }
  }, [clientId]);

  const handleFix = useCallback(async (index: number, insight: InsightItem) => {
    setFixStates((prev) => ({ ...prev, [index]: { loading: true } }));
    try {
      const r = await fetch(`${API}/api/website/${clientId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insight: {
            category: insight.category,
            severity: insight.severity,
            title: insight.title,
            description: insight.description,
            fix: insight.suggestedFix || insight.fix || "",
          },
        }),
      });
      const data = await r.json();
      if (data.error) {
        setFixStates((prev) => ({ ...prev, [index]: { error: data.error } }));
        return;
      }
      const jobId = data.jobId as string;
      setFixStates((prev) => ({ ...prev, [index]: { loading: true, jobId, polling: true } }));

      // Poll for job status every 5 seconds
      const interval = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/website/${clientId}/fix/${jobId}`);
          const job = await pr.json();
          if (job.status === "done") {
            clearInterval(interval);
            delete pollingRefs.current[index];
            setFixStates((prev) => ({ ...prev, [index]: { prUrl: job.prUrl, summary: job.summary } }));
          } else if (job.status === "failed") {
            clearInterval(interval);
            delete pollingRefs.current[index];
            setFixStates((prev) => ({ ...prev, [index]: { error: job.error || "Fix failed" } }));
          }
          // status === "running" → keep polling
        } catch {
          // Network error during poll — keep trying
        }
      }, 5000);
      pollingRefs.current[index] = interval;
    } catch {
      setFixStates((prev) => ({ ...prev, [index]: { error: "Network error" } }));
    }
  }, [clientId]);

  const fetchDevHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/website/${clientId}/dev-history`);
      const data = await r.json();
      setDevHistory(data.history || []);
    } catch { /* ignore */ }
  }, [clientId]);

  const handleDevRequest = useCallback(async () => {
    if (!devMessage.trim()) return;
    setDevLoading(true);
    setDevResult(null);
    try {
      const r = await fetch(`${API}/api/website/${clientId}/dev-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: devMessage.trim() }),
      });
      const data = await r.json();
      if (data.error) {
        setDevResult({ error: data.error });
        setDevLoading(false);
        return;
      }
      const jobId = data.jobId as string;
      setDevJobId(jobId);

      const interval = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/website/${clientId}/dev-request/${jobId}`);
          const job = await pr.json();
          if (job.status === "done") {
            clearInterval(interval);
            devPollingRef.current = null;
            setDevResult({ prUrl: job.prUrl, summary: job.summary });
            setDevLoading(false);
            setDevJobId(null);
            setDevMessage("");
            fetchDevHistory();
          } else if (job.status === "failed") {
            clearInterval(interval);
            devPollingRef.current = null;
            setDevResult({ error: job.error || "Request failed" });
            setDevLoading(false);
            setDevJobId(null);
            fetchDevHistory();
          }
        } catch { /* keep polling */ }
      }, 5000);
      devPollingRef.current = interval;
    } catch {
      setDevResult({ error: "Network error" });
      setDevLoading(false);
    }
  }, [clientId, devMessage, fetchDevHistory]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Auto-fetch commits and config only — NOT pagespeed (Fix 1)
  useEffect(() => {
    if (config?.configured && config.url) {
      if (config.gitRepo) {
        fetchCommits();
        fetchDevHistory();
      }
    }
  }, [config?.configured, config?.url, config?.gitRepo, fetchCommits, fetchDevHistory]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? "border-emerald-400" : "border-blue-600"}`} />
        </div>
      </div>
    );
  }

  if (!config?.configured) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto mt-8">
          <div className="text-center mb-6">
            <span className="text-4xl">🌐</span>
            <h2 className={`text-xl font-semibold mt-2 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>No Website Configured</h2>
            <p className={`text-sm mt-1 ${subtleText}`}>Set up website monitoring to track performance and SEO.</p>
          </div>
          <SetupForm clientId={clientId} isDark={isDark} onSaved={fetchConfig} />
        </div>
      </div>
    );
  }

  const statusBadge = checking
    ? { emoji: "🟡", label: "Checking...", cls: isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600" }
    : config.status === "active"
      ? { emoji: "🟢", label: "Up", cls: isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600" }
      : config.status === "maintenance"
        ? { emoji: "🟡", label: "Maintenance", cls: isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600" }
        : { emoji: "🔴", label: "Down", cls: isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600" };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className={`${cardBg} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <a
                  href={config.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-lg font-semibold hover:underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                >
                  {config.url}
                </a>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>
                  {statusBadge.emoji} {statusBadge.label}
                </span>
              </div>
              <div className={`text-xs ${subtleText}`}>
                {config.lastCheckedAt ? `Last checked ${timeAgo(config.lastCheckedAt)}` : "Never checked"}
                {config.hostingPlatform && ` · ${config.hostingPlatform}`}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runCheck}
              disabled={checking}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${btnPrimary} disabled:opacity-50`}
            >
              {checking ? "Checking..." : "Run Check"}
            </button>
            <button
              onClick={fetchPageSpeed}
              disabled={psLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500"} disabled:opacity-50`}
            >
              {psLoading ? "Analyzing..." : "Run PageSpeed"}
            </button>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className={`${cardBg} p-6`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Performance Scores</h3>
        {psLoading && !scores ? (
          <div className="flex items-center justify-center py-8">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? "border-emerald-400" : "border-blue-600"}`} />
            <span className={`ml-3 text-sm ${subtleText}`}>Running PageSpeed analysis...</span>
          </div>
        ) : scores ? (
          <div className="flex flex-wrap justify-center gap-8">
            <ScoreCircle score={scores.performance} label="Performance" isDark={isDark} />
            <ScoreCircle score={scores.seo} label="SEO" isDark={isDark} />
            <ScoreCircle score={scores.accessibility} label="Accessibility" isDark={isDark} />
            <ScoreCircle score={scores.bestPractices} label="Best Practices" isDark={isDark} />
          </div>
        ) : (
          <p className={`text-sm text-center py-4 ${subtleText}`}>
            {psError ? (
              <span className="text-amber-400">⚠️ {psError}</span>
            ) : (
              <>Click &quot;Run PageSpeed&quot; to analyze your website.</>
            )}
          </p>
        )}
      </div>

      {/* SEO Overview */}
      {seoAudits && (
        <div className={`${cardBg} p-6`}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>SEO Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SeoCheckRow label="Meta Title" pass={seoAudits.hasMetaTitle} isDark={isDark} />
            <SeoCheckRow label="Meta Description" pass={seoAudits.hasMetaDescription} isDark={isDark} />
            <SeoCheckRow label="Robots.txt" pass={seoAudits.hasRobotsTxt} isDark={isDark} />
            <SeoCheckRow label="SSL Certificate (HTTPS)" pass={seoAudits.isHttps} isDark={isDark} />
            <SeoCheckRow label="Viewport Meta Tag" pass={seoAudits.hasViewport} isDark={isDark} />
            <SeoCheckRow label="Canonical URL" pass={seoAudits.hasCanonical} isDark={isDark} />
            <SeoCheckRow label="Font Size Legible" pass={seoAudits.fontSizeOk} isDark={isDark} />
            <SeoCheckRow label="Tap Targets Sized" pass={seoAudits.tapTargetsOk} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Website Insights (Fix 3) */}
      <div className={`${cardBg} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Website Insights</h3>
          <button
            onClick={fetchInsights}
            disabled={insightsLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500"} disabled:opacity-50`}
          >
            {insightsLoading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
        {insightsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? "border-emerald-400" : "border-blue-600"}`} />
            <span className={`ml-3 text-sm ${subtleText}`}>Running website analysis...</span>
          </div>
        ) : insightsError ? (
          <p className={`text-sm text-center py-4 ${subtleText}`}>{insightsError}</p>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const fs = fixStates[i];
              return (
                <div key={i} className={`p-4 rounded-lg ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={insight.category} isDark={isDark} />
                      <SeverityBadge severity={insight.severity} isDark={isDark} />
                    </div>
                    {config?.gitRepo && (
                      <div>
                        {fs?.loading ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                            Working... (~60s)
                          </span>
                        ) : fs?.prUrl ? (
                          <a
                            href={fs.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                          >
                            PR opened &rarr; View PR
                          </a>
                        ) : fs?.error ? (
                          <span className={`text-xs px-3 py-1 rounded-lg ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                            {fs.error}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleFix(i, insight)}
                            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-600 text-white hover:bg-purple-500"}`}
                          >
                            Fix It
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <h4 className={`text-sm font-semibold mb-1 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                    {insight.title}
                  </h4>
                  <p className={`text-xs mb-2 ${subtleText}`}>{insight.description}</p>
                  <div className={`text-xs px-3 py-2 rounded-md ${isDark ? "bg-emerald-500/5 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                    <span className="font-medium">Fix:</span> {insight.suggestedFix || insight.fix}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={`text-sm text-center py-4 ${subtleText}`}>Click &quot;Run Analysis&quot; to get AI-powered website insights.</p>
        )}
      </div>

      {/* Analytics (Fix 4) */}
      <div className={`${cardBg} p-6`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Analytics</h3>
        <p className={`text-sm mb-4 ${subtleText}`}>
          {config.analyticsId
            ? `Google Analytics integration coming soon. ID: ${config.analyticsId}`
            : "Add a GA4 Measurement ID in settings to enable analytics."}
        </p>
        <div className={`flex items-center justify-center h-32 rounded-lg border-2 border-dashed ${isDark ? "border-white/5 bg-white/[0.01]" : "border-gray-200 bg-gray-50"}`}>
          <span className={`text-xs ${subtleText}`}>Analytics data will appear here</span>
        </div>
      </div>

      {/* Dev Chat */}
      {config.gitRepo && (
        <div className={`${cardBg} p-6`}>
          <div className="mb-4">
            <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
              {"💻"} Dev Chat
            </h3>
            <p className={`text-xs mt-1 ${subtleText}`}>Ask for any website change — AI will code it and open a PR</p>
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <textarea
              value={devMessage}
              onChange={(e) => setDevMessage(e.target.value)}
              placeholder="e.g. Add a contact form to the homepage..."
              disabled={devLoading}
              rows={2}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm resize-none ${isDark ? "bg-white/5 border-white/10 text-[#c4b8a8] placeholder-gray-600 focus:border-emerald-500/50" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500"} disabled:opacity-50`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDevRequest(); } }}
            />
            <button
              onClick={handleDevRequest}
              disabled={devLoading || !devMessage.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors self-end ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500"} disabled:opacity-50`}
            >
              {devLoading ? "..." : "Send"}
            </button>
          </div>

          {/* Active job status */}
          {devLoading && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${isDark ? "bg-purple-500/10" : "bg-purple-50"}`}>
              <span className={`animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full ${isDark ? "text-purple-400" : "text-purple-600"}`} />
              <span className={`text-sm ${isDark ? "text-purple-400" : "text-purple-600"}`}>Working on it... (~60s)</span>
              <span className={`text-xs ml-auto truncate max-w-[200px] ${subtleText}`}>{devMessage}</span>
            </div>
          )}

          {/* Result */}
          {devResult && !devLoading && (
            <div className={`p-3 rounded-lg mb-4 ${devResult.error ? (isDark ? "bg-red-500/10" : "bg-red-50") : (isDark ? "bg-emerald-500/10" : "bg-emerald-50")}`}>
              {devResult.error ? (
                <span className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{devResult.error}</span>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{"✅"} PR Created</span>
                    <a
                      href={devResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs font-medium hover:underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      View PR &rarr;
                    </a>
                  </div>
                  {devResult.summary && (
                    <p className={`text-xs ${isDark ? "text-emerald-400/80" : "text-emerald-600"}`}>{devResult.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {devHistory.length > 0 && (
            <div>
              <h4 className={`text-xs font-medium mb-2 ${subtleText}`}>Recent Requests</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {devHistory.map((item) => (
                  <div key={item.jobId} className={`p-3 rounded-lg ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate flex-1 mr-2 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{item.message}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "done"
                            ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                            : item.status === "running"
                              ? isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
                              : isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                        }`}>
                          {item.status === "done" ? "done" : item.status === "running" ? "running" : "failed"}
                        </span>
                        {item.prUrl && (
                          <a
                            href={item.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs hover:underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                          >
                            PR
                          </a>
                        )}
                      </div>
                    </div>
                    {item.summary && <p className={`text-xs ${subtleText}`}>{item.summary}</p>}
                    <span className={`text-xs ${subtleText}`}>{timeAgo(item.startedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Git Activity (Fix 2 — collapsible, collapsed by default) */}
      {config.gitRepo && (
        <div className={`${cardBg} p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGitOpen((o) => !o)}
                className={`text-sm transition-transform ${gitOpen ? "rotate-0" : "-rotate-90"} ${isDark ? "text-gray-400" : "text-gray-500"}`}
                aria-label={gitOpen ? "Collapse git activity" : "Expand git activity"}
              >
                ▾
              </button>
              <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Git Activity</h3>
              {commits.length > 0 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                  {commits.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {commitsBranch && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                  {commitsBranch}
                </span>
              )}
              <a
                href={`https://github.com/${commitsRepo || config.gitRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs hover:underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
              >
                {config.gitRepo}
              </a>
            </div>
          </div>
          {gitOpen && (
            <div className="mt-4">
              {commitsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${isDark ? "border-emerald-400" : "border-blue-600"}`} />
                </div>
              ) : commits.length === 0 ? (
                <p className={`text-sm text-center py-4 ${subtleText}`}>No commits found or repo not accessible.</p>
              ) : (
                <div className="space-y-2">
                  {commits.map((c) => (
                    <div key={c.sha} className={`flex items-start gap-3 py-2 px-3 rounded-lg ${isDark ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-gray-50 hover:bg-gray-100"} transition-colors`}>
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.author} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-medium ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-600"}`}>
                          {c.author?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium truncate block hover:underline ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}
                        >
                          {c.message.split("\n")[0]}
                        </a>
                        <div className={`text-xs mt-0.5 ${subtleText}`}>
                          {c.authorLogin || c.author} · {timeAgo(c.date)} · <span className="font-mono">{c.sha.slice(0, 7)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings (always visible at bottom for editing) */}
      <div className={`${cardBg} p-6`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Website Settings</h3>
        <SettingsForm clientId={clientId} config={config} isDark={isDark} onSaved={fetchConfig} />
      </div>
    </div>
  );
}

// ── Settings Form (edit existing config) ──

function SettingsForm({ clientId, config, isDark, onSaved }: { clientId: string; config: WebsiteConfig; isDark: boolean; onSaved: () => void }) {
  const [url, setUrl] = useState(config.url || "");
  const [gitRepo, setGitRepo] = useState(config.gitRepo || "");
  const [gitBranch, setGitBranch] = useState(config.gitBranch || "main");
  const [hostingPlatform, setHostingPlatform] = useState(config.hostingPlatform || "");
  const [analyticsId, setAnalyticsId] = useState(config.analyticsId || "");
  const [notes, setNotes] = useState(config.notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const inputBg = isDark
    ? "bg-white/5 border-white/10 text-[#c4b8a8] placeholder-gray-600 focus:border-emerald-500/50"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500";
  const btnPrimary = isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-blue-600 text-white hover:bg-blue-500";

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/website/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          gitRepo: gitRepo.trim() || null,
          gitBranch: gitBranch.trim() || "main",
          hostingPlatform: hostingPlatform || null,
          analyticsId: analyticsId.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Website URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
      </div>
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>GitHub Repo</label>
        <input type="text" value={gitRepo} onChange={(e) => setGitRepo(e.target.value)} placeholder="owner/repo" className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
      </div>
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Branch</label>
        <input type="text" value={gitBranch} onChange={(e) => setGitBranch(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
      </div>
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Hosting Platform</label>
        <select value={hostingPlatform} onChange={(e) => setHostingPlatform(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}>
          <option value="">Select...</option>
          <option value="vercel">Vercel</option>
          <option value="netlify">Netlify</option>
          <option value="cloudflare">Cloudflare</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>GA4 Measurement ID</label>
        <input type="text" value={analyticsId} onChange={(e) => setAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
      </div>
      <div className="sm:col-span-2">
        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
      </div>
      <div className="sm:col-span-2">
        <button onClick={handleSave} disabled={saving || !url.trim()} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${btnPrimary} disabled:opacity-50`}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
