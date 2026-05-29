import { Router, Request, Response } from "express";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = Router();

// ── Demo Request Handler (MUST be before /:clientId routes) ──
router.post("/demo-request", async (req: Request, res: Response) => {
  try {
    const { name, email, agency, clients, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });
    const demo = { name, email, agency, clients, message, timestamp: new Date().toISOString() };
    if (!(globalThis as any).__demoRequests) (globalThis as any).__demoRequests = [];
    (globalThis as any).__demoRequests.push(demo);
    console.log("🚀 NEW DEMO REQUEST:", JSON.stringify(demo));
    res.json({ success: true, message: "Demo request received!" });
  } catch (err: unknown) {
    console.error("Demo request error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});
router.get("/demo-requests", async (_req: Request, res: Response) => {
  res.json((globalThis as any).__demoRequests || []);
});

// In-memory store for fix attempts
const fixHistory: Array<{
  clientId: string;
  insight: { category: string; severity: string; title: string; description: string; fix: string };
  status: "success" | "error";
  prUrl?: string;
  branch?: string;
  summary?: string;
  error?: string;
  timestamp: string;
}> = [];

// In-memory store for fix jobs (async job queue)
interface FixJob {
  id: string;
  clientId: string;
  insight: { category: string; severity: string; title: string; description: string; fix: string };
  status: "running" | "done" | "failed";
  prUrl?: string;
  branch?: string;
  summary?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
const fixJobs = new Map<string, FixJob>();

// In-memory store for dev request jobs
interface DevJob {
  id: string;
  clientId: string;
  message: string;
  status: "running" | "done" | "failed";
  prUrl?: string;
  branch?: string;
  summary?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
const devJobs = new Map<string, DevJob>();

// GET /api/website/:clientId — get website config
router.get("/:clientId", async (req: Request, res: Response) => {
  try {
    const config = await prisma.websiteConfig.findUnique({
      where: { clientId: req.params.clientId },
    });
    if (!config) return res.json({ configured: false });
    res.json({ configured: true, ...config });
  } catch (err: unknown) {
    console.error("GET /api/website/:clientId error:", err);
    res.status(500).json({ error: "Failed to fetch website config" });
  }
});

// POST /api/website/:clientId — create/update website config
router.post("/:clientId", async (req: Request, res: Response) => {
  try {
    const { url, gitRepo, gitBranch, hostingPlatform, analyticsId, notes } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const config = await prisma.websiteConfig.upsert({
      where: { clientId: req.params.clientId },
      update: { url, gitRepo, gitBranch, hostingPlatform, analyticsId, notes },
      create: {
        clientId: req.params.clientId,
        url,
        gitRepo: gitRepo || null,
        gitBranch: gitBranch || "main",
        hostingPlatform: hostingPlatform || null,
        analyticsId: analyticsId || null,
        notes: notes || null,
      },
    });
    res.json(config);
  } catch (err: unknown) {
    console.error("POST /api/website/:clientId error:", err);
    res.status(500).json({ error: "Failed to save website config" });
  }
});

// POST /api/website/:clientId/check — run uptime check
router.post("/:clientId/check", async (req: Request, res: Response) => {
  try {
    const config = await prisma.websiteConfig.findUnique({
      where: { clientId: req.params.clientId },
    });
    if (!config) return res.status(404).json({ error: "Website not configured" });

    let status = "active";
    try {
      const r = await fetch(config.url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
      if (!r.ok) status = "down";
    } catch {
      status = "down";
    }

    const updated = await prisma.websiteConfig.update({
      where: { clientId: req.params.clientId },
      data: { status, lastCheckedAt: new Date() },
    });
    res.json(updated);
  } catch (err: unknown) {
    console.error("POST /api/website/:clientId/check error:", err);
    res.status(500).json({ error: "Failed to check website" });
  }
});

// GET /api/website/:clientId/commits — fetch recent git commits
router.get("/:clientId/commits", async (req: Request, res: Response) => {
  try {
    const config = await prisma.websiteConfig.findUnique({
      where: { clientId: req.params.clientId },
    });
    if (!config?.gitRepo) return res.json({ commits: [] });

    const r = await fetch(
      `https://api.github.com/repos/${config.gitRepo}/commits?sha=${config.gitBranch || "main"}&per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "2fly-command-center",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
        },
      }
    );
    if (!r.ok) return res.json({ commits: [], error: `GitHub ${r.status}` });
    const data = await r.json();

    const commits = (data as Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
      author?: { login: string; avatar_url: string };
      html_url: string;
    }>).map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      authorLogin: c.author?.login,
      avatar: c.author?.avatar_url,
      date: c.commit.author.date,
      url: c.html_url,
    }));

    res.json({ commits, repo: config.gitRepo, branch: config.gitBranch });
  } catch (err: unknown) {
    console.error("GET /api/website/:clientId/commits error:", err);
    res.json({ commits: [] });
  }
});

// GET /api/website/:clientId/pagespeed — fetch PageSpeed Insights
router.get("/:clientId/pagespeed", async (req: Request, res: Response) => {
  try {
    const config = await prisma.websiteConfig.findUnique({
      where: { clientId: req.params.clientId },
    });
    if (!config) return res.status(404).json({ error: "Website not configured" });

    const strategy = (req.query.strategy as string) || "mobile";
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(config.url)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices`;
    if (process.env.PAGESPEED_API_KEY) {
      apiUrl += `&key=${encodeURIComponent(process.env.PAGESPEED_API_KEY)}`;
    }

    const r = await fetch(apiUrl);

    // Fallback analysis when PageSpeed returns 429
    if (r.status === 429) {
      const fallback = await runFallbackAnalysis(config.url);
      await prisma.websiteConfig.update({
        where: { clientId: req.params.clientId },
        data: {
          pagespeedScore: fallback.scores.performance,
          seoScore: fallback.scores.seo,
          lastCheckedAt: new Date(),
        },
      });
      return res.json({ ...fallback, strategy, source: "fallback" });
    }

    if (!r.ok) {
      const errBody = await r.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = errBody?.error?.message || `PageSpeed API returned ${r.status}`;
      return res.status(200).json({ error: msg });
    }
    const data = await r.json() as {
      lighthouseResult?: {
        categories?: Record<string, { score?: number }>;
        audits?: Record<string, {
          score?: number | null;
          title?: string;
          description?: string;
          displayValue?: string;
          details?: { items?: Array<{ description?: string }> };
        }>;
      };
    };

    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
    };

    // Extract SEO audit details
    const seoAudits = {
      hasMetaTitle: audits["document-title"]?.score === 1,
      hasMetaDescription: audits["meta-description"]?.score === 1,
      hasSitemap: audits["http-status-code"]?.score === 1,
      hasRobotsTxt: audits["robots-txt"]?.score === 1,
      isHttps: audits["is-on-https"]?.score === 1,
      hasViewport: audits["viewport"]?.score === 1,
      hasHreflang: audits["hreflang"]?.score === 1,
      hasCanonical: audits["canonical"]?.score === 1,
      fontSizeOk: audits["font-size"]?.score === 1,
      tapTargetsOk: audits["tap-targets"]?.score === 1,
    };

    // Update stored scores
    await prisma.websiteConfig.update({
      where: { clientId: req.params.clientId },
      data: {
        pagespeedScore: scores.performance,
        seoScore: scores.seo,
        lastCheckedAt: new Date(),
      },
    });

    res.json({ scores, seoAudits, strategy, source: "pagespeed" });
  } catch (err: unknown) {
    console.error("GET /api/website/:clientId/pagespeed error:", err);
    res.status(500).json({ error: "Failed to fetch PageSpeed data" });
  }
});

// Fallback analysis when PageSpeed API is rate-limited
async function runFallbackAnalysis(url: string) {
  const start = Date.now();
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const responseTime = Date.now() - start;
  const html = await r.text();
  const contentLength = r.headers.get("content-length")
    ? parseInt(r.headers.get("content-length")!, 10)
    : html.length;

  const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html);
  const hasMetaDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const isHttps = url.startsWith("https");
  const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);

  // Count images and images missing alt
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsMissingAlt = imgTags.filter(
    (tag) => !/ alt=["'][^"']+["']/i.test(tag)
  ).length;
  const totalImages = imgTags.length;
  const altCoverage = totalImages > 0 ? (totalImages - imgsMissingAlt) / totalImages : 1;

  // Performance score based on response time
  let perfScore: number;
  if (responseTime < 1000) perfScore = 90;
  else if (responseTime < 2000) perfScore = 70;
  else if (responseTime < 3000) perfScore = 50;
  else perfScore = 30;

  // SEO score based on checks
  const seoChecks = [hasTitle, hasMetaDescription, hasViewport, isHttps, hasCanonical];
  const seoScore = Math.round((seoChecks.filter(Boolean).length / seoChecks.length) * 100);

  // Accessibility score based on alt text coverage
  const accessibilityScore = Math.round(altCoverage * 100);

  // Best practices
  const bpChecks = [isHttps, hasViewport, contentLength < 3_000_000];
  const bestPracticesScore = Math.round((bpChecks.filter(Boolean).length / bpChecks.length) * 100);

  const scores = {
    performance: perfScore,
    seo: seoScore,
    accessibility: accessibilityScore,
    bestPractices: bestPracticesScore,
  };

  const seoAudits = {
    hasMetaTitle: hasTitle,
    hasMetaDescription,
    hasSitemap: false, // can't check from HTML alone
    hasRobotsTxt: false,
    isHttps,
    hasViewport,
    hasHreflang: /<link[^>]+hreflang=/i.test(html),
    hasCanonical,
    fontSizeOk: true, // assume OK in fallback
    tapTargetsOk: true,
  };

  return { scores, seoAudits };
}

// POST /api/website/:clientId/insights — AI-powered website analysis
router.post("/:clientId/insights", async (req: Request, res: Response) => {
  try {
    const config = await prisma.websiteConfig.findUnique({
      where: { clientId: req.params.clientId },
    });
    if (!config) return res.status(404).json({ error: "Website not configured" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server" });

    // Fetch website HTML
    let html: string;
    try {
      const r = await fetch(config.url, { signal: AbortSignal.timeout(15000) });
      html = await r.text();
    } catch {
      return res.status(502).json({ error: "Failed to fetch website HTML" });
    }

    const truncatedHtml = html.slice(0, 15000);

    const prompt = `You are a web development expert. Analyze this website HTML and provide insights for improvement.
Website URL: ${config.url}

HTML (first 15000 chars):
${truncatedHtml}

Return a JSON array of insights, each with:
- category: "performance" | "seo" | "ux" | "accessibility" | "content"
- severity: "critical" | "warning" | "info"
- title: short title
- description: what the issue is
- fix: suggested fix

Focus on actionable, specific issues. Return 5-10 insights. Return ONLY valid JSON array, no markdown.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      return res.status(200).json({ error: `AI analysis failed (${anthropicRes.status})` });
    }

    const aiData = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = aiData.content?.find((c) => c.type === "text")?.text || "[]";

    let insights;
    try {
      insights = JSON.parse(text);
    } catch {
      // Try extracting JSON from potential markdown wrapping
      const match = text.match(/\[[\s\S]*\]/);
      insights = match ? JSON.parse(match[0]) : [];
    }

    res.json({ insights });
  } catch (err: unknown) {
    console.error("POST /api/website/:clientId/insights error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

// ── Helper: collect source files from a directory ──

function collectSourceFiles(dir: string, base: string, files: { path: string; content: string }[], maxFiles: number): void {
  if (files.length >= maxFiles) return;
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (files.length >= maxFiles) return;
    const full = join(dir, entry);
    const rel = full.replace(base + "/", "");
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === "dist" || entry === "build") continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      collectSourceFiles(full, base, files, maxFiles);
    } else if ([".tsx", ".ts", ".jsx", ".js", ".html", ".css"].includes(extname(entry))) {
      try {
        const content = readFileSync(full, "utf-8");
        if (content.length < 50000) {
          files.push({ path: rel, content });
        }
      } catch { /* skip unreadable */ }
    }
  }
}

function getRelevantFiles(tempDir: string, category: string): { path: string; content: string }[] {
  const all: { path: string; content: string }[] = [];
  const searchDirs = ["src", "app", "pages", "components", "lib", "public"];
  for (const sub of searchDirs) {
    collectSourceFiles(join(tempDir, sub), tempDir, all, 30);
  }
  // Also grab root-level files like next.config, layout, index
  try {
    const rootEntries = readdirSync(tempDir);
    for (const entry of rootEntries) {
      if ([".tsx", ".ts", ".jsx", ".js", ".html", ".css"].includes(extname(entry))) {
        try {
          const content = readFileSync(join(tempDir, entry), "utf-8");
          if (content.length < 50000) all.push({ path: entry, content });
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }

  // Prioritize files based on category
  const priorityPatterns: Record<string, RegExp[]> = {
    seo: [/layout/i, /head/i, /page\./i, /index/i, /metadata/i, /seo/i, /sitemap/i],
    performance: [/image/i, /loading/i, /lazy/i, /bundle/i, /config/i, /next\.config/i],
    ux: [/nav/i, /layout/i, /header/i, /footer/i, /menu/i, /sidebar/i],
    accessibility: [/form/i, /button/i, /input/i, /image/i, /modal/i, /dialog/i],
    content: [/page\./i, /index/i, /home/i, /about/i, /landing/i],
  };

  const patterns = priorityPatterns[category] || priorityPatterns.content;
  const scored = all.map((f) => {
    const score = patterns.reduce((s, p) => s + (p.test(f.path) ? 1 : 0), 0);
    return { ...f, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10);
}

// POST /api/website/:clientId/fix — auto-repair an insight via PR (async job queue)
router.post("/:clientId/fix", async (req: Request, res: Response) => {
  const clientId = req.params.clientId as string;
  const { insight } = req.body as {
    insight: { category: string; severity: string; title: string; description: string; fix: string };
  };

  if (!insight) return res.status(400).json({ error: "Missing insight data" });

  // Pre-validate before spawning background work
  const config = await prisma.websiteConfig.findUnique({ where: { clientId } });
  if (!config?.gitRepo) return res.status(400).json({ error: "No git repo configured" });

  let ghToken = process.env.GITHUB_TOKEN || "";
  if (!ghToken) {
    try { ghToken = execSync("gh auth token", { encoding: "utf-8" }).trim(); } catch { /* no token */ }
  }
  if (!ghToken) return res.status(500).json({ error: "No GitHub token available (set GITHUB_TOKEN or login with gh)" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  // Create job and return immediately
  const jobId = randomUUID();
  const job: FixJob = {
    id: jobId,
    clientId,
    insight,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  fixJobs.set(jobId, job);

  // Return immediately — work happens in background
  res.json({ jobId, status: "running" });

  // Background work (not awaited)
  (async () => {
    let tempDir = "";
    try {
      const gitRepo: string = config.gitRepo;
      const baseBranch: string = config.gitBranch || "main";

      // Clone repo
      const timestamp = Date.now();
      tempDir = `/tmp/2fly-fix-${clientId}-${timestamp}`;
      const cloneUrl = `https://x-access-token:${ghToken}@github.com/${gitRepo}.git`;
      execSync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, { encoding: "utf-8", timeout: 120000 });

      // Create branch
      const slug = insight.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
      const branchName = `fix/${slug}-${timestamp}`;
      execSync(`git checkout -b ${branchName}`, { cwd: tempDir, encoding: "utf-8" });

      // Read relevant source files
      const relevantFiles = getRelevantFiles(tempDir, insight.category);
      if (relevantFiles.length === 0) throw new Error("No source files found in the repository");

      const filesContext = relevantFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n");

      // Call Anthropic API
      const prompt = `You are an expert web developer. Fix this issue in the codebase.

Issue: ${insight.title}
Description: ${insight.description}
Suggested Fix: ${insight.fix}
Category: ${insight.category}

Here are the relevant source files:
${filesContext}

Return a JSON object with this exact structure:
{
  "changes": [
    { "file": "relative/path/to/file", "content": "full new file content" }
  ],
  "summary": "brief description of changes made"
}

Rules:
- Only modify files that need changing
- Return the COMPLETE file content for each changed file
- Make minimal, focused changes
- Return ONLY valid JSON, no markdown`;

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16384,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error("Anthropic API error:", anthropicRes.status, errText);
        throw new Error(`AI analysis failed (${anthropicRes.status})`);
      }

      const aiData = (await anthropicRes.json()) as { content?: Array<{ type: string; text?: string }> };
      const aiText = aiData.content?.find((c) => c.type === "text")?.text || "";

      let changes: { file: string; content: string }[];
      let summary: string;
      try {
        const parsed = JSON.parse(aiText);
        changes = parsed.changes;
        summary = parsed.summary;
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("AI returned invalid JSON");
        const parsed = JSON.parse(match[0]);
        changes = parsed.changes;
        summary = parsed.summary;
      }

      if (!changes || changes.length === 0) throw new Error("AI returned no changes");

      // Apply changes
      for (const change of changes) {
        const filePath = join(tempDir, change.file);
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, change.content, "utf-8");
      }

      // Git add, commit, push
      execSync("git add -A", { cwd: tempDir, encoding: "utf-8" });
      const commitMsg = `fix(${insight.category}): ${insight.title}`;
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
        cwd: tempDir,
        encoding: "utf-8",
        env: { ...process.env, GIT_AUTHOR_NAME: "2Fly Bot", GIT_AUTHOR_EMAIL: "bot@2fly.marketing", GIT_COMMITTER_NAME: "2Fly Bot", GIT_COMMITTER_EMAIL: "bot@2fly.marketing" },
      });
      execSync(`git push origin ${branchName}`, { cwd: tempDir, encoding: "utf-8", timeout: 60000 });

      // Create PR via GitHub API
      const [owner, repo] = gitRepo.split("/");
      const prBody = `## Auto-Fix: ${insight.title}\n\n**Category:** ${insight.category}\n**Severity:** ${insight.severity}\n\n**Issue:** ${insight.description}\n\n**Changes Made:**\n${summary}\n\n---\n_Generated by 2Fly Command Center Auto-Repair_`;

      const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${ghToken}`,
          "User-Agent": "2fly-command-center",
        },
        body: JSON.stringify({
          title: `fix(${insight.category}): ${insight.title}`,
          body: prBody,
          head: branchName,
          base: baseBranch,
        }),
      });

      if (!prRes.ok) {
        const errBody = await prRes.text();
        console.error("GitHub PR creation failed:", prRes.status, errBody);
        throw new Error(`Failed to create PR (${prRes.status})`);
      }

      const prData = (await prRes.json()) as { html_url: string };

      // Update job as done
      job.status = "done";
      job.prUrl = prData.html_url;
      job.branch = branchName;
      job.summary = summary;
      job.completedAt = new Date().toISOString();

      // Store in history
      fixHistory.unshift({
        clientId,
        insight,
        status: "success",
        prUrl: prData.html_url,
        branch: branchName,
        summary,
        timestamp: new Date().toISOString(),
      });
      if (fixHistory.length > 100) fixHistory.length = 100;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Fix job error:", jobId, message);
      job.status = "failed";
      job.error = message;
      job.completedAt = new Date().toISOString();

      fixHistory.unshift({
        clientId,
        insight,
        status: "error",
        error: message,
        timestamp: new Date().toISOString(),
      });
      if (fixHistory.length > 100) fixHistory.length = 100;
    } finally {
      if (tempDir) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  })();
});

// GET /api/website/:clientId/fix/:jobId — poll job status
router.get("/:clientId/fix/:jobId", async (req: Request, res: Response) => {
  const job = fixJobs.get(req.params.jobId);
  if (!job) return res.json({ status: "not_found" });
  res.json({
    jobId: job.id,
    status: job.status,
    prUrl: job.prUrl,
    branch: job.branch,
    summary: job.summary,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

// GET /api/website/:clientId/fixes — list recent fix attempts + active jobs
router.get("/:clientId/fixes", async (req: Request, res: Response) => {
  const clientId = req.params.clientId as string;
  const clientFixes = fixHistory.filter((f) => f.clientId === clientId);
  const clientJobs = Array.from(fixJobs.values()).filter((j) => j.clientId === clientId);
  res.json({ fixes: clientFixes, jobs: clientJobs });
});

// POST /api/website/:clientId/dev-request — free-form AI dev request (async job)
router.post("/:clientId/dev-request", async (req: Request, res: Response) => {
  const clientId = req.params.clientId as string;
  const { message } = req.body as { message: string };

  if (!message || !message.trim()) return res.status(400).json({ error: "Missing message" });

  const config = await prisma.websiteConfig.findUnique({ where: { clientId } });
  if (!config?.gitRepo) return res.status(400).json({ error: "No git repo configured" });

  let ghToken = process.env.GITHUB_TOKEN || "";
  if (!ghToken) {
    try { ghToken = execSync("gh auth token", { encoding: "utf-8" }).trim(); } catch { /* no token */ }
  }
  if (!ghToken) return res.status(500).json({ error: "No GitHub token available (set GITHUB_TOKEN or login with gh)" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const jobId = randomUUID();
  const job: DevJob = {
    id: jobId,
    clientId,
    message: message.trim(),
    status: "running",
    startedAt: new Date().toISOString(),
  };
  devJobs.set(jobId, job);

  res.json({ jobId, status: "running" });

  // Background work
  (async () => {
    let tempDir = "";
    try {
      const gitRepo: string = config.gitRepo;
      const baseBranch: string = config.gitBranch || "main";

      const timestamp = Date.now();
      tempDir = `/tmp/2fly-dev-${clientId}-${timestamp}`;
      const cloneUrl = `https://x-access-token:${ghToken}@github.com/${gitRepo}.git`;
      execSync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, { encoding: "utf-8", timeout: 120000 });

      // Read source files
      const allFiles: { path: string; content: string }[] = [];
      const searchDirs = ["src", "app", "components", "pages", "public"];
      for (const sub of searchDirs) {
        collectSourceFiles(join(tempDir, sub), tempDir, allFiles, 50);
      }
      // Root-level files
      try {
        const rootEntries = readdirSync(tempDir);
        for (const entry of rootEntries) {
          if ([".tsx", ".ts", ".jsx", ".js", ".html", ".css", ".json"].includes(extname(entry)) && entry !== "package-lock.json") {
            try {
              const content = readFileSync(join(tempDir, entry), "utf-8");
              if (content.length < 50000) allFiles.push({ path: entry, content });
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }

      if (allFiles.length === 0) throw new Error("No source files found in the repository");

      // Cap total content to ~60K chars to avoid overflowing AI context
      let totalChars = 0;
      const cappedFiles: typeof allFiles = [];
      for (const f of allFiles) {
        if (totalChars + f.content.length > 60000) break;
        cappedFiles.push(f);
        totalChars += f.content.length;
      }

      const filesContext = cappedFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n");

      const prompt = `You are an expert web developer working on this website codebase.
The user requested: ${message.trim()}

Here are the source files:
${filesContext}

Make the requested changes. Return JSON:
{
  "changes": [{ "file": "path", "content": "full file content" }],
  "summary": "what you changed and why"
}

Rules:
- Return COMPLETE file content for changed files
- Make focused, minimal changes
- Only valid JSON, no markdown wrapping`;

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16384,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error("Anthropic API error:", anthropicRes.status, errText);
        throw new Error(`AI request failed (${anthropicRes.status})`);
      }

      const aiData = (await anthropicRes.json()) as { content?: Array<{ type: string; text?: string }>; stop_reason?: string };
      let aiText = aiData.content?.find((c) => c.type === "text")?.text || "";
      
      // If response was truncated (end_turn not reached), try to salvage partial JSON
      if (aiData.stop_reason === "max_tokens") {
        console.warn("AI response was truncated (max_tokens reached). Attempting to salvage...");
        // Try to close the JSON structure
        if (aiText.includes('"changes"')) {
          // Find last complete file entry and close the JSON
          const lastContentEnd = aiText.lastIndexOf('"}');
          if (lastContentEnd > 0) {
            aiText = aiText.substring(0, lastContentEnd + 2) + '], "summary": "Changes applied (response was truncated)"}';
          }
        }
      }

      let changes: { file: string; content: string }[];
      let summary: string;
      try {
        const parsed = JSON.parse(aiText);
        changes = parsed.changes;
        summary = parsed.summary;
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("AI returned invalid JSON");
        const parsed = JSON.parse(match[0]);
        changes = parsed.changes;
        summary = parsed.summary;
      }

      if (!changes || changes.length === 0) throw new Error("AI returned no changes");

      // Apply changes
      for (const change of changes) {
        const filePath = join(tempDir, change.file);
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, change.content, "utf-8");
      }

      // Create branch
      const slug = message.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").split("-").slice(0, 5).join("-").slice(0, 40);
      const branchName = `dev/${slug}-${timestamp}`;
      execSync(`git checkout -b ${branchName}`, { cwd: tempDir, encoding: "utf-8" });

      // Commit & push
      execSync("git add -A", { cwd: tempDir, encoding: "utf-8" });
      const commitMsg = `dev: ${message.trim().slice(0, 50)}`;
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
        cwd: tempDir,
        encoding: "utf-8",
        env: { ...process.env, GIT_AUTHOR_NAME: "2Fly Bot", GIT_AUTHOR_EMAIL: "bot@2fly.marketing", GIT_COMMITTER_NAME: "2Fly Bot", GIT_COMMITTER_EMAIL: "bot@2fly.marketing" },
      });
      execSync(`git push origin ${branchName}`, { cwd: tempDir, encoding: "utf-8", timeout: 60000 });

      // Create PR
      const [owner, repo] = gitRepo.split("/");
      const prBody = `## Dev Request\n\n**Request:** ${message.trim()}\n\n**Changes Made:**\n${summary}\n\n---\n_Generated by 2Fly Command Center Dev Chat_`;

      const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${ghToken}`,
          "User-Agent": "2fly-command-center",
        },
        body: JSON.stringify({
          title: `dev: ${message.trim().slice(0, 60)}`,
          body: prBody,
          head: branchName,
          base: baseBranch,
        }),
      });

      if (!prRes.ok) {
        const errBody = await prRes.text();
        console.error("GitHub PR creation failed:", prRes.status, errBody);
        throw new Error(`Failed to create PR (${prRes.status})`);
      }

      const prData = (await prRes.json()) as { html_url: string };

      job.status = "done";
      job.prUrl = prData.html_url;
      job.branch = branchName;
      job.summary = summary;
      job.completedAt = new Date().toISOString();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Dev job error:", jobId, errMsg);
      job.status = "failed";
      job.error = errMsg;
      job.completedAt = new Date().toISOString();
    } finally {
      if (tempDir) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  })();
});

// GET /api/website/:clientId/dev-request/:jobId — poll dev job status
router.get("/:clientId/dev-request/:jobId", async (req: Request, res: Response) => {
  const job = devJobs.get(req.params.jobId);
  if (!job) return res.json({ status: "not_found" });
  res.json({
    jobId: job.id,
    message: job.message,
    status: job.status,
    prUrl: job.prUrl,
    branch: job.branch,
    summary: job.summary,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

// GET /api/website/:clientId/dev-history — list all dev requests for this client
router.get("/:clientId/dev-history", async (req: Request, res: Response) => {
  const clientId = req.params.clientId as string;
  const clientJobs = Array.from(devJobs.values())
    .filter((j) => j.clientId === clientId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  res.json({ history: clientJobs });
});

export default router;
