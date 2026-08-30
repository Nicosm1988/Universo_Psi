"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { trackAnalytics } from "@/lib/analytics/client";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactForm({
  professionalId,
  professionalName,
  isDemo,
  needs,
}: {
  professionalId: string;
  professionalName: string;
  isDemo: boolean;
  needs: Array<{ id: string; label: string }>;
}) {
  const [state, setState] = useState<SubmitState>("idle");
  const [contactPreference, setContactPreference] = useState("EMAIL");
  const [errorMessage, setErrorMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const contactStarted = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setErrorMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    idempotencyKey.current ??= crypto.randomUUID();

    const selectedNeed = String(values.get("needId") ?? "");
    const payload = {
      professionalProfileId: professionalId,
      name: String(values.get("name") ?? "").trim(),
      email: String(values.get("email") ?? "").trim(),
      phone: String(values.get("phone") ?? "").trim() || undefined,
      contactPreference: String(values.get("contactPreference") ?? "EMAIL"),
      needId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedNeed)
        ? selectedNeed
        : undefined,
      message: String(values.get("message") ?? "").trim(),
      consent: values.get("consent") === "on",
      consentVersion: "2026-08",
      website: String(values.get("website") ?? ""),
      source: "professional-profile",
      landingPath: window.location.pathname,
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrorMessage(
          response.status === 422
            ? "Revisá los datos y completá el teléfono si preferís una respuesta por teléfono o WhatsApp."
            : "No pudimos enviar la consulta. Intentá nuevamente en unos minutos.",
        );
        throw new Error("Lead request failed");
      }
      form.reset();
      idempotencyKey.current = null;
      trackAnalytics("lead_created", { professionalProfileId: professionalId });
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="rounded-[1.25rem] border border-senda/25 bg-senda-soft p-6">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-senda text-lg font-bold text-white">
          ✓
        </span>
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.025em] text-ink">Tu consulta fue enviada</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isDemo
            ? `Registramos la consulta de prueba asociada a ${professionalName}. Este perfil es ficticio y no contacta a una persona real.`
            : `La consulta quedó disponible en el panel de ${professionalName}. Tus datos de contacto no se publican.`}
        </p>
        <Button className="mt-5" variant="secondary" onClick={() => setState("idle")}>
          Enviar otra consulta
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onFocusCapture={() => {
        if (contactStarted.current) return;
        contactStarted.current = true;
        trackAnalytics("contact_started", {
          professionalProfileId: professionalId,
        });
      }}
      className="grid gap-5"
      noValidate={false}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink">
          Nombre
          <input
            required
            name="name"
            autoComplete="name"
            className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
            placeholder="Ej.: Alex…"
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Email
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
            placeholder="Ej.: nombre@email.com…"
          />
        </label>
      </div>
      <label className="text-sm font-semibold text-ink">
        Motivo principal
        <select
          required
          name="needId"
          defaultValue=""
          className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
        >
          <option value="" disabled>Elegí una opción</option>
          {needs.map((need) => <option key={`${need.id}-${need.label}`} value={need.id}>{need.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-ink">
        ¿Cómo preferís que te respondan?
        <select
          required
          name="contactPreference"
          value={contactPreference}
          onChange={(event) => setContactPreference(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
        >
          <option value="EMAIL">Email</option>
          <option value="PHONE">Llamada telefónica</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="ANY">Cualquiera</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-ink">
        Teléfono <span className="font-normal text-muted">{contactPreference === "PHONE" || contactPreference === "WHATSAPP" ? "(obligatorio para esta preferencia)" : "(opcional)"}</span>
        <input
          name="phone"
          type="tel"
          required={contactPreference === "PHONE" || contactPreference === "WHATSAPP"}
          autoComplete="tel"
          className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
          placeholder="Ej.: 11 5555 5555…"
        />
      </label>
      <label className="text-sm font-semibold text-ink">
        ¿Qué te gustaría conversar?
        <textarea
          required
          name="message"
          minLength={20}
          rows={5}
          className="mt-2 w-full resize-y rounded-xl border border-line-strong bg-paper px-4 py-3 font-normal leading-6 text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
          placeholder="Contale brevemente qué momento estás atravesando…"
        />
      </label>
      <div className="absolute left-[-9999px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas p-4 text-xs leading-5 text-muted">
        <input required name="consent" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35" />
        <span>
          {isDemo
            ? `Acepto que Universo Psi use estos datos para registrar una consulta de prueba asociada al perfil demo de ${professionalName}. No se usarán para realizar diagnósticos ni se publicarán.`
            : `Acepto que Universo Psi use y comparta estos datos con ${professionalName} para gestionar esta consulta. No se usarán para realizar diagnósticos ni se publicarán.`}
        </span>
      </label>
      {state === "error" ? (
        <p role="alert" className="rounded-xl border border-clay/25 bg-clay-soft px-4 py-3 text-sm text-clay-dark">
          {errorMessage || "No pudimos enviar la consulta. Revisá tu conexión e intentá nuevamente."}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={state === "submitting"}>
          {state === "submitting" ? "Enviando…" : `Enviar consulta a ${professionalName.split(" ")[0]}`}
        </Button>
        <p className="text-xs leading-5 text-muted">{isDemo ? "Flujo de prueba: no se contacta a una persona real." : "Sin costo. El profesional decide cómo y cuándo responder."}</p>
      </div>
    </form>
  );
}
