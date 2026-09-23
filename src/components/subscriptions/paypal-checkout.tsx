"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
export function PayPalCheckout({ subscriptionId, available, price }: { subscriptionId: string; available: boolean; price: string | null }) {
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function checkout() {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError(null);
    try {
      const response = await fetch("/api/subscriptions/paypal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId }) });
      const result = await response.json();
      if (!response.ok || !result.ok || typeof result.redirectUrl !== "string") throw new Error(result.message ?? "No pudimos abrir PayPal. Volvé a intentar.");
      const url = new URL(result.redirectUrl, window.location.origin);
      if (url.origin !== window.location.origin && (url.protocol !== "https:" || !["www.sandbox.paypal.com", "www.paypal.com"].includes(url.hostname) || url.username || url.password || url.port)) throw new Error("No pudimos abrir PayPal.");
      window.location.assign(url.href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos abrir PayPal. Volvé a intentar."); lock.current = false; setLoading(false); }
  }
  return <div className="mt-6 space-y-4">
    <p>El pago se completa de forma segura en PayPal. El email de PayPal puede ser distinto del de Universo Psi.</p>
    {price ? <p className="font-semibold">{price}</p> : null}
    {!available ? <p role="status" className="text-sm text-muted">PayPal todavía no está disponible para este pago.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <Button type="button" disabled={!available || loading} aria-busy={loading} onClick={checkout}>{loading ? "Abriendo PayPal…" : error ? "Reintentar con PayPal" : "Pagar con PayPal"}</Button>
    <p className="text-sm text-muted">La membresía se confirma después de verificar el pago.</p>
  </div>;
}
