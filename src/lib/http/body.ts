import type { NextRequest } from "next/server";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size.");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readJsonBody(
  request: NextRequest,
  maximumBytes: number,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return JSON.parse("") as unknown;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximumBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}
