/**
 * offbounds-pipeline.ts
 * Local pipeline status + trigger routes for OFFBounds admin panel.
 * These run on the Mac mini (localhost:3001) where log files and scripts live.
 */

import { Router } from 'express';
import fs from 'fs';
import { spawn } from 'child_process';

const router = Router();

const LOG_PATHS: Record<string, string> = {
  scraper: '/tmp/offbounds-scraper.log',
  'intelligence-engine': '/tmp/offbounds-intelligence.log',
  'story-agent': '/tmp/offbounds-story-agent.log',
  'story-fallback': '/tmp/offbounds-story-fallback.log',
  email: '/tmp/vtex-briefing.log',
};

const SCRIPT_PATHS: Record<string, string> = {
  scraper: '/Users/brunolima/.openclaw/agents/founder-boss/workspace/offbounds-scraper.py',
  'story-agent': '/Users/brunolima/.openclaw/agents/founder-boss/workspace/offbounds-story-agent.py',
  'story-fallback': '/Users/brunolima/.openclaw/agents/founder-boss/workspace/offbounds-story-fallback.py',
};

const STORY_PATH = '/Users/brunolima/Projects/offbounds-intelligence-github/public/story-of-the-day.json';
const FEED_PATH = '/Users/brunolima/Projects/offbounds-intelligence-github/public/feed-data.json';

function readLastLines(path: string, n = 50): string {
  try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.trim().split('\n');
    return lines.slice(-n).join('\n');
  } catch { return ''; }
}

function parseLog(log: string) {
  const lines = log.split('\n').filter(Boolean);
  if (!lines.length) return { lastRun: null, hasError: false, lastError: '' };
  const lastLine = lines[lines.length - 1];
  const hasError = lines.some(l => /error|401|failed|unauthorized/i.test(l));
  const errorLine = [...lines].reverse().find(l => /error|401|failed|unauthorized/i.test(l)) || '';
  const timeMatch = lastLine.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
  return {
    lastRun: timeMatch ? timeMatch[1] : 'Unknown',
    hasError,
    lastError: errorLine.slice(0, 150),
  };
}

// GET /api/offbounds/pipeline-status
router.get('/pipeline-status', (req, res) => {
  const status: Record<string, unknown> = {};

  for (const [key, logPath] of Object.entries(LOG_PATHS)) {
    const log = readLastLines(logPath);
    status[key] = parseLog(log);
  }

  // Story of the day
  let storyOfDay = null;
  try {
    const raw = fs.readFileSync(STORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    storyOfDay = {
      headline: parsed.story?.headline || null,
      generated_at: parsed.generated_at || null,
      approved: parsed.approved || false,
      fallback: parsed.fallback || false,
    };
  } catch {}

  // Feed count
  let feedCount = 0;
  try {
    const raw = fs.readFileSync(FEED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    feedCount = (parsed.items || []).filter((i: { type: string }) => i.type === 'news').length;
  } catch {}

  // API key status (check env)
  const keys = {
    claude: !!(process.env.ANTHROPIC_API_KEY),
    perplexity: !!(process.env.PERPLEXITY_API_KEY),
  };

  res.json({ ...status, storyOfDay, feedCount, keys });
});

// POST /api/offbounds/trigger/:job
router.post('/trigger/:job', (req, res) => {
  const { job } = req.params;
  const script = SCRIPT_PATHS[job];
  if (!script) {
    return res.status(400).json({ error: `Unknown job: ${job}` });
  }

  console.log(`[OFFBounds Pipeline] Triggering job: ${job} → ${script}`);

  // Source .zshenv to get API keys
  const wrapper = spawn('bash', ['-c', `source ~/.zshenv 2>/dev/null; python3 "${script}"`], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  wrapper.unref();

  return res.json({ ok: true, job, started: new Date().toISOString() });
});

export default router;
