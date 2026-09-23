import "server-only";

import { setTimeout as delay } from "node:timers/promises";

// PostgREST already retries network errors, 503 and 520. Its current SDK does
// not retry gateway 502/504 responses, which can interrupt catalog prerendering.
// Keep this adapter on the anonymous catalog client, never payment writes.
export const fetchPublicCatalog: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : undefined;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const signal = init?.signal ?? request?.signal;

  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted();
    const response = await fetch(input, attempt === 0 ? init : {
      ...init,
      // A retry must reach the provider, not reuse Next's render memoization.
      cache: "no-store",
      signal: signal ?? new AbortController().signal,
    });
    if (method !== "GET" || ![502, 504].includes(response.status) || attempt === 2) {
      return response;
    }
    // Next may hold another branch of a cloned response for memoization.
    // Awaiting cancellation of our branch would wait for that unread branch.
    void response.body?.cancel().catch(() => undefined);
    await delay(250 * (attempt + 1), undefined, { signal: signal ?? undefined });
  }
};
