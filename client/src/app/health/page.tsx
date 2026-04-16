"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://api.2flyflow.com";
const RAILWAY_TOKEN = process.env.NEXT_PUBLIC_RAILWAY_TOKEN || "";

interface Check {
  name: string;
  status: "ok" | "warn" | "error" | "loading";
  message: string;
  ms?: number;
}

function StatusDot({ status }: { status: Check["status"] }) {
  const colors = { ok: "bg-green-500", warn: "bg-yellow-500", error: "bg-red-500", loading: "bg-gray-400 animate-pulse" };
  return <span className={`inline-block w-3 h-3 rounded-full ${colors[status]} mr-2`} />;
}

function CheckCard({ check }: { check: Check }) {
  const borderColors = { ok: "border-green-200", warn: "border-yellow-200", error: "border-red-200", loading: "border-gray-200" };
  const bgColors = { ok: "bg-green-50", warn: "bg-yellow-50", error: "bg-red-50", loading: "bg-gray-50" };
  return (
    <div className={`p-4 rounded-lg border ${borderColors[check.status]} ${bgColors[check.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <StatusDot status={check.status} />
          <span className="font-semibold text-sm text-gray-800">{check.name}</span>
        </div>
        {check.ms && <span className="text-xs text-gray-400">{check.ms}ms</span>}
      </div>
      <p className="text-xs text-gray-600 mt-1 ml-5">{check.message}</p>
    </div>
  );
}

async function runCheck(name: string, fn: () => Promise<string>): Promise<Check> {
  const start = Date.now();
  try {
    const message = await fn();
    return { name, status: "ok", message, ms: Date.now() - start };
  } catch (e: any) {
    return { name, status: "error", message: e.message || "Failed", ms: Date.now() - start };
  }
}

export default function HealthPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [redeploying, setRedeploying] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const runChecks = useCallback(async () => {
    const loading: Check[] = [
      { name: "API Health", status: "loading", message: "Checking..." },
      { name: "CORS Check", status: "loading", message: "Checking..." },
      { name: "Portal State API", status: "loading", message: "Checking..." },
      { name: "Client List API", status: "loading", message: "Checking..." },
      { name: "Response Time", status: "loading", message: "Checking..." },
    ];
    setChecks(loading);

    const results = await Promise.all([
      runCheck("API Health", async () => {
        const r = await fetch(`${API_BASE}/health`);
        const d = await r.json();
        if (!d.status || d.status !== "ok") throw new Error("Health check failed");
        return `Server OK — uptime confirmed`;
      }),
      runCheck("CORS Check", async () => {
        const r = await fetch(`${API_BASE}/health`, { mode: "cors" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return "CORS headers valid from this origin";
      }),
      runCheck("Portal State API", async () => {
        const r = await fetch(`${API_BASE}/api/agency/portal-state?clientId=test`, { credentials: "include" });
        if (r.status === 401) return "Auth required (endpoint exists ✓)";
        if (r.status === 404) throw new Error("Route not found — backend may need redeploy");
        return `Responding with ${r.status}`;
      }),
      runCheck("Client List API", async () => {
        const r = await fetch(`${API_BASE}/api/agency/clients`, { credentials: "include" });
        if (r.status === 401) return "Auth required (endpoint exists ✓)";
        if (r.status === 404) throw new Error("Route not found");
        return `Responding with ${r.status}`;
      }),
      runCheck("Response Time", async () => {
        const start = Date.now();
        await fetch(`${API_BASE}/health`);
        const ms = Date.now() - start;
        if (ms > 3000) throw new Error(`Slow: ${ms}ms — server may be cold starting`);
        if (ms > 1500) return `${ms}ms — slightly slow, watch for Railway cold starts`;
        return `${ms}ms — fast ✓`;
      }),
    ]);

    setChecks(results);
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runChecks, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, runChecks]);

  const allOk = checks.length > 0 && checks.every(c => c.status === "ok");
  const hasError = checks.some(c => c.status === "error");

  async function triggerRedeploy() {
    setRedeploying(true);
    try {
      // Trigger via Comet/manual — show instructions
      alert("Go to railway.app → soothing-adaptation → 2fly-client-portal → Redeploy\n\nOr use the Comet prompt from Boss.");
    } finally {
      setRedeploying(false);
    }
  }

  const overallStatus = checks.length === 0 ? "loading" : hasError ? "error" : allOk ? "ok" : "warn";
  const overallColors = { ok: "bg-green-100 border-green-300 text-green-800", error: "bg-red-100 border-red-300 text-red-800", warn: "bg-yellow-100 border-yellow-300 text-yellow-800", loading: "bg-gray-100 border-gray-300 text-gray-600" };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">2FLY Flow Health Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : "Running checks..."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs rounded border ${autoRefresh ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </button>
          <button
            onClick={runChecks}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded text-gray-700 hover:bg-gray-50"
          >
            Refresh Now
          </button>
          {hasError && (
            <button
              onClick={triggerRedeploy}
              disabled={redeploying}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {redeploying ? "..." : "Redeploy Railway"}
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border mb-6 ${overallColors[overallStatus]}`}>
        <div className="flex items-center gap-2">
          <StatusDot status={overallStatus} />
          <span className="font-bold">
            {overallStatus === "ok" && "All systems operational"}
            {overallStatus === "error" && "⚠️ Production errors detected — action needed"}
            {overallStatus === "warn" && "Some checks need attention"}
            {overallStatus === "loading" && "Running health checks..."}
          </span>
        </div>
        {hasError && (
          <p className="text-sm mt-2 ml-5">
            Clients are experiencing errors. Common fixes: Railway redeploy, CORS config, or HTTP2 settings.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {checks.map((check, i) => <CheckCard key={i} check={check} />)}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Common Fixes</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>CORS error:</strong> Add `https://2flyflow.com` to CORS origins in server.ts → push → Railway redeploy</li>
          <li>• <strong>HTTP2 error:</strong> Railway redeploy usually fixes this (cold start issue)</li>
          <li>• <strong>404 on routes:</strong> Latest code not deployed — Railway redeploy needed</li>
          <li>• <strong>Slow response:</strong> Railway cold start — first request after idle period</li>
        </ul>
      </div>
    </div>
  );
}
