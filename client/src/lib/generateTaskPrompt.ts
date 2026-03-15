/**
 * Generate a context-rich AI prompt from a task + client for pasting into Perplexity/Comet.
 */

export type TaskForPrompt = {
  title: string;
  description?: string | null;
  priority?: string;
  dueDate?: string | null;
  type?: string;
};

export type ClientForPrompt = {
  name: string;
  notes?: string | null;
  platform?: string;
  adBudget?: number;
  monthlyRetainer?: number;
  [key: string]: unknown;
};

function parseClientNotes(notes: string | null | undefined): Record<string, unknown> | null {
  if (!notes || typeof notes !== "string") return null;
  const t = notes.trim();
  if (!t) return null;
  if (t.startsWith("{")) {
    try {
      return JSON.parse(t) as Record<string, unknown>;
    } catch {
      return { _raw: notes };
    }
  }
  return { _raw: notes };
}

export function generateTaskPrompt(task: TaskForPrompt, client: ClientForPrompt): string {
  const clientNotes = parseClientNotes(client.notes);
  const notes = clientNotes && !("_raw" in clientNotes) ? clientNotes : null;

  let prompt = `## Task: ${task.title}\n\n`;
  prompt += `${task.description || "No description provided."}\n\n`;
  prompt += `## Client: ${client.name}\n`;

  if (notes?.unique && Array.isArray(notes.unique)) {
    prompt += "\n### About the Business\n";
    prompt += (notes.unique as string[]).map((u) => `- ${u}`).join("\n") + "\n";
  }

  if (notes?.brandAssets && typeof notes.brandAssets === "object") {
    const voice = (notes.brandAssets as { voice?: string }).voice;
    if (voice) prompt += `\n### Brand Voice: ${voice}\n`;
  }

  if (notes?.operations && typeof notes.operations === "object") {
    const ops = notes.operations as { hours?: string; schedule?: string };
    prompt += "\n### Operations\n";
    prompt += `- Hours: ${ops.hours ?? "N/A"}\n`;
    prompt += `- Schedule: ${ops.schedule ?? "N/A"}\n`;
  }

  if (notes?.revenuePriorities && Array.isArray(notes.revenuePriorities)) {
    prompt += "\n### Revenue Priorities\n";
    prompt += (notes.revenuePriorities as string[]).map((p) => `- ${p}`).join("\n") + "\n";
  }

  if (notes?.redLines && Array.isArray(notes.redLines)) {
    prompt += "\n### ⚠️ Rules (DO NOT BREAK)\n";
    prompt += (notes.redLines as string[]).map((r) => `- ${r}`).join("\n") + "\n";
  }

  if (notes?.competitors && Array.isArray(notes.competitors)) {
    prompt += `\n### Competitors: ${(notes.competitors as string[]).join(", ")}\n`;
  }

  if (notes?.digitalPresence && typeof notes.digitalPresence === "object") {
    prompt += "\n### Digital Presence\n";
    Object.entries(notes.digitalPresence as Record<string, string>).forEach(([k, v]) => {
      prompt += `- ${k}: ${v}\n`;
    });
  }

  if (notes?.links && typeof notes.links === "object") {
    prompt += "\n### Reference Links\n";
    Object.entries(notes.links as Record<string, string>).forEach(([k, v]) => {
      prompt += `- ${k}: ${v}\n`;
    });
  }

  if (client.platform) prompt += `\nPlatform: ${client.platform}\n`;
  if (client.adBudget != null) prompt += `Ad Budget: $${client.adBudget}/mo\n`;
  if (client.monthlyRetainer != null) prompt += `Retainer: $${client.monthlyRetainer}/mo\n`;

  prompt += "\n## Output Instructions\n";
  prompt += "Provide a complete, actionable deliverable I can use immediately.\n";
  prompt += "Format as a structured plan with clear steps, dates, and copy/content ready to use.\n";
  prompt += "If creating content: include hooks, captions, hashtags, and visual direction.\n";
  prompt += "If creating a calendar: use a table format with date, platform, topic, copy, and CTA.\n";

  return prompt;
}

/**
 * Detect which agent should execute this task based on title + description.
 */
export function detectAgentForTask(task: { title?: string; description?: string | null }): string {
  const text = `${task.title ?? ""} ${task.description ?? ""}`.toLowerCase();
  if (/ads|campaign|budget|meta|facebook\s*ads|roas|spend/.test(text)) return "meta-traffic";
  if (/research|competitor|analysis|market|intel/.test(text)) return "research-intel";
  if (/content|post|calendar|caption|hook|reel|story|carousel|content\s*item/.test(text)) return "content-system";
  return "content-system";
}
