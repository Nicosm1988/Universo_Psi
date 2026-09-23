"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { SUPPORT_CONSENT_VERSION } from "@/lib/legal";
import { SUPPORT_TOPICS } from "@/lib/validation/support";

type SubmitState = "idle" | "submitting" | "success" | "error";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 font-normal text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20";

export function SupportForm({ defaultTopic }: { defaultTopic?: string }) {
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);

  const initialTopic =
    defaultTopic && SUPPORT_TOPICS.some((topic) => topic.value === defaultTopic) ? defaultTopic : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setState("submitting");
    setErrorMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      topic: String(values.get("topic") ?? ""),
      name: String(values.get("name") ?? "").trim(),
      email: String(values.get("email") ?? "").trim(),
      message: String(values.get("message") ?? "").trim(),
      consent: values.get("consent") === "on",
      consentVersion: SUPPORT_CONSENT_VERSION,
      website: String(values.get("website") ?? ""),
      landingPath: window.location.pathname,
    };

    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      });
      const result: { ok?: boolean; message?: string } = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        setErrorMessage(
          result.message ??
            "No pudimos enviar el mensaje. Revisá tu conexión e intentá nuevamente en unos minutos.",
        );
        throw new Error("Support request failed");
      }
      form.reset();
      idempotencyKey.current = null;
      setState("success");
    } catch {
      setState("error");
    } finally {
      submitting.current = false;
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="rounded-[1.25rem] border border-senda/25 bg-senda-soft p-6">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-senda text-lg font-bold text-white"
        >
          ✓
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-ink">Recibimos tu mensaje</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Queda registrado con fecha de servidor. Te respondemos al correo que indicaste.
        </p>
        <Button className="mt-5" variant="secondary" onClick={() => setState("idle")}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={state === "submitting"} className="relative grid gap-5">
      <label className="text-sm font-semibold text-ink">
        Motivo
        <select required name="topic" defaultValue={initialTopic} className={fieldClassName}>
          <option value="" disabled>
            Elegí una opción
          </option>
          {SUPPORT_TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink">
          Nombre y apellido
          <input required name="name" autoComplete="name" className={fieldClassName} placeholder="Ej.: Alex…" />
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
            className={fieldClassName}
            placeholder="Ej.: nombre@email.com…"
          />
        </label>
      </div>
      <label className="text-sm font-semibold text-ink">
        Mensaje
        <textarea
          required
          name="message"
          minLength={20}
          maxLength={4000}
          rows={6}
          className="mt-2 w-full resize-y rounded-xl border border-line-strong bg-paper px-4 py-3 font-normal leading-6 text-ink placeholder:text-muted/65 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20"
          placeholder="Contanos qué necesitás. No incluyas diagnósticos, historias clínicas ni datos de salud."
        />
      </label>
      <div className="absolute left-[-9999px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas p-4 text-xs leading-5 text-muted">
        <input
          required
          name="consent"
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
        />
        <span>
          Acepto que Universo Psi use estos datos para registrar y responder este mensaje, conforme a la política
          de privacidad. No se usarán para realizar diagnósticos ni se publicarán.
        </span>
      </label>
      {state === "error" ? (
        <p role="alert" className="rounded-xl border border-clay/25 bg-clay-soft px-4 py-3 text-sm text-clay-dark">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={state === "submitting"}>
          {state === "submitting" ? "Enviando…" : "Enviar mensaje"}
        </Button>
        <p className="text-xs leading-5 text-muted">Sin costo. Te respondemos por correo electrónico.</p>
      </div>
    </form>
  );
}
