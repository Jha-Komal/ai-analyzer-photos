import { sleep } from "./rateLimiter.mjs";

export async function withRetry(fn, { retries = 3, baseDelayMs = 1000, maxDelayMs = 30000, label = "task" } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.3;
      console.warn(`[retry] ${label} failed (attempt ${attempt + 1}/${retries + 1}): ${err.message}. Retrying in ${Math.round(backoff + jitter)}ms`);
      await sleep(backoff + jitter);
    }
  }
  throw lastErr;
}
