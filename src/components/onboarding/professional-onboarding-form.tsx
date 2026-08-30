"use client";

import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { saveOnboardingAction } from "@/app/profesionales/sumarse/actions";
import { Button } from "@/components/ui/button";
import { CredentialUploader } from "@/components/onboarding/credential-uploader";
import {
  initialOnboardingState,
  type OnboardingState,
} from "@/lib/validation/onboarding";

type Option = { id: string; name: string; description?: string | null };
type ExistingProfile = {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  approach: string;
  experienceSummary: string;
  educationSummary: string;
  yearsExperience: number;
  availabilityStatus: string;
  linkedinUrl: string;
  websiteUrl: string;
  professionalTypeId?: string;
  needIds: string[];
  serviceIds: string[];
  modalityIds: string[];
  languageIds: string[];
  updatedAt: string;
};

const fieldClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition focus-visible:border-senda focus-visible:ring-3 focus-visible:ring-senda/15";
const steps = ["Identidad", "Especialidad", "Perfil", "Documentación", "Revisión"];

function restoreFormSnapshot(form: HTMLFormElement, snapshot: FormData) {
  for (const element of Array.from(form.elements)) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) {
      continue;
    }
    if (!element.name) continue;

    const values = snapshot
      .getAll(element.name)
      .flatMap((entry) => (typeof entry === "string" ? [entry] : []));

    if (element instanceof HTMLInputElement) {
      if (element.type === "file" || element.type === "hidden") continue;
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = values.includes(element.value);
      } else {
        element.value = values[0] ?? "";
      }
      continue;
    }

    if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of Array.from(element.options)) {
        option.selected = values.includes(option.value);
      }
    } else {
      element.value = values[0] ?? "";
    }
  }
}

function ErrorText({ name, state }: { name: string; state: OnboardingState }) {
  const message = state.errors?.[name]?.[0];
  return message ? <span className="mt-1 block text-sm text-red-700">{message}</span> : null;
}

