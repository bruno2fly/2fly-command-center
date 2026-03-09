/**
 * server/src/whatsapp/notifications.ts
 * Notification system: alerts BRUNO via WhatsApp + dashboard
 * when a new pending request lands.
 * Path: server/src/whatsapp/notifications.ts
 */

import type { PendingRequest } from './types.js';
import type { BaseWhatsAppProvider } from './providers/base.js';
import { createNotification } from '../utils/whatsapp-db.js';
import { NOTIFICATION_ENABLED } from './classifier-config.js';

const BRUNO_WHATSAPP = process.env.BRUNO_WHATSAPP_NUMBER || '';

/**
 * Send a notification to BRUNO about a new pending request.
 * Dual channel: WhatsApp message + dashboard notification.
 */
export async function notifyBruno(
  request: PendingRequest,
  provider: BaseWhatsAppProvider
): Promise<void> {
  if (!NOTIFICATION_ENABLED) {
    console.log('[notify] Notifications disabled, skipping');
    return;
  }

  const title = `New request from ${request.senderName}`;
  const message = [
    `New pending request from ${request.senderName}`,
    `Intent: ${request.classification.intent} (${(request.classification.confidence * 100).toFixed(0)}%)`,
    `Summary: ${request.classification.summary}`,
    `Message: ${request.rawMessage.slice(0, 100)}${request.rawMessage.length > 100 ? '...' : ''}`,
    '',
    'Review in dashboard or reply APPROVE/DISMISS.',
  ].join('\n');

  // 1. Dashboard notification
  try {
    createNotification({
      type: 'new_pending_request',
      title,
      message,
      requestId: request.id,
    });
    console.log(`[notify] Dashboard notification created for request ${request.id}`);
  } catch (err) {
    console.error('[notify] Failed to create dashboard notification:', err);
  }

  // 2. WhatsApp notification to BRUNO
  if (BRUNO_WHATSAPP) {
    try {
      await provider.sendMessage(BRUNO_WHATSAPP, message);
      console.log(`[notify] WhatsApp notification sent to BRUNO for request ${request.id}`);
    } catch (err) {
      console.error('[notify] Failed to send WhatsApp notification:', err);
    }
  } else {
    console.warn('[notify] BRUNO_WHATSAPP_NUMBER not configured, skipping WhatsApp notification');
  }
}