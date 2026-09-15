import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal/auth";
import { credentialFileType, MAX_CREDENTIAL_BYTES } from "@/lib/security/credential-file";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data: objectPath, error } = await supabase.rpc("admin_credential_object", { p_credential_id: parsed.data });
  if (error || typeof objectPath !== "string") return new NextResponse(null, { status: 404 });
  const result = await supabase.storage.from("professional-credentials").download(objectPath);
  if (result.error || !result.data) return new NextResponse(null, { status: 404 });
  if (result.data.size > MAX_CREDENTIAL_BYTES) return new NextResponse(null, { status: 413 });
  const bytes = new Uint8Array(await result.data.arrayBuffer());
  const type = credentialFileType(bytes);
  if (!type) return NextResponse.json({ error: "El archivo no tiene un formato PDF, JPG o PNG reconocible. Solicitá una nueva copia." }, { status: 422 });
  return new NextResponse(bytes, { headers: {
    "Content-Type": type.mime,
    "Content-Disposition": `attachment; filename="credencial-${parsed.data}.${type.extension}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  } });
}
