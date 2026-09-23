"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import styles from "./subscription-card-form.module.css";

import { buttonStyles, Button } from "@/components/ui/button";
import { openCookiePreferences, useCookieConsent } from "@/lib/consent/use-cookie-consent";

type CardFormInstance = {
  getCardFormData(): { token?: string; cardholderEmail?: string };
  unmount(): void;
};
type MercadoPagoConstructor = new (publicKey: string, options: { locale: string }) => {
  cardForm(options: {
    amount: string; iframe: true;
    form: Record<string, string | { id: string; placeholder?: string }>;
    callbacks: { onFormMounted(error?: unknown): void; onReady(): void; onSubmit(event: Event): void; onError(error?: unknown): void };
  }): CardFormInstance;
};

// The document nonce is immutable until a full page load.
const subscribeToDocument = () => () => {};

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-paper px-3 py-3 text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/30";

export function SubscriptionCardForm({ subscriptionId, publicKey, amount, currency, nonce }: {
  subscriptionId: string; publicKey: string; amount: number; currency: string; nonce?: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const consent = useRef<HTMLInputElement>(null);
  // El SDK de Mercado Pago es una cookie de funcionalidades externas: no se
  // carga hasta que esa categoría esté habilitada en el banner.
  const cookieConsent = useCookieConsent();
  const externalAllowed = cookieConsent?.external === true;
  const submitting = useRef(false);
  const price = new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount);

  const documentStatus = useSyncExternalStore(
    subscribeToDocument,
    () => {
      const bootstrap = document.getElementById("universo-psi-document-bootstrap") as HTMLScriptElement | null;
      if (!nonce || !bootstrap?.nonce) return "missing";
      return bootstrap.nonce === nonce ? "ready" : "reload";
    },
    () => "loading",
  );
  useEffect(() => {
    // Next client navigation retains the initial document's CSP. Fetch a full
    // checkout document before loading the SDK so its scoped policy takes effect.
    if (documentStatus === "reload") window.location.reload();
  }, [documentStatus]);

  useEffect(() => {
    if (!sdkReady || documentStatus !== "ready") return;
    const Constructor = (window as Window & { MercadoPago?: MercadoPagoConstructor }).MercadoPago;
    if (!Constructor) return;
    let alive = true;
    const mp = new Constructor(publicKey, { locale: "es-AR" });
    const instance = mp.cardForm({
      amount: String(amount), iframe: true,
      form: {
        id: "subscription-card-form",
        cardNumber: { id: "subscription-card-number", placeholder: "Número de tarjeta" },
        expirationDate: { id: "subscription-card-expiration", placeholder: "MM/AA" },
        securityCode: { id: "subscription-card-security", placeholder: "Código de seguridad" },
        cardholderName: { id: "subscription-card-holder", placeholder: "Como figura en la tarjeta" },
        issuer: { id: "subscription-card-issuer" },
        installments: { id: "subscription-card-installments" },
        identificationType: { id: "subscription-card-id-type" },
        identificationNumber: { id: "subscription-card-id-number" },
        cardholderEmail: { id: "subscription-card-email" },
      },
      callbacks: {
        onFormMounted(error) {
          if (!alive) return;
          if (error) setMounted(false);
          if (error) setMessage("No pudimos cargar los campos de Mercado Pago. Recargá la página para intentar nuevamente.");
        },
        onReady() {
          if (alive) setMounted(true);
        },
        onError() {
          if (alive) setMessage("Revisá los datos de la tarjeta y volvé a intentar.");
        },
        onSubmit(event) {
          event.preventDefault();
          if (submitting.current || !consent.current?.checked) return;
          const { token, cardholderEmail } = instance.getCardFormData();
          if (!token || !cardholderEmail) {
            setMessage("Completá los datos de la tarjeta y el correo del pagador.");
            return;
          }
          submitting.current = true;
          setPending(true);
          setMessage("");
          void (async () => {
            try {
              const response = await fetch("/api/subscriptions/card", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId, cardTokenId: token, payerEmail: cardholderEmail, consent: true }),
              });
              const result: { ok?: boolean; status?: string; message?: string } = await response.json();
              if (!alive) return;
              if (response.ok && result.ok) {
                setSubmitted(true);
                setMessage(result.status === "ACTIVE" ? "Tu suscripción está activa. Confirmamos el pago con Mercado Pago." : "Recibimos la autorización del débito. Tu suscripción se activará cuando Mercado Pago confirme el pago.");
              } else {
                setMessage(result.message ?? "No pudimos confirmar la autorización. Volvé a intentar en unos minutos.");
              }
            } catch {
              if (alive) setMessage("No pudimos confirmar el resultado. Consultá tu suscripción antes de volver a intentar.");
            } finally {
              submitting.current = false;
              if (alive) setPending(false);
            }
          })();
        },
      },
    });
    return () => { alive = false; instance.unmount(); };
  }, [sdkReady, publicKey, amount, subscriptionId, documentStatus]);

  return <>
    {documentStatus === "ready" && externalAllowed ? <Script src="https://sdk.mercadopago.com/js/v2" nonce={nonce} strategy="afterInteractive"
      onReady={() => setSdkReady(true)} onError={() => setMessage("No pudimos conectar con Mercado Pago. Recargá la página para intentar nuevamente.")} /> : null}
    {cookieConsent !== undefined && !externalAllowed ? (
      <div role="alert" className="mt-7 rounded-2xl border border-clay/25 bg-clay-soft px-5 py-4">
        <p className="text-sm font-semibold text-ink">Falta habilitar las cookies de funcionalidades externas</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          El formulario de tarjeta lo provee Mercado Pago. Para cargarlo necesitamos que habilites la categoría
          «Cookies de funcionalidades externas» en tus preferencias de cookies.
        </p>
        <Button className="mt-4" variant="secondary" onClick={openCookiePreferences}>Configurar cookies</Button>
      </div>
    ) : null}
    <form id="subscription-card-form" className="mt-7 space-y-5" aria-busy={pending} onSubmit={(event) => event.preventDefault()}>
      <fieldset disabled={pending || submitted || !externalAllowed} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">Tarjeta y datos del pagador</legend>
        <div><label htmlFor="subscription-card-email" className="mb-2 block text-sm font-semibold">Correo del pagador</label>
          <input id="subscription-card-email" type="email" autoComplete="email" required className={fieldClass} aria-describedby="payer-email-help" />
          <p id="payer-email-help" className="mt-2 text-sm text-muted">Puede ser distinto del correo que usás para entrar a Universo Psi. Ingresá el correo de la persona que paga.</p></div>
        <div><label htmlFor="subscription-card-holder" className="mb-2 block text-sm font-semibold">Titular de la tarjeta</label><input id="subscription-card-holder" autoComplete="cc-name" required className={fieldClass} /></div>
        <div role="group" aria-labelledby="card-number-label"><p id="card-number-label" className="mb-2 text-sm font-semibold">Número de tarjeta</p><div id="subscription-card-number" className={`${fieldClass} ${styles.secureField}`} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div role="group" aria-labelledby="card-expiration-label"><p id="card-expiration-label" className="mb-2 text-sm font-semibold">Vencimiento</p><div id="subscription-card-expiration" className={`${fieldClass} ${styles.secureField}`} /></div>
          <div role="group" aria-labelledby="card-security-label"><p id="card-security-label" className="mb-2 text-sm font-semibold">Código de seguridad</p><div id="subscription-card-security" className={`${fieldClass} ${styles.secureField}`} /></div>
        </div>
        <div><label htmlFor="subscription-card-issuer" className="mb-2 block text-sm font-semibold">Banco emisor</label><select id="subscription-card-issuer" className={fieldClass} /></div>
        <select id="subscription-card-installments" hidden aria-hidden="true" tabIndex={-1} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="subscription-card-id-type" className="mb-2 block text-sm font-semibold">Tipo de documento</label><select id="subscription-card-id-type" className={fieldClass} /></div>
          <div><label htmlFor="subscription-card-id-number" className="mb-2 block text-sm font-semibold">Número de documento</label><input id="subscription-card-id-number" inputMode="numeric" required className={fieldClass} /></div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line p-4"><input ref={consent} type="checkbox" required className="mt-1 size-5 shrink-0" /><span className="text-sm leading-6">Autorizo el débito de {price} {currency} por mes en la tarjeta indicada para esta suscripción.</span></label>
        <p className="text-sm text-muted">Los datos de tu tarjeta se ingresan directamente en Mercado Pago. Universo Psi no recibe el número ni el código de seguridad.</p>
        <button type="submit" disabled={!mounted || pending || submitted} className={`${buttonStyles({ size: "lg" })} w-full disabled:opacity-50`}>{pending ? "Confirmando autorización…" : submitted ? "Autorización recibida" : "Autorizar suscripción mensual"}</button>
      </fieldset>
      {documentStatus === "missing" ? <p role="alert" className="text-sm text-muted">No pudimos preparar el formulario seguro. Recargá la página para intentar nuevamente.</p> : null}
      {message ? <p role={submitted ? "status" : "alert"} className="rounded-xl border border-line p-4 text-sm leading-6">{message}</p> : !mounted ? <p role="status" className="text-sm text-muted">Cargando el formulario seguro de Mercado Pago…</p> : null}
      <Link href="/dashboard#suscripcion" className="inline-flex min-h-11 items-center text-sm font-semibold text-senda underline underline-offset-4">Ver estado de mi suscripción</Link>
    </form>
  </>;
}
