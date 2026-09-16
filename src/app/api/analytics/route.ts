import { NextResponse } from "next/server";

// Reject obsolete clients too: disabling only the UI would still collect data.
export function POST() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
