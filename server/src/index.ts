// ============================================================
// 2FLY MARKETING COMMAND CENTER — Server Entry
// ============================================================

const express = require("express");
const cors = require("cors");
const { registerAutomations } = require("./lib/automations");
import whatsappRoutes from "./routes/whatsapp.js";
import agentsRoutes from "./routes/agents.js";
import agentToolsRoutes from "./routes/agent-tools.js";
import taskExecuteRoutes from "./routes/task-execute";
import flowRoutes from "./routes/flow.js";
import morningRoutes from "./routes/morning.js";
import metaInsightsRoutes from "./routes/meta-insights.js";
import mediaRoutes from "./routes/media.js";
import geminiImageRoutes from "./routes/gemini-image.ts";
import googleAdsRoutes from "./routes/google-ads.js";
import actionBoardRoutes from "./routes/action-board.js";
import websiteRoutes from "./routes/website.js";
import offboundsPipelineRoutes from "./routes/offbounds-pipeline.js";
import weeklyTasksRoutes from "./routes/weekly-tasks.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy — required for Twilio webhook validation when behind Cloudflare Tunnel / ngrok
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/clients", require("./routes/clients"));
app.use("/api/content", require("./routes/content"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/ads", require("./routes/ads"));
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/agent-tools", agentToolsRoutes);
app.use("/api/briefs", require("./routes/briefs"));
app.use("/api/directives", require("./routes/directives"));
app.use("/api/agent-actions", require("./routes/agent-actions"));
app.use("/api/tasks", taskExecuteRoutes);
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/professional-invoices", require("./routes/professional-invoices"));
app.use("/api/ai-updates", require("./routes/ai-updates"));
app.use("/api/strategies", require("./routes/strategies"));
app.use("/api/flow", flowRoutes);
app.use("/api/morning", morningRoutes);
app.use("/api/meta-insights", metaInsightsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/gemini", geminiImageRoutes);
app.use("/api/google-ads", googleAdsRoutes);
app.use("/api/action-board", actionBoardRoutes);
app.use("/api/website", websiteRoutes);
app.use("/api/offbounds", offboundsPipelineRoutes);
app.use("/api/weekly-tasks", weeklyTasksRoutes);

// Serve uploaded media files
import path from 'path';
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
// Serve public assets (logos, etc.)
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Health check
app.get("/api/health", (_req: unknown, res: { json: (arg: unknown) => void }) => {
  res.json({ status: "ok", service: "2fly-command-center", timestamp: new Date().toISOString() });
});

// Start
const port = Number(PORT);
app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 2Fly Command Center API running on http://localhost:${port}`);
  console.log(`   SERVER_PORT=${port} (tunnel must forward to this port)\n`);
  registerAutomations();
});
