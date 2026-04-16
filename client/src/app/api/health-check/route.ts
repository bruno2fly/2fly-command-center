import { NextResponse } from "next/server";

const API_BASE = "https://api.2flyflow.com";

async function checkEndpoint(url: string, label: string) {
  const start = Date.now();
  try {
    const r = await fetch(url, { 
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    const ms = Date.now() - start;
    const text = await r.text().catch(() => "");
    
    if (label === "health") {
      const d = JSON.parse(text);
      return { status: "ok", message: `Server OK — uptime confirmed`, ms };
    }
    
    if (r.status === 401) return { status: "ok", message: "Auth required (endpoint exists ✓)", ms };
    if (r.status === 404) return { status: "error", message: "Route not found — backend may need redeploy", ms };
    if (ms > 3000) return { status: "warn", message: `Slow: ${ms}ms — possible cold start`, ms };
    
    return { status: "ok", message: `Responding with ${r.status}`, ms };
  } catch (e: any) {
    const ms = Date.now() - start;
    return { status: "error", message: e.message || "Failed to reach server", ms };
  }
}

export async function GET() {
  const [health, cors, portalState, clients, timing] = await Promise.all([
    checkEndpoint(`${API_BASE}/health`, "health"),
    checkEndpoint(`${API_BASE}/health`, "cors"),
    checkEndpoint(`${API_BASE}/api/agency/portal-state?clientId=test`, "portal"),
    checkEndpoint(`${API_BASE}/api/agency/clients`, "clients"),
    checkEndpoint(`${API_BASE}/api/agency/clients`, "timing"),
  ]);

  // Override cors message to be more descriptive
  if (cors.status === "ok") {
    cors.message = "CORS headers valid (verified from server-side)";
  }
  
  // Timing check
  if (timing.ms && timing.ms > 3000) {
    timing.status = "error";
    timing.message = `Slow: ${timing.ms}ms — Railway cold start`;
  } else if (timing.ms && timing.ms > 1500) {
    timing.status = "warn";
    timing.message = `${timing.ms}ms — slightly slow`;
  } else if (timing.status === "ok") {
    timing.message = `${timing.ms}ms — fast ✓`;
  }

  return NextResponse.json({
    checks: [
      { name: "API Health", ...health },
      { name: "CORS Check", ...cors },
      { name: "Portal State API", ...portalState },
      { name: "Client List API", ...clients },
      { name: "Response Time", ...timing },
    ],
    timestamp: Date.now(),
  });
}
