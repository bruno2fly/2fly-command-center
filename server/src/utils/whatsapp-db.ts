/**
 * server/src/utils/whatsapp-db.ts
 * Database layer for WhatsApp intake pipeline.
 * Follows existing 2fly-client-portal JSON file pattern.
 * Path: server/src/utils/whatsapp-db.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type {
  PendingRequest,
  PendingRequestStatus,
  WhatsAppTask,
  ClassifierLogEntry,
  DashboardNotification,
} from '../whatsapp/types.js';

const DB_DIR = join(process.cwd(), 'data');
const REQUESTS_FILE = join(DB_DIR, 'whatsapp-requests.json');
const TASKS_FILE = join(DB_DIR, 'whatsapp-tasks.json');
const LOGS_FILE = join(DB_DIR, 'whatsapp-classifier-logs.json');
const NOTIFICATIONS_FILE = join(DB_DIR, 'whatsapp-notifications.json');

// Ensure data dir exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// ── Generic JSON helpers (same pattern as existing db.ts) ────────────
function readJSON<T>(file: string, defaultValue: T): T {
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf-8');
  }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function writeJSON<T>(file: string, data: T): void {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Pending Requests CRUD ───────────────────────────────────────────────

export function getRequests(status?: PendingRequestStatus): PendingRequest[] {
  const all = readJSON<PendingRequest[]>(REQUESTS_FILE, []);
  if (status) return all.filter((r) => r.status === status);
  return all;
}

export function getRequestById(id: string): PendingRequest | undefined {
  return getRequests().find((r) => r.id === id);
}

export function createRequest(data: Omit<PendingRequest, 'id' | 'createdAt' | 'status'>): PendingRequest {
  const requests = getRequests();
  const newRequest: PendingRequest = {
    ...data,
    id: generateId('req'),
    createdAt: Date.now(),
    status: 'pending',
  };
  requests.push(newRequest);
  writeJSON(REQUESTS_FILE, requests);
  return newRequest;
}

export function updateRequest(id: string, updates: Partial<PendingRequest>): PendingRequest | null {
  const requests = getRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  requests[index] = { ...requests[index], ...updates };
  writeJSON(REQUESTS_FILE, requests);
  return requests[index];
}

// ── WhatsApp Tasks CRUD ────────────────────────────────────────────────

export function getTasks(lane?: string): WhatsAppTask[] {
  const all = readJSON<WhatsAppTask[]>(TASKS_FILE, []);
  if (lane) return all.filter((t) => t.lane === lane);
  return all;
}

export function createTask(data: Omit<WhatsAppTask, 'id' | 'createdAt'>): WhatsAppTask {
  const tasks = getTasks();
  const newTask: WhatsAppTask = {
    ...data,
    id: generateId('task'),
    createdAt: Date.now(),
  };
  tasks.push(newTask);
  writeJSON(TASKS_FILE, tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<WhatsAppTask>): WhatsAppTask | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  writeJSON(TASKS_FILE, tasks);
  return tasks[index];
}

// ── Classifier Decision Logs ───────────────────────────────────────────

export function getLogs(limit = 100): ClassifierLogEntry[] {
  const all = readJSON<ClassifierLogEntry[]>(LOGS_FILE, []);
  return all.slice(-limit);
}

export function addLog(entry: Omit<ClassifierLogEntry, 'id' | 'timestamp'>): ClassifierLogEntry {
  const logs = readJSON<ClassifierLogEntry[]>(LOGS_FILE, []);
  const newEntry: ClassifierLogEntry = {
    ...entry,
    id: generateId('log'),
    timestamp: Date.now(),
  };
  logs.push(newEntry);
  // Keep only last 1000 logs
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  writeJSON(LOGS_FILE, logs);
  return newEntry;
}

// ── Dashboard Notifications ───────────────────────────────────────────

export function getNotifications(unreadOnly = false): DashboardNotification[] {
  const all = readJSON<DashboardNotification[]>(NOTIFICATIONS_FILE, []);
  if (unreadOnly) return all.filter((n) => !n.read);
  return all;
}

export function createNotification(
  data: Omit<DashboardNotification, 'id' | 'createdAt' | 'read'>
): DashboardNotification {
  const notifications = getNotifications();
  const newNotification: DashboardNotification = {
    ...data,
    id: generateId('notif'),
    read: false,
    createdAt: Date.now(),
  };
  notifications.push(newNotification);
  writeJSON(NOTIFICATIONS_FILE, notifications);
  return newNotification;
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const index = notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications[index].read = true;
    writeJSON(NOTIFICATIONS_FILE, notifications);
  }
}

export function getUnreadCount(): number {
  return getNotifications(true).length;
}
