/**
 * server/src/whatsapp/types.ts
 * Type definitions for the WhatsApp intake pipeline
 * Path: server/src/whatsapp/types.ts
 */

// ── Normalized inbound message (provider-agnostic) ──────────────────────
export interface InboundMessage {
  messageId: string;
  from: string;           // e.g. "whatsapp:+15551234567"
  senderName: string;     // WhatsApp profile name
  senderId: string;       // WhatsApp ID (phone number without prefix)
  body: string;
  timestamp: number;      // Unix ms
  mediaUrls: string[];    // Attached media URLs
  mediaTypes: string[];   // MIME types for each media
  raw: Record<string, unknown>; // Full original payload for debugging
  provider: 'twilio' | 'meta' | 'vonage' | 'custom';
}

// ── Classifier output ───────────────────────────────────────────────────
export type ClassificationIntent =
  | 'task_request'
  | 'info_request'
  | 'schedule_request'
  | 'change_request'
  | 'urgent_request'
  | 'non_request';

export interface ClassificationResult {
  isRequest: boolean;
  intent: ClassificationIntent;
  confidence: number;     // 0.0 - 1.0
  summary: string;        // Brief human-readable summary
  method: 'heuristic' | 'llm' | 'hybrid';
  matchedPatterns?: string[]; // Which heuristic patterns matched
}

// ── Decision log entry ──────────────────────────────────────────────────
export interface ClassifierLogEntry {
  id: string;
  timestamp: number;
  messageId: string;
  senderName: string;
  senderId: string;
  bodyPreview: string;    // First 100 chars
  classification: ClassificationResult;
  action: 'created_pending' | 'skipped_non_request' | 'skipped_low_confidence';
}

// ── Pending request (stored in DB) ──────────────────────────────────────
export type PendingRequestStatus = 'pending' | 'approved' | 'dismissed' | 'archived';

export interface PendingRequest {
  id: string;
  rawMessage: string;
  senderName: string;
  senderId: string;
  senderPhone: string;    // Full "whatsapp:+..." format
  classification: ClassificationResult;
  timestamp: number;      // When the message was received
  createdAt: number;      // When the pending request was created
  status: PendingRequestStatus;
  chatThreadLink?: string;
  messageId: string;
  mediaUrls: string[];
  // Set on approval
  approvedAt?: number;
  approvedTaskId?: string;
  approvedLane?: 'NOW' | 'NEXT' | 'LATER';
  // Set on dismiss
  dismissedAt?: number;
  dismissReason?: string;
}

// ── Task created from approved request ──────────────────────────────────
export interface WhatsAppTask {
  id: string;
  title: string;          // Auto-generated from classification summary
  description: string;    // Full message text + context
  requester: string;      // Sender name
  requesterPhone: string;
  lane: 'NOW' | 'NEXT' | 'LATER' | 'DONE';
  sourceRequestId: string;
  createdAt: number;
  dueDate: number;        // Default: createdAt + DEFAULT_DUE_WINDOW_DAYS
  completedAt?: number;
}

// ── Notification types ──────────────────────────────────────────────────
export interface DashboardNotification {
  id: string;
  type: 'new_pending_request';
  title: string;
  message: string;
  requestId: string;
  read: boolean;
  createdAt: number;
}

// ── API request/response shapes ─────────────────────────────────────────
export interface ApproveRequestBody {
  action: 'approve';
  lane?: 'NOW' | 'NEXT' | 'LATER';
  title?: string;         // Override auto-generated title
  dueDate?: number;       // Override default due date
}

export interface DismissRequestBody {
  action: 'dismiss';
  reason?: string;
}

export type RequestActionBody = ApproveRequestBody | DismissRequestBody;

// ── Provider config (for swappable providers) ───────────────────────────
export interface WhatsAppProviderConfig {
  provider: 'twilio' | 'meta' | 'vonage' | 'custom';
  accountSid?: string;
  authToken?: string;
  whatsappNumber?: string;
  webhookSecret?: string;
}
