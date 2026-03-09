/**
 * Instagram connection store.
 * Persists clientId → { accessToken, username, instagramUserId }.
 * Uses JSON file for dev; swap for DB in production.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type InstagramConnection = {
  clientId: string;
  accessToken: string;
  username: string;
  instagramUserId: string;
  expiresAt?: number; // optional expiry
};

const STORE_PATH = path.join(process.cwd(), "data", "instagram-connections.json");
const memoryStore = new Map<string, InstagramConnection>();

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(STORE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readStore(): Promise<Record<string, InstagramConnection>> {
  if (existsSync(STORE_PATH)) {
    try {
      const data = await readFile(STORE_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return Object.fromEntries(memoryStore);
    }
  }
  return Object.fromEntries(memoryStore);
}

async function writeStore(data: Record<string, InstagramConnection>): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(STORE_PATH, JSON.stringify(data, null, 2));
  } catch {
    // Fallback: update memory only (serverless / read-only FS)
  }
}

export async function getConnection(clientId: string): Promise<InstagramConnection | null> {
  const store = await readStore();
  return store[clientId] ?? memoryStore.get(clientId) ?? null;
}

export async function setConnection(conn: InstagramConnection): Promise<void> {
  const store = await readStore();
  store[conn.clientId] = conn;
  memoryStore.set(conn.clientId, conn);
  await writeStore(store);
}

export async function deleteConnection(clientId: string): Promise<void> {
  const store = await readStore();
  delete store[clientId];
  memoryStore.delete(clientId);
  await writeStore(store);
}
