/**
 * Daily founder digest service
 * TODO: Connect to email/WhatsApp. For now, generates summary for in-app display.
 */

import { MOCK_TASKS } from "./founderData";
import { MOCK_INVOICES } from "./founderData";
import { getAtRiskMrr } from "./founderData";
import type { Client } from "./mockData";

export type DailyDigest = {
  todaysFive: Array<{ title: string; client: string; priority: string }>;
  cashInToday: number;
  invoicesOverdue: number;
  invoicesOutToday: number;
  atRiskMrr: number;
  atRiskClientCount: number;
};

export function generateDailyDigest(
  atRiskClientIds: string[]
): DailyDigest {
  const todaysFive = MOCK_TASKS.slice(0, 8).map((t) => ({
    title: t.title,
    client: t.clientName,
    priority: t.priority,
  }));

  const expectedToday = MOCK_INVOICES.filter(
    (i) => i.status === "expected_today" || i.status === "due_today"
  );
  const overdue = MOCK_INVOICES.filter((i) => i.status === "overdue");

  const cashInToday = expectedToday.reduce((s, i) => s + i.amount, 0);
  const invoicesOverdue = overdue.reduce((s, i) => s + i.amount, 0);
  const invoicesOutToday = 0; // TODO: add outbound invoices when available

  const atRiskMrr = getAtRiskMrr(atRiskClientIds);
  const atRiskClientCount = atRiskClientIds.length;

  return {
    todaysFive,
    cashInToday,
    invoicesOverdue,
    invoicesOutToday,
    atRiskMrr,
    atRiskClientCount,
  };
}
