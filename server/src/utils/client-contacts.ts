/**
 * server/src/utils/client-contacts.ts
 * Client contacts allowlist — only registered client numbers get processed.
 * BRUNO's number is excluded from intake (he only gets notifications).
 * Path: server/src/utils/client-contacts.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_DIR = join(process.cwd(), 'data');
const CONTACTS_FILE = join(DB_DIR, 'whatsapp-contacts.json');

// Ensure data dir exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// ── Contact types ───
export type ContactRole = 'client' | 'team' | 'owner';

export interface ClientContact {
  id: string;
  phone: string; // Normalized: "+15551234567" (no whatsapp: prefix)
  name: string;
  company?: string;
  role: ContactRole;
  active: boolean; // Inactive contacts are ignored
  addedAt: number;
  notes?: string;
}

// ── JSON helpers ───
function readContacts(): ClientContact[] {
  if (!existsSync(CONTACTS_FILE)) {
    writeFileSync(CONTACTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  return JSON.parse(readFileSync(CONTACTS_FILE, 'utf-8'));
}

function writeContacts(contacts: ClientContact[]): void {
  writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf-8');
}

function generateId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize a phone number for comparison.
 * Strips "whatsapp:" prefix, spaces, dashes, parens.
 * Returns just digits with leading +.
 */
export function normalizePhone(phone: string): string {
  return phone
    .replace(/^whatsapp:/, '')
    .replace(/[\s\-\(\)]/g, '')
    .replace(/^(\d)/, '+$1'); // Ensure leading +
}

// ── Core check: is this number allowed? ───

/**
 * Check if a phone number is in the allowlist.
 * Only active clients and team members pass.
 * Owner (BRUNO) is NOT in the intake pipeline — he only gets notified.
 */
export function isAllowedNumber(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const contacts = readContacts();
  return contacts.some(
    (c) => c.active && (c.role === 'client' || c.role === 'team') && normalizePhone(c.phone) === normalized
  );
}

/**
 * Get contact info for a phone number (if registered).
 */
export function getContactByPhone(phone: string): ClientContact | undefined {
  const normalized = normalizePhone(phone);
  return readContacts().find(
    (c) => normalizePhone(c.phone) === normalized
  );
}

/**
 * Check if a number belongs to BRUNO (owner).
 * Owner messages are never processed as intake — they're commands or ignored.
 */
export function isOwnerNumber(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const ownerNum = normalizePhone(process.env.BRUNO_WHATSAPP_NUMBER || '');
  if (ownerNum && normalized === ownerNum) return true;
  const contacts = readContacts();
  return contacts.some(
    (c) => c.role === 'owner' && normalizePhone(c.phone) === normalized
  );
}

/**
 * Check if a number belongs to a team member.
 * Team messages could be routed differently in the future.
 */
export function isTeamNumber(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const contacts = readContacts();
  return contacts.some(
    (c) => c.role === 'team' && c.active && normalizePhone(c.phone) === normalized
  );
}

// ── CRUD operations ───

export function getAllContacts(): ClientContact[] {
  return readContacts();
}

export function getActiveClients(): ClientContact[] {
  return readContacts().filter((c) => c.active && c.role === 'client');
}

export function addContact(
  data: Omit<ClientContact, 'id' | 'addedAt'>
): ClientContact {
  const contacts = readContacts();

  const normalized = normalizePhone(data.phone);
  const existing = contacts.find(
    (c) => normalizePhone(c.phone) === normalized
  );
  if (existing) {
    throw new Error(`Contact with phone ${data.phone} already exists (${existing.name})`);
  }

  const newContact: ClientContact = {
    ...data,
    phone: normalized,
    id: generateId(),
    addedAt: Date.now(),
  };
  contacts.push(newContact);
  writeContacts(contacts);
  console.log(`[contacts] Added ${data.role}: ${data.name} (${normalized})`);
  return newContact;
}

export function updateContact(
  id: string,
  updates: Partial<Omit<ClientContact, 'id' | 'addedAt'>>
): ClientContact | null {
  const contacts = readContacts();
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return null;
  if (updates.phone) updates.phone = normalizePhone(updates.phone);
  contacts[index] = { ...contacts[index], ...updates };
  writeContacts(contacts);
  return contacts[index];
}

export function removeContact(id: string): boolean {
  const contacts = readContacts();
  const filtered = contacts.filter((c) => c.id !== id);
  if (filtered.length === contacts.length) return false;
  writeContacts(filtered);
  return true;
}

export function deactivateContact(id: string): ClientContact | null {
  return updateContact(id, { active: false });
}

export function activateContact(id: string): ClientContact | null {
  return updateContact(id, { active: true });
}
