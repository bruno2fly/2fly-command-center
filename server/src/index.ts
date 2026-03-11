// ============================================================
// 2FLY MARKETING COMMAND CENTER — Server Entry
// ============================================================

const express = require("express");
const cors = require("cors");
const { registerAutomations } = require("./lib/automations");
import whatsappRoutes from "./routes/whatsapp.js";
import agentsRoutes from "./routes/agents.js";
import agentToolsRoutes from "./routes/agent-tools.js";

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
