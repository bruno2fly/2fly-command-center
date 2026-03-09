/**
 * server/src/whatsapp/classifier.ts
 * Request classifier: heuristic-first with optional LLM fallback.
 * Classifies incoming WhatsApp messages as "request" or "non-request."
 * Path: server/src/whatsapp/classifier.ts
 */

import OpenAI from 'openai';
import type {
  ClassificationResult,
  ClassificationIntent,
  InboundMessage,
} from './types.js';
import {
  REQUEST_PATTERNS,
  NON_REQUEST_PATTERNS,
  USE_LLM_FALLBACK,
  LLM_FALLBACK_THRESHOLD,
  LLM_SYSTEM_PROMPT,
} from './classifier-config.js';

// Lazy-init OpenAI client only when needed
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Run heuristic classification against configured patterns.
 */
function classifyWithHeuristics(text: string): ClassificationResult {
  const matchedPatterns: string[] = [];
  let totalWeight = 0;
  const intentScores: Record<ClassificationIntent, number> = {
    task_request: 0,
    info_request: 0,
    schedule_request: 0,
    change_request: 0,
    urgent_request: 0,
    non_request: 0,
  };

  // Check positive request patterns
  for (const rule of REQUEST_PATTERNS) {
    if (rule.pattern.test(text)) {
      matchedPatterns.push(rule.label);
      totalWeight += rule.weight;
      intentScores[rule.intent] += rule.weight;
    }
  }

  // Check negative (non-request) patterns
  for (const rule of NON_REQUEST_PATTERNS) {
    if (rule.pattern.test(text)) {
      matchedPatterns.push(rule.label);
      totalWeight += rule.weight; // weight is negative for these
      intentScores.non_request += Math.abs(rule.weight);
    }
  }

  // Calculate confidence (clamp 0-1)
  const confidence = Math.max(0, Math.min(1, totalWeight));

  // Determine dominant intent
  let dominantIntent: ClassificationIntent = 'non_request';
  let maxScore = 0;
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantIntent = intent as ClassificationIntent;
    }
  }

  const isRequest = dominantIntent !== 'non_request' && confidence > 0;

  // Generate a simple summary from the message
  const summary = isRequest
    ? `Client ${dominantIntent.replace('_', ' ')}: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`
    : 'Non-actionable message';

  return {
    isRequest,
    intent: dominantIntent,
    confidence,
    summary,
    method: 'heuristic',
    matchedPatterns,
  };
}

/**
 * Call OpenAI/LLM for classification when heuristic confidence is low.
 */
async function classifyWithLLM(text: string): Promise<ClassificationResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn('[classifier] LLM fallback requested but no OPENAI_API_KEY configured');
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      isRequest: parsed.isRequest ?? false,
      intent: parsed.intent ?? 'non_request',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      summary: parsed.summary ?? 'LLM classification',
      method: 'llm',
    };
  } catch (err) {
    console.error('[classifier] LLM fallback failed:', err);
    return null;
  }
}

/**
 * Main classification entry point.
 * 1. Run heuristics first (fast, no API cost).
 * 2. If confidence is below LLM_FALLBACK_THRESHOLD and LLM is enabled, call LLM.
 * 3. Return the best result.
 */
export async function classifyMessage(
  message: InboundMessage
): Promise<ClassificationResult> {
  const text = message.body.trim();

  // Empty messages are not requests
  if (!text) {
    return {
      isRequest: false,
      intent: 'non_request',
      confidence: 1.0,
      summary: 'Empty message',
      method: 'heuristic',
      matchedPatterns: ['empty'],
    };
  }

  // Step 1: Heuristic classification
  const heuristicResult = classifyWithHeuristics(text);
  console.log(`[classifier] Heuristic: intent=${heuristicResult.intent}, confidence=${heuristicResult.confidence.toFixed(2)}, patterns=[${heuristicResult.matchedPatterns?.join(', ')}]`);

  // Step 2: If confidence is low and LLM is enabled, try LLM
  if (
    heuristicResult.confidence < LLM_FALLBACK_THRESHOLD &&
    USE_LLM_FALLBACK
  ) {
    console.log(`[classifier] Confidence ${heuristicResult.confidence.toFixed(2)} < ${LLM_FALLBACK_THRESHOLD}, trying LLM fallback...`);
    const llmResult = await classifyWithLLM(text);
    if (llmResult) {
      console.log(`[classifier] LLM: intent=${llmResult.intent}, confidence=${llmResult.confidence.toFixed(2)}`);
      // Merge: use LLM result but note it was hybrid if heuristics also matched
      return {
        ...llmResult,
        method: heuristicResult.matchedPatterns?.length ? 'hybrid' : 'llm',
        matchedPatterns: heuristicResult.matchedPatterns,
      };
    }
  }

  return heuristicResult;
}