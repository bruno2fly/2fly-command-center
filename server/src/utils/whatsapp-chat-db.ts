/**
 * server/src/utils/whatsapp-chat-db.ts
 * Prisma-based storage for WhatsApp chat dashboard (conversations + messages).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OUR_NUMBER = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+13637770337';

/** Normalize contact number for conversation lookup (use contact's number as key) */
function getContactNumber(from: string, to: string): string {
  // The "other" party is the contact; we are the business
  const normalized = (n: string) => n.startsWith('whatsapp:') ? n : `whatsapp:${n}`;
  const fromN = normalized(from);
  const toN = normalized(to);
  return fromN === OUR_NUMBER ? toN : fromN;
}

/** Find or create conversation for a contact number */
export async function getOrCreateConversation(
  contactNumber: string,
  contactName?: string | null
): Promise<{ id: string }> {
  const normalized = contactNumber.startsWith('whatsapp:') ? contactNumber : `whatsapp:${contactNumber}`;
  let conv = await prisma.whatsappConversation.findFirst({
    where: { contactNumber: normalized },
  });
  if (!conv) {
    conv = await prisma.whatsappConversation.create({
      data: {
        contactNumber: normalized,
        contactName: contactName ?? null,
      },
    });
  } else if (contactName && conv.contactName !== contactName) {
    conv = await prisma.whatsappConversation.update({
      where: { id: conv.id },
      data: { contactName },
    });
  }
  return { id: conv.id };
}

/** Save inbound message from webhook */
export async function saveInboundMessage(params: {
  fromNumber: string;
  toNumber: string;
  body: string;
  twilioSid: string;
  contactName?: string;
}): Promise<void> {
  const contactNum = getContactNumber(params.fromNumber, params.toNumber);
  const { id: conversationId } = await getOrCreateConversation(contactNum, params.contactName);

  await prisma.whatsappMessage.create({
    data: {
      conversationId,
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      body: params.body,
      direction: 'inbound',
      status: 'delivered',
      twilioSid: params.twilioSid,
    },
  });

  await prisma.whatsappConversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: params.body.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
      contactName: params.contactName ?? undefined,
    },
  });
}

/** Save outbound message after sending via Twilio */
export async function saveOutboundMessage(params: {
  conversationId: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  twilioSid: string;
}): Promise<void> {
  await prisma.whatsappMessage.create({
    data: {
      conversationId: params.conversationId,
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      body: params.body,
      direction: 'outbound',
      status: 'sent',
      twilioSid: params.twilioSid,
    },
  });

  await prisma.whatsappConversation.update({
    where: { id: params.conversationId },
    data: {
      lastMessage: params.body.slice(0, 200),
      lastMessageAt: new Date(),
    },
  });
}

/** Fetch all conversations sorted by last message */
export async function getConversations(search?: string) {
  const where = search
    ? {
        OR: [
          { contactNumber: { contains: search } },
          { contactName: { contains: search } },
        ],
      }
    : {};
  return prisma.whatsappConversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });
}

/** Fetch messages for a conversation */
export async function getMessages(conversationId: string, limit = 100) {
  return prisma.whatsappMessage.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'asc' },
    take: limit,
  });
}

/** Mark conversation as read */
export async function markConversationRead(conversationId: string): Promise<void> {
  await prisma.whatsappConversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  });
}

/** Get conversation by ID */
export async function getConversationById(id: string) {
  return prisma.whatsappConversation.findUnique({
    where: { id },
  });
}
