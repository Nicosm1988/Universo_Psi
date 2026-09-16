"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { safeInternalPath } from "@/lib/http/origin";
import { createClient } from "@/lib/supabase/client";

export function SecuritySettings({ factors, verified, next, canAdmin }: { canAdmin: boolean; factors: { id: string; name: string }[]; verified: boolean; next: string }) {
  const [factorId, setFactorId] = useState(factors[0]?.id ?? "");
  const [enrollment, setEnrollment] = useState<{ qr: string; secret: string }>();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function perform(task: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try { await task(); } catch { setMessage("No pudimos completar la operación. Revisá tu conexión e intentá nuevamente."); }
    finally { busy.current = false; setPending(false); }
  }
  function enroll() {
    void perform(async () => {
      const supabase = createClient();
      // Clear abandoned, unverified enrollments only. Never remove a working factor.
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      for (const factor of listed.data.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Universo Psi", issuer: "Universo Psi" });
      if (error) throw error;
      setFactorId(data.id);
      const rawQr = data.totp.qr_code.trim();
      const svg = rawQr.startsWith("data:image/svg+xml") ? rawQr.slice(rawQr.indexOf(",") + 1) : rawQr;
      // Auth may return a data URI containing raw XML and trailing newlines.
      const qr = svg.includes("<")
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        : rawQr;
      setEnrollment({ qr, secret: data.totp.secret });
    });
  }
  function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setMessage("Ingresá los seis números de tu aplicación autenticadora."); return; }
    void perform(async () => {
      const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      setCode("");
      if (error) { setMessage("El código no es válido o venció. Usá el nuevo código de tu aplicación."); return; }
      setEnrollment(undefined);
      // Reload so server authorization and cookie-derived data use the upgraded session.
      window.location.assign(safeInternalPath(next));
    });
  }
  function closeOthers() {
    void perform(async () => {
      const { error } = await createClient().auth.signOut({ scope: "others" });
      if (error) throw error;
      setMessage("Cerraste las otras sesiones. Esta permanece abierta. Algunos accesos pueden seguir vigentes hasta que venza su token; la administración verifica la sesión en cada operación.");
    });
  }
  return <div className="mt-6 space-y-6">
    {!canAdmin ? null : verified ? <p role="status" className="text-sm font-semibold text-ink">Esta sesión ya tiene la segunda verificación.</p> : <>
      {!factorId ? <Button disabled={pending} onClick={enroll}>Configurar aplicación autenticadora</Button> : null}
      {enrollment ? <div className="space-y-3">
        <p className="text-sm text-muted">Escaneá este QR con tu aplicación autenticadora. Guardá la clave en un lugar seguro; permite recuperar el acceso si cambiás de teléfono.</p>
        <Image unoptimized src={enrollment.qr} alt="QR privado para configurar la segunda verificación" width={240} height={240} className="rounded-xl bg-white p-3" />
        <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ingresar la clave manualmente</summary><code className="break-all select-all text-sm">{enrollment.secret}</code></details>
      </div> : null}
      {factorId ? <form onSubmit={verify} className="space-y-4">
        {factors.length > 1 ? <label className="block text-sm font-semibold">Aplicación<select value={factorId} onChange={(event) => setFactorId(event.target.value)} className="mt-2 block min-h-11 rounded-xl border border-line bg-paper px-3">{factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></label> : null}
        <label className="block text-sm font-semibold text-ink">Código de seis números<input name="verificationCode" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-2 block min-h-11 w-full max-w-xs rounded-xl border border-line bg-paper px-3 text-ink" /></label>
        <Button type="submit" disabled={pending}>{pending ? "Verificando…" : "Verificar y continuar"}</Button>
      </form> : null}
    </>}
    <div className="border-t border-line pt-6"><h2 className="text-xl font-semibold">Otras sesiones</h2><p className="my-3 text-sm text-muted">Cerrá el acceso en otros dispositivos si dejaste tu cuenta abierta.</p><Button variant="secondary" disabled={pending} onClick={closeOthers}>Cerrar las otras sesiones</Button></div>
    {message ? <p role="status" className="text-sm text-ink">{message}</p> : null}
  </div>;
}
