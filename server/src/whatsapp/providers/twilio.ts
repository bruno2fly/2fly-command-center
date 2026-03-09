/**
 * Twilio WhatsApp provider implementation.
 * Path: server/src/whatsapp/providers/twilio.ts
 */

import { Request } from 'express';
import twilio from 'twilio';
import { BaseWhatsAppProvider } from './base.js';
import type { InboundMessage, WhatsAppProviderConfig } from '../types.js';

export class TwilioWhatsAppProvider extends BaseWhatsAppProvider {
  private client: twilio.Twilio;

  constructor(config: WhatsAppProviderConfig) {
    super(config);
    this.client = twilio(
      config.accountSid || process.env.TWILIO_ACCOUNT_SID!,
      config.authToken || process.env.TWILIO_AUTH_TOKEN!
    );
  }

  get name(): string {
    return 'twilio';
  }

  validateWebhook(req: Request): boolean {
    // Skip signature validation in dev when behind Cloudflare Tunnel (signature fails due to URL/header changes)
    if (process.env.SKIP_TWILIO_SIGNATURE_VALIDATION === 'true') {
      console.warn('[twilio] SKIP_TWILIO_SIGNATURE_VALIDATION is set — signature check bypassed. Re-enable in production!');
      return true;
    }
    const authToken = this.config.authToken || process.env.TWILIO_AUTH_TOKEN;
    if (authToken && req.headers['x-twilio-signature']) {
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      return twilio.validateRequest(
        authToken,
        req.headers['x-twilio-signature'] as string,
        url,
        req.body
      );
    }
    const webhookSecret = this.config.webhookSecret || process.env.TWILIO_WEBHOOK_AUTH_TOKEN;
    if (webhookSecret) {
      return req.headers['x-webhook-secret'] === webhookSecret;
    }
    if (process.env.NODE_ENV === 'production') {
      console.warn('[twilio] No webhook validation configured in production!');
      return false;
    }
    return true;
  }

  parseInboundMessage(req: Request): InboundMessage {
    const body = req.body as Record<string, string>;
    const numMedia = parseInt(body.NumMedia || '0', 10);
    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      if (body[`MediaUrl${i}`]) mediaUrls.push(body[`MediaUrl${i}`]);
      if (body[`MediaContentType${i}`]) mediaTypes.push(body[`MediaContentType${i}`]);
    }
    return {
      messageId: body.MessageSid || `twilio_${Date.now()}`,
      from: body.From || '',
      senderName: body.ProfileName || body.From || 'Unknown',
      senderId: body.WaId || body.From?.replace('whatsapp:', '') || '',
      body: body.Body || '',
      timestamp: Date.now(),
      mediaUrls,
      mediaTypes,
      raw: { ...body },
      provider: 'twilio',
    };
  }

  async sendMessage(to: string, messageBody: string): Promise<void> {
    await this.sendMessageWithSid(to, messageBody);
  }

  /** Send message and return Twilio SID, or throws with lastError for debugging */
  lastSendError: string | null = null;

  async sendMessageWithSid(to: string, messageBody: string): Promise<string | null> {
    const fromNumber =
      this.config.whatsappNumber ||
      process.env.TWILIO_WHATSAPP_FROM ||
      process.env.TWILIO_WHATSAPP_NUMBER;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    if (!fromNumber) {
      console.error('[twilio] No TWILIO_WHATSAPP_NUMBER configured');
      return null;
    }
    try {
      const msg = await this.client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: messageBody,
      });
      console.log(`[twilio] Sent message to ${to} (sid: ${msg.sid})`);
      return msg.sid;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const restErr = err && typeof err === 'object' && 'code' in err ? err as { code?: number; message?: string; status?: number; moreInfo?: string } : null;
      this.lastSendError = restErr?.message || errMsg;
      console.error(`[twilio] Failed to send: code=${restErr?.code}, status=${restErr?.status}, message=${restErr?.message}`);
      return null;
    }
  }

  getWebhookResponse(): { contentType: string; body: string } {
    return {
      contentType: 'text/xml',
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  }
}
