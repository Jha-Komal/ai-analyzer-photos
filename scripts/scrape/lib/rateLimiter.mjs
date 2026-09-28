function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRateLimiter(minMs, maxMs) {
  return async function throttle() {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await sleep(delay);
  };
}

export { sleep };
