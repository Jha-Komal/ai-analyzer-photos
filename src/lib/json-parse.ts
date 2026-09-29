/** Strips markdown code fences if the model wrapped its JSON in them, then parses. */
export function parseJsonSafe<T>(raw: string): T | null {
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1];
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
