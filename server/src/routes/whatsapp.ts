/**
 * server/src/routes/whatsapp.ts
 * Express routes: webhook handler + dashboard API for the WhatsApp intake pipeline.
 * Path: server/src/routes/whatsapp.ts
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { TwilioWhatsAppProvider } from '../whatsapp/providers/twilio.js';
import { classifyMessage } from '../whatsapp/classifier.js';
import { notifyBruno } from '../whatsapp/notifications.js';
import { CONFIDENCE_THRESHOLD, DEFAULT_DUE_WINDOW_DAYS } from '../whatsapp/classifier-config.js';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequest,
  getTasks,
  createTask,
  updateTask,
  getLogs,
  addLog,
  getNotifications,
  markNotificationRead,
  getUnreadCount,
} from '../utils/whatsapp-db.js';
import {
  saveInboundMessage,
  getConversations,
  getConversationById,
  getMessages,
  markConversationRead,
  saveOutboundMessage,
  getOrCreateConversation,
} from '../utils/whatsapp-chat-db.js';
import { isAllowedNumber, isOwnerNumber } from '../utils/client-contacts.js';
import type { RequestActionBody } from '../whatsapp/types.js';

const router = Router();

// Initialize provider (swap this line to change providers)
const provider = new TwilioWhatsAppProvider({
  provider: 'twilio',
});

// Parse URL-encoded bodies (Twilio sends this format)
router.use(express.urlencoded({ extended: false }));

// ================================================================
// WEBHOOK: POST /api/whatsapp/webhook
// Receives inbound messages from Twilio (or other provider).
// ================================================================
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Step 1: Validate webhook authenticity
    if (!provider.validateWebhook(req)) {
      console.warn('[webhook] Invalid webhook signature, rejecting');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    // Step 2: Parse into normalized message
    const message = provider.parseInboundMessage(req);
    console.log(`[webhook] Received from ${message.senderName} (${message.senderId}): ${message.body.slice(0, 80)}`);

    // Respond to Twilio IMMEDIATELY with empty TwiML (no auto-reply)
    res.type('text/xml').send('<Response></Response>');

    // --- Fire-and-forget: all processing happens AFTER response ---
    (async () => {
      try {
        // Save ALL inbound messages to chat dashboard DB
        try {
          const body = req.body as Record<string, string>;
          const toNumber = body.To || process.env.TWILIO_WHATSAPP_NUMBER || '';
          await saveInboundMessage({
            fromNumber: message.from,
            toNumber,
            body: message.body,
            twilioSid: message.messageId,
            contactName: message.senderName !== 'Unknown' ? message.senderName : undefined,
          });
        } catch (dbErr) {
          console.error('[webhook] Failed to save inbound message to chat DB:', dbErr);
        }

        // Skip messages from BRUNO (owner) and unknown numbers
        if (isOwnerNumber(message.from)) {
          console.log(`[webhook] Ignoring owner message from ${message.senderName}`);
          return;
        }
        if (!isAllowedNumber(message.from)) {
          console.log(`[webhook] Ignoring unregistered number: ${message.from}`);
          return;
        }

        // Step 3: Classify the message
        const classification = await classifyMessage(message);

        // Step 4: Log the decision
        const logAction = classification.isRequest && classification.confidence >= CONFIDENCE_THRESHOLD
          ? 'created_pending'
          : classification.isRequest
            ? 'skipped_low_confidence'
            : 'skipped_non_request';

        addLog({
          messageId: message.messageId,
          senderName: message.senderName,
          senderId: message.senderId,
          bodyPreview: message.body.slice(0, 100),
          classification,
          action: logAction,
        });

        // Step 5: If classified as request with sufficient confidence, create pending request
        if (classification.isRequest && classification.confidence >= CONFIDENCE_THRESHOLD) {
          const pendingRequest = createRequest({
            rawMessage: message.body,
            senderName: message.senderName,
            senderId: message.senderId,
            senderPhone: message.from,
            classification,
            timestamp: message.timestamp,
            messageId: message.messageId,
            mediaUrls: message.mediaUrls,
            chatThreadLink: `https://console.twilio.com/`,
          });

          console.log(`[webhook] Created pending request ${pendingRequest.id} (confidence: ${classification.confidence.toFixed(2)})`);

          // Step 6: Notify BRUNO
          await notifyBruno(pendingRequest, provider);
        } else {
          console.log(`[webhook] Skipped: isRequest=${classification.isRequest}, confidence=${classification.confidence.toFixed(2)}, threshold=${CONFIDENCE_THRESHOLD}`);
        }
      } catch (bgErr) {
        console.error('[webhook] Error in background processing:', bgErr);
      }
    })();
  } catch (err) {
    console.error('[webhook] Error processing message:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ================================================================
// DASHBOARD API
// ================================================================

// GET /api/whatsapp/requests?status=pending|approved|dismissed
router.get('/requests', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const requests = getRequests(status as any);
  res.json({ requests, total: requests.length });
});

// GET /api/whatsapp/requests/:id
router.get('/requests/:id', (req: Request, res: Response) => {
  const request = getRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json(request);
});

// PATCH /api/whatsapp/requests/:id  (approve or dismiss)
router.patch('/requests/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body: RequestActionBody = req.body;
  const request = getRequestById(id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request already ${request.status}` });
  }

  if (body.action === 'approve') {
    // Create a task from the approved request
    const dueDate = body.dueDate || Date.now() + DEFAULT_DUE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const lane = body.lane || 'NEXT';
    const title = body.title || request.classification.summary;

    const task = createTask({
      title,
      description: `[WhatsApp Request from ${request.senderName}]\n\n${request.rawMessage}\n\nClassification: ${request.classification.intent} (${(request.classification.confidence * 100).toFixed(0)}%)`,
      requester: request.senderName,
      requesterPhone: request.senderPhone,
      lane,
      sourceRequestId: request.id,
      dueDate,
    });

    // Update the request
    const updated = updateRequest(id, {
      status: 'approved',
      approvedAt: Date.now(),
      approvedTaskId: task.id,
      approvedLane: lane,
    });

    console.log(`[api] Approved request ${id} -> task ${task.id} in ${lane}`);
    return res.json({ request: updated, task });
  }

  if (body.action === 'dismiss') {
    const updated = updateRequest(id, {
      status: 'dismissed',
      dismissedAt: Date.now(),
      dismissReason: body.reason || 'Not actionable',
    });

    console.log(`[api] Dismissed request ${id}: ${body.reason || 'Not actionable'}`);
    return res.json({ request: updated });
  }

  return res.status(400).json({ error: 'Invalid action. Use "approve" or "dismiss".' });
});

// GET /api/whatsapp/tasks?lane=NOW|NEXT|LATER|DONE
router.get('/tasks', (req: Request, res: Response) => {
  const lane = req.query.lane as string | undefined;
  const tasks = getTasks(lane);
  res.json({ tasks, total: tasks.length });
});

// PATCH /api/whatsapp/tasks/:id  (move lane, complete, etc.)
router.patch('/tasks/:id', (req: Request, res: Response) => {
  const updated = updateTask(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});

// GET /api/whatsapp/logs?limit=100
router.get('/logs', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || '100', 10);
  res.json({ logs: getLogs(limit) });
});

// GET /api/whatsapp/notifications?unread=true
router.get('/notifications', (req: Request, res: Response) => {
  const unreadOnly = req.query.unread === 'true';
  res.json({
    notifications: getNotifications(unreadOnly),
    unreadCount: getUnreadCount(),
  });
});

// PATCH /api/whatsapp/notifications/:id/read
router.patch('/notifications/:id/read', (req: Request, res: Response) => {
  markNotificationRead(req.params.id);
  res.json({ success: true });
});

// ================================================================
// CHAT DASHBOARD API (admin-protected)
// ================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!ADMIN_PASSWORD) {
    next();
    return;
  }
  const provided = req.headers['x-admin-password'] as string | undefined;
  if (provided === ADMIN_PASSWORD) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// POST /api/whatsapp/chat/auth — verify admin password
router.post('/chat/auth', (req: Request, res: Response) => {
  if (!ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  const { password } = req.body as { password?: string };
  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// GET /api/whatsapp/chat/conversations?search=
router.get('/chat/conversations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const conversations = await getConversations(search);
    res.json({ conversations });
  } catch (err) {
    console.error('[chat] Failed to fetch conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/whatsapp/chat/conversations/:id/messages
router.get('/chat/conversations/:id/messages', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const messages = await getMessages(id, limit);
    res.json({ messages });
  } catch (err) {
    console.error('[chat] Failed to fetch messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/whatsapp/chat/conversations/:id/messages
router.post('/chat/conversations/:id/messages', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id: conversationId } = req.params;
    const { body: messageBody } = req.body as { body?: string };
    if (!messageBody?.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const conv = await getConversationById(conversationId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const twilioProvider = provider as import('../whatsapp/providers/twilio.js').TwilioWhatsAppProvider;
    const sid = await twilioProvider.sendMessageWithSid(conv.contactNumber, messageBody.trim());
    if (!sid) {
      const twilioErr = (provider as import('../whatsapp/providers/twilio.js').TwilioWhatsAppProvider).lastSendError;
      return res.status(500).json({
        error: 'Failed to send message via Twilio',
        detail: twilioErr || undefined,
      });
    }

    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '';
    await saveOutboundMessage({
      conversationId,
      fromNumber,
      toNumber: conv.contactNumber,
      body: messageBody.trim(),
      twilioSid: sid,
    });

    res.json({ success: true, sid });
  } catch (err) {
    console.error('[chat] Failed to send message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PATCH /api/whatsapp/chat/conversations/:id/read
router.patch('/chat/conversations/:id/read', requireAdmin, async (req: Request, res: Response) => {
  try {
    await markConversationRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[chat] Failed to mark as read:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;