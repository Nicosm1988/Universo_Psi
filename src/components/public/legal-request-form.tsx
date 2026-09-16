"use client";
import { useRef, useState, type FormEvent } from "react";
import { legalRequestKinds } from "@/lib/validation/legal-request";

export function LegalRequestForm({ initialKind = "COMPLAINT" }: { initialKind?: keyof typeof legalRequestKinds }) {
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; receivedAt: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/solicitudes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: form.get("kind"), email: form.get("email"), message: form.get("message"), requestId: requestId.current }) });
      const data = await response.json();
      if (!response.ok || typeof data.reference !== "string") throw new Error(data.message ?? "No se pudo registrar la solicitud.");
      setReceipt(data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá tu conexión y reintentá."); }
    finally { pending.current = false; setBusy(false); }
  }
  if (receipt) return <div role="status" className="rounded-2xl border border-line bg-mist p-6"><h2 className="text-xl font-semibold text-ink">Solicitud registrada</h2><p className="mt-3 break-all">Constancia: <strong>{receipt.reference}</strong></p><p className="mt-2">Recibida: {new Date(receipt.receivedAt).toLocaleString("es-AR")}</p><p className="mt-3">Guardá esta constancia. El equipo revisará tu pedido y se comunicará al correo informado. Registrar el pedido no confirma que un cobro haya sido cancelado ni que los datos hayan sido eliminados.</p><button type="button" className="mt-4 min-h-11 rounded-full border border-line px-5 font-semibold" onClick={() => window.print()}>Imprimir o guardar constancia</button></div>;
  const field = "mt-2 min-h-11 w-full rounded-xl border border-line bg-paper p-3 text-ink";
  return <form onSubmit={submit} className="space-y-5">
    <label className="block font-semibold">Qué necesitás<select name="kind" defaultValue={initialKind} className={field}>{Object.entries(legalRequestKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block font-semibold">Correo de contacto<input name="email" type="email" autoComplete="email" required maxLength={254} className={field} /></label>
    <label className="block font-semibold">Detalle del pedido<textarea name="message" required minLength={10} maxLength={2000} rows={5} className={field} aria-describedby="request-help" /></label>
    <p id="request-help" className="text-sm text-muted">Indicá el servicio o la operación, si corresponde. No envíes contraseñas, códigos, datos de tarjeta ni información clínica. Usaremos estos datos para tramitar tu pedido; podemos verificar tu identidad antes de ejecutar cambios.</p>
    {error ? <p role="alert" className="text-red-700">{error}</p> : null}
    <button disabled={busy} className="min-h-11 rounded-full bg-senda px-6 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Registrando…" : "Registrar solicitud"}</button>
  </form>;
}
