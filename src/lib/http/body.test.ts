import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { readJsonBody, RequestBodyTooLargeError } from "./body";

describe("readJsonBody", () => {
  it("parses JSON within the configured byte limit", async () => {
    const request = new NextRequest("http://localhost/api/example", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });

    await expect(readJsonBody(request, 128)).resolves.toEqual({ ok: true });
  });

  it("rejects a streamed body after it exceeds the limit", async () => {
    const request = new NextRequest("http://localhost/api/example", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(256) }),
    });

    await expect(readJsonBody(request, 64)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects an oversized declared content length before reading", async () => {
    const request = new NextRequest("http://localhost/api/example", {
      method: "POST",
      headers: { "content-length": "4096" },
      body: "{}",
    });

    await expect(readJsonBody(request, 64)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});
