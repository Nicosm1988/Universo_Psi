"use client";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/button";

export function RestartPendingCheckout({ subscriptionId }: { subscriptionId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <form className="mt-6 space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/subscriptions/card/restart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId, confirmCancelPending: true }) });
      const data: { ok?: boolean; redirectUrl?: string; message?: string } = await response.json();
      if (!response.ok || !data.ok || !data.redirectUrl?.startsWith("/dashboard/suscripcion/pagar?subscriptionId=")) throw new Error();
      window.location.assign(data.redirectUrl);
    } catch {
      setError("No pudimos reiniciar el intento. Revisá tu suscripción o contactanos antes de intentar nuevamente.");
      setPending(false);
    }
  }}>
    <p className="text-sm leading-6 text-muted">Ya hay un intento anterior registrado. Si todavía no autorizaste el débito, podés cancelarlo para ingresar otra tarjeta o un correo de pagador distinto. La operación conserva el historial.</p>
    <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 size-5" />Quiero cancelar el intento pendiente y comenzar uno nuevo.</label>
    <button className={buttonStyles({ variant: "secondary" })} disabled={pending}>{pending ? "Revisando el intento…" : "Cancelar intento y comenzar de nuevo"}</button>
    {error ? <p role="alert" className="text-sm">{error}</p> : null}
  </form>;
}
