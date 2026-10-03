import { parseJsonSafe } from "./json-parse";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite";

type JsonOptions = { maxTokens?: number; timeoutMs?: number };

/** One chat call that must return a JSON object. Returns null on any failure so callers can degrade. */
export async function completeJsonObject<T>(system: string, user: string, options: JsonOptions = {}): Promise<T | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
  const { maxTokens = 700, timeoutMs = 20_000 } = options;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
      const parsed = parseJsonSafe<T>(body.choices?.[0]?.message?.content ?? "");
      if (parsed) return parsed;
    } catch (err) {
      if (attempt === 1) console.warn(`[openrouter] ${err instanceof Error ? err.message : err}`);
    }
  }
  return null;
}
