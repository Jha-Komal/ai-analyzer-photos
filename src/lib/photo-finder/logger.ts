import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { RetrievalSession } from "@/types/photo-finder";
import { loadTasks } from "./library";

/**
 * Research logging. Rows are queued during a request and sent as one batch to a
 * Google Sheet through an Apps Script web app (SHEETS_WEBHOOK_URL + SHEETS_SECRET).
 * Without those, local dev falls back to data/mvp/logs/*.jsonl. Logging must never
 * break or slow the UI: flushing runs in after() and swallows its own errors.
 */
export type LogKind = "event" | "session" | "round" | "clue" | "error";

type Row = Record<string, string | number | boolean | null>;
type Item = { kind: LogKind; row: Row };

/** Rows wait here until flushLogs() sends them as ONE webhook call (Apps Script writes take ~2.5s each). */
const queue: Item[] = [];

export const log = (kind: LogKind, row: Row): void => {
  queue.push({ kind, row: { timestamp: new Date().toISOString(), ...row } });
};

async function writeLocal(items: Item[]): Promise<void> {
  const dir = path.join(process.cwd(), "data/mvp/logs");
  await mkdir(dir, { recursive: true });
  for (const { kind, row } of items) await appendFile(path.join(dir, `${kind}s.jsonl`), JSON.stringify(row) + "\n");
}

/** Sends everything queued so far. Call it inside next/server `after()` so it never blocks a response. Never throws. */
export async function flushLogs(): Promise<void> {
  if (queue.length === 0) return;
  const items = queue.splice(0, queue.length);
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  try {
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids a CORS-style preflight on Apps Script
        body: JSON.stringify({ secret: process.env.SHEETS_SECRET ?? "", rows: items }),
        redirect: "follow",
        signal: AbortSignal.timeout(25_000),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) throw new Error(`Sheets webhook rejected the batch: ${body?.error ?? res.status}`);
    } else if (!process.env.VERCEL) {
      await writeLocal(items);
    }
  } catch (err) {
    console.warn(`[photo-finder log] ${items.length} rows not sent:`, err instanceof Error ? err.message : err);
    if (!process.env.VERCEL) await writeLocal(items).catch(() => {}); // dev: never lose rows
  }
}

export type LogContext = { testerId?: string; taskId?: string };

export function logEvent(event: string, session: RetrievalSession, ctx: LogContext, payload: unknown = {}): void {
  log("event", {
    session_id: session.id,
    tester_id: ctx.testerId ?? null,
    task_id: ctx.taskId ?? null,
    event_name: event,
    round: session.rounds.length,
    payload_json: JSON.stringify(payload),
  });
}

export async function logRound(session: RetrievalSession, ctx: LogContext, extra: { latencyMs: number; degraded: boolean }): Promise<void> {
  const round = session.rounds[session.rounds.length - 1];
  if (!round) return;
  const target = ctx.taskId ? (await loadTasks()).find((t) => t.id === ctx.taskId)?.targetId : undefined;
  const position = target ? round.candidateImageIds.indexOf(target) : -1;
  const newClues = session.clues.filter((c) => round.extractedClues.some((e) => e === c.text || e === `not ${c.text}`));
  log("round", {
    session_id: session.id,
    tester_id: ctx.testerId ?? null,
    task_id: ctx.taskId ?? null,
    round: round.roundNumber,
    user_input: round.userInput ?? null,
    anchor_id: round.anchorImageId ?? null,
    positive_clues: newClues.filter((c) => c.polarity === "positive").map((c) => c.text).join("; "),
    negative_clues: newClues.filter((c) => c.polarity === "negative").map((c) => c.text).join("; "),
    candidate_ids: round.candidateImageIds.join(","),
    target_position_in_grid: target ? (position === -1 ? "not shown" : position + 1) : null,
    latency_ms: extra.latencyMs,
    llm_degraded: extra.degraded,
  });
  for (const c of newClues) {
    log("clue", {
      session_id: session.id,
      round: round.roundNumber,
      clue_text: c.text,
      source: c.source,
      polarity: c.polarity,
      removed_by_user: !!c.removed,
    });
  }
}

export async function logSessionEnd(
  session: RetrievalSession,
  ctx: LogContext,
  outcome: "found" | "abandoned",
  metrics: { candidatesViewed: number; totalSeconds: number; rounds: number },
): Promise<void> {
  const target = ctx.taskId ? (await loadTasks()).find((t) => t.id === ctx.taskId)?.targetId : undefined;
  log("session", {
    session_id: session.id,
    tester_id: ctx.testerId ?? null,
    task_id: ctx.taskId ?? null,
    target_photo_id: target ?? null,
    started_at: session.startedAt,
    completed_at: new Date().toISOString(),
    outcome,
    selected_photo_id: session.selectedTargetImageId ?? null,
    found_correct_target: target && session.selectedTargetImageId ? session.selectedTargetImageId === target : null,
    rounds: metrics.rounds,
    candidates_viewed: metrics.candidatesViewed,
    total_seconds: Math.round(metrics.totalSeconds),
    refinements: session.rounds.filter((r) => r.userInput).length,
    anchors_selected: session.anchorImageIds.length,
    rejected_count: session.rejectedImageIds.length,
    initial_query: session.originalQuery,
  });
}
