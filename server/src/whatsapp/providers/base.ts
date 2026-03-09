/**
 * server/src/whatsapp/providers/base.ts
 * Abstract provider interface -- implement this to add a new WhatsApp provider.
 * Path: server/src/whatsapp/providers/base.ts
 */

import { Request } from 'express';
import type { InboundMessage, WhatsAppProviderConfig } from '../types.js';

export abstract class BaseWhatsAppProvider {
  protected config: WhatsAppProviderConfig;

  constructor(config: WhatsAppProviderConfig) {
    this.config = config;
  }

  /** Provider name identifier */
  abstract get name(): string;

  /**
   * Validate that an incoming webhook request is authentic.
   * Return true if valid, false if it should be rejected.
   */
  abstract validateWebhook(req: Request): boolean;

  /**
   * Parse raw webhook payload into normalized InboundMessage.
   * Twilio sends application/x-www-form-urlencoded, Meta sends JSON, etc.
   */
  abstract parseInboundMessage(req: Request): InboundMessage;

  /**
   * Send an outbound WhatsApp message (used for notifications).
   */
  abstract sendMessage(to: string, body: string): Promise<void>;

  /**
   * Generate a TwiML or equivalent response to acknowledge the webhook.
   * Return { contentType, body } for the HTTP response.
   */
  abstract getWebhookResponse(): { contentType: string; body: string };
}