function ChoiceList({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: Option[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-ink">{legend}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4 has-checked:border-senda has-checked:bg-senda/5"
          >
            <input
              className="mt-1"
              type="checkbox"
              name={name}
              value={option.id}
              defaultChecked={selected.includes(option.id)}
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{option.name}</span>
              {option.description ? (
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProfessionalOnboardingForm({
  professionalTypes,
  needs,
  services,
  modalities,
  languages,
  plans,
  existing,
  credentialTypes,
  initialCredentials,
  initialPlan,
}: {
  professionalTypes: Option[];
  needs: Option[];
  services: Option[];
  modalities: Option[];
  languages: Option[];
  plans: {
    code: "PROFESSIONAL_MONTHLY" | "PROFESSIONAL_6M" | "PROFESSIONAL_12M" | "PROFESSIONAL_ANNUAL_UPFRONT";
    name: string;
    description: string | null;
  }[];
  existing: ExistingProfile | null;
  credentialTypes: { id: string; name: string }[];
  initialCredentials: {
    credential_id: string;
    title: string;
    verification_status: string;
    submitted_at: string;
  }[];
  initialPlan?: "PROFESSIONAL_MONTHLY" | "PROFESSIONAL_6M" | "PROFESSIONAL_12M" | "PROFESSIONAL_ANNUAL_UPFRONT";
}) {
  const seedState: OnboardingState = existing
    ? { ...initialOnboardingState, profileId: existing.id }
    : initialOnboardingState;
  const router = useRouter();
  const [state, formAction] = useActionState(saveOnboardingAction, seedState);
  const [step, setStep] = useState(0);
  const hasUnsavedChanges = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedSnapshot = useRef<FormData | null>(null);

  // Guardar en el paso de presentación crea el perfil (necesario para subir
  // documentación en el paso siguiente): un guardado exitoso ahí avanza
  // directo, en vez de dejar un segundo botón "Continuar" que confunde con
  // el guardado normal de borrador. Ajustado durante el render con useState
  // (no useRef ni un efecto) siguiendo el patrón de React para "storing
  // information from previous renders", el único que el compilador acepta.
  const [previousStatus, setPreviousStatus] = useState(state.status);
  if (previousStatus !== state.status) {
    setPreviousStatus(state.status);
    if (state.status === "saved" && step === 2) {
      setStep(3);
    }
  }

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  useEffect(() => {
    if (state.status === "saved" || state.status === "submitted") {
      hasUnsavedChanges.current = false;
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    if (
      state.status !== "idle" &&
      formRef.current &&
      submittedSnapshot.current
    ) {
      restoreFormSnapshot(formRef.current, submittedSnapshot.current);
    }
  }, [state]);

  return (
    <form
      key={existing?.updatedAt ?? "new-profile"}
      ref={formRef}
      action={formAction}
      className="mt-10"
      noValidate
      onChangeCapture={() => {
        hasUnsavedChanges.current = true;
      }}
      onSubmitCapture={(event) => {
        submittedSnapshot.current = new FormData(event.currentTarget);
      }}
    >
      <input type="hidden" name="profileId" value={state.profileId ?? existing?.id ?? ""} />
      <ol className="grid grid-cols-5 gap-1" aria-label="Progreso del perfil">
        {steps.map((label, index) => (
          <li key={label} className="min-w-0">
            <div className={`h-1.5 rounded-full ${index <= step ? "bg-senda" : "bg-line"}`} />
            <span className="mt-2 hidden text-xs font-semibold text-muted sm:block">{label}</span>
          </li>
        ))}
      </ol>

      {state.message ? (
        <p
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <section className="mt-8" hidden={step !== 0}>
        <p className="text-sm font-semibold text-senda">Paso 1 de 5</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">Tu identidad profesional</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">
            Nombre
            <input className={fieldClass} name="firstName" defaultValue={existing?.firstName} autoComplete="given-name" />
            <ErrorText name="firstName" state={state} />
          </label>
          <label className="text-sm font-semibold text-ink">
            Apellido
            <input className={fieldClass} name="lastName" defaultValue={existing?.lastName} autoComplete="family-name" />
            <ErrorText name="lastName" state={state} />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            Tipo de profesional
            <select className={fieldClass} name="professionalTypeId" defaultValue={existing?.professionalTypeId ?? ""}>
              <option value="" disabled>Elegí tu profesión</option>
              {professionalTypes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <ErrorText name="professionalTypeId" state={state} />
          </label>
          <label className="text-sm font-semibold text-ink">
            Años de experiencia
            <input className={fieldClass} type="number" min="0" max="80" name="yearsExperience" defaultValue={existing?.yearsExperience ?? 0} />
          </label>
          <label className="text-sm font-semibold text-ink">
            Disponibilidad
            <select className={fieldClass} name="availabilityStatus" defaultValue={existing?.availabilityStatus ?? "ASK"}>
              <option value="AVAILABLE">Disponible</option>
              <option value="LIMITED">Cupos limitados</option>
              <option value="WAITLIST">Lista de espera</option>
              <option value="ASK">Consultar</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-8 space-y-8" hidden={step !== 1}>
        <p className="text-sm font-semibold text-senda">Paso 2 de 5</p>
        <ChoiceList legend="¿En qué necesidades acompañás?" name="needIds" options={needs} selected={existing?.needIds ?? []} />
        <ErrorText name="needIds" state={state} />
        <ChoiceList legend="¿Qué servicios ofrecés?" name="serviceIds" options={services} selected={existing?.serviceIds ?? []} />
        <ErrorText name="serviceIds" state={state} />
        <ChoiceList legend="Modalidades" name="modalityIds" options={modalities} selected={existing?.modalityIds ?? []} />
        <ErrorText name="modalityIds" state={state} />
        <ChoiceList legend="Idiomas de atención" name="languageIds" options={languages} selected={existing?.languageIds ?? []} />
        <ErrorText name="languageIds" state={state} />
      </section>

      <section className="mt-8" hidden={step !== 2}>
        <p className="text-sm font-semibold text-senda">Paso 3 de 5</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">Contá cómo acompañás</h2>
        <div className="mt-6 space-y-5">
          <label className="block text-sm font-semibold text-ink">
            Titular del perfil
            <input className={fieldClass} name="headline" defaultValue={existing?.headline} placeholder="Ej.: acompañamiento psicológico con enfoque cognitivo-conductual…" />
            <ErrorText name="headline" state={state} />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Sobre vos
            <textarea className={`${fieldClass} min-h-40 py-3`} name="bio" defaultValue={existing?.bio} />
            <ErrorText name="bio" state={state} />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Cómo trabajás
            <textarea className={`${fieldClass} min-h-28 py-3`} name="approach" defaultValue={existing?.approach} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink">
              Experiencia relevante
              <textarea className={`${fieldClass} min-h-28 py-3`} name="experienceSummary" defaultValue={existing?.experienceSummary} />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Formación
              <textarea className={`${fieldClass} min-h-28 py-3`} name="educationSummary" defaultValue={existing?.educationSummary} />
            </label>
            <label className="block text-sm font-semibold text-ink">
              LinkedIn
              <input className={fieldClass} type="url" name="linkedinUrl" defaultValue={existing?.linkedinUrl} placeholder="https://linkedin.com/in/tu-perfil…" spellCheck={false} />
            </label>
            <label className="block text-sm font-semibold text-ink sm:col-span-2">
              Sitio web
              <input className={fieldClass} type="url" name="websiteUrl" defaultValue={existing?.websiteUrl} placeholder="https://tu-sitio.com/…" spellCheck={false} />
            </label>
          </div>
        </div>
      </section>

      <section className="mt-8" hidden={step !== 3}>
        <p className="text-sm font-semibold text-senda">Paso 4 de 5</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">Documentación privada</h2>
        <div className="mt-6 rounded-3xl border border-line bg-mist p-6">
          <ShieldCheck className="size-7 text-senda" aria-hidden="true" />
          <p className="mt-4 font-semibold text-ink">Sólo el equipo de verificación puede verla.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">Aceptamos PDF, JPG o PNG de hasta 10 MB. Los documentos nunca se publican.</p>
          <div className="mt-5">
            <CredentialUploader
              profileId={state.profileId ?? existing?.id}
              credentialTypes={credentialTypes}
              initialCredentials={initialCredentials}
            />
          </div>
        </div>
      </section>

      <section className="mt-8" hidden={step !== 4}>
        <p className="text-sm font-semibold text-senda">Paso 5 de 5</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">Listo para revisión</h2>
        <div className="mt-6 rounded-3xl border border-line bg-paper p-6">
          <Check className="size-7 text-senda" aria-hidden="true" />
          <p className="mt-4 font-semibold text-ink">Al enviar, el perfil todavía no queda público.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">Revisaremos identidad, formación y consistencia del perfil. Vas a ver el estado desde tu dashboard.</p>
        </div>
        <fieldset className="mt-6">
          <legend className="text-lg font-semibold text-ink">Plan elegido</legend>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            La selección queda pendiente y no genera ningún cobro. Los valores se informarán antes de contratar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <label key={plan.code} className="cursor-pointer rounded-2xl border border-line bg-paper p-4 has-checked:border-senda has-checked:bg-senda/5">
                <span className="flex items-start gap-3">
                  <input className="mt-1" type="radio" name="planCode" value={plan.code} defaultChecked={plan.code === initialPlan} />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{plan.name}</span>
                    {plan.description ? <span className="mt-1 block text-xs leading-relaxed text-muted">{plan.description}</span> : null}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <ErrorText name="planCode" state={state} />
        </fieldset>
        <Button className="mt-6 w-full sm:w-auto" size="lg" type="submit" name="intent" value="submit">
          Enviar a revisión
        </Button>
      </section>

      {step < 4 ? (
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
          <Button
            key={`previous-${step}`}
            variant="quiet"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={step === 0}
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> Atrás
          </Button>
          {step === 2 ? (
            <Button key="save-draft" type="submit" name="intent" value="draft">
              Guardar y continuar
            </Button>
          ) : (
            <Button
              key={`next-${step}`}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setStep((current) => Math.min(4, current + 1));
              }}
            >
              {step === 0 ? "Elegir especialidades" : step === 1 ? "Completar presentación" : "Revisar perfil"} <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : null}
    </form>
  );
}
