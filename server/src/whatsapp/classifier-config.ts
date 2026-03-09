/**
 * server/src/whatsapp/classifier-config.ts
 * Configurable heuristic patterns and thresholds for the request classifier.
 * Edit this file to tune detection without touching classifier logic.
 * Path: server/src/whatsapp/classifier-config.ts
 */

import type { ClassificationIntent } from './types.js';

// ── Thresholds (overridable via env) ──────────────────────────────────
export const CONFIDENCE_THRESHOLD = parseFloat(
  process.env.CLASSIFIER_CONFIDENCE_THRESHOLD || '0.6'
);

export const USE_LLM_FALLBACK =
  process.env.CLASSIFIER_USE_LLM_FALLBACK !== 'false';

export const LLM_FALLBACK_THRESHOLD = 0.4; // Below this, call LLM

export const DEFAULT_DUE_WINDOW_DAYS = parseInt(
  process.env.DEFAULT_DUE_WINDOW_DAYS || '3', 10
);

export const NOTIFICATION_ENABLED =
  process.env.NOTIFICATION_ENABLED !== 'false';

// ── Keyword/phrase patterns mapped to intents ──────────────────────────
export interface PatternRule {
  pattern: RegExp;
  intent: ClassificationIntent;
  weight: number; // How much this contributes to confidence (0-1)
  label: string;  // Human-readable label for debugging
}

export const REQUEST_PATTERNS: PatternRule[] = [
  // Direct request phrases
  { pattern: /\bcan you\b/i, intent: 'task_request', weight: 0.35, label: 'can_you' },
  { pattern: /\bcould you\b/i, intent: 'task_request', weight: 0.35, label: 'could_you' },
  { pattern: /\bwould you\b/i, intent: 'task_request', weight: 0.30, label: 'would_you' },
  { pattern: /\bplease\b.*\b(do|make|create|update|fix|change|send|add|remove)\b/i, intent: 'task_request', weight: 0.40, label: 'please_action' },
  { pattern: /\bi need\b/i, intent: 'task_request', weight: 0.35, label: 'i_need' },
  { pattern: /\bwe need\b/i, intent: 'task_request', weight: 0.35, label: 'we_need' },
  { pattern: /\bneed\s+(you|this|that|it)\b/i, intent: 'task_request', weight: 0.30, label: 'need_pronoun' },
  { pattern: /\brequest(ing)?\b/i, intent: 'task_request', weight: 0.40, label: 'request' },

  // Schedule-related
  { pattern: /\bwhen can you\b/i, intent: 'schedule_request', weight: 0.40, label: 'when_can_you' },
  { pattern: /\bschedule\b/i, intent: 'schedule_request', weight: 0.30, label: 'schedule' },
  { pattern: /\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|end of|eod|eow)\b/i, intent: 'schedule_request', weight: 0.25, label: 'by_deadline' },
  { pattern: /\bdeadline\b/i, intent: 'schedule_request', weight: 0.30, label: 'deadline' },
  { pattern: /\basap\b/i, intent: 'urgent_request', weight: 0.45, label: 'asap' },

  // Change requests
  { pattern: /\b(update|change|modify|revise|edit|replace|swap)\b/i, intent: 'change_request', weight: 0.25, label: 'change_verb' },
  { pattern: /\binstead of\b/i, intent: 'change_request', weight: 0.30, label: 'instead_of' },

  // Info requests
  { pattern: /\b(what|how|where|when)\s+(is|are|do|does|can|will)\b/i, intent: 'info_request', weight: 0.20, label: 'question_word' },
  { pattern: /\bstatus\s+(of|on|update)\b/i, intent: 'info_request', weight: 0.30, label: 'status_check' },
  { pattern: /\bany update\b/i, intent: 'info_request', weight: 0.25, label: 'any_update' },

  // Urgent
  { pattern: /\burgent(ly)?\b/i, intent: 'urgent_request', weight: 0.50, label: 'urgent' },
  { pattern: /\bemergency\b/i, intent: 'urgent_request', weight: 0.50, label: 'emergency' },
  { pattern: /\bright away\b/i, intent: 'urgent_request', weight: 0.40, label: 'right_away' },
];

// ── Non-request indicators (reduce confidence) ─────────────────────────
export const NON_REQUEST_PATTERNS: PatternRule[] = [
  { pattern: /^(thanks|thank you|thx|ty|ok|okay|got it|sounds good|perfect|great|awesome|cool|nice|lol|haha)/i, intent: 'non_request', weight: -0.50, label: 'gratitude_start' },
  { pattern: /^(yes|no|yep|nope|sure|absolutely|definitely)\s*[.!]?$/i, intent: 'non_request', weight: -0.40, label: 'short_affirmation' },
  { pattern: /^(good morning|good afternoon|good evening|hi|hello|hey|yo|sup)\s*[.!]?$/i, intent: 'non_request', weight: -0.40, label: 'greeting_only' },
  { pattern: /^.{1,15}$/i, intent: 'non_request', weight: -0.20, label: 'very_short_message' },
];

// ── LLM prompt template ─────────────────────────────────────────────────
export const LLM_SYSTEM_PROMPT = `You are a message classifier for a creative agency.
Determine if a WhatsApp message from a client is a REQUEST (asking the agency to do something)
or a NON-REQUEST (casual chat, thanks, greeting, general info).

Respond with ONLY valid JSON:
{
  "isRequest": boolean,
  "intent": "task_request" | "info_request" | "schedule_request" | "change_request" | "urgent_request" | "non_request",
  "confidence": number between 0 and 1,
  "summary": "brief 10-word-max summary of what they want"
}

Examples:
- "Can you update the banner on the homepage?" -> request, task_request, 0.95
- "Thanks, looks great!" -> non-request, non_request, 0.95
- "When can you have the new logo ready?" -> request, schedule_request, 0.90
- "Hey good morning" -> non-request, non_request, 0.95`;