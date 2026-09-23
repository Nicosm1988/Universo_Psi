"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildCookieConsent,
  COOKIE_CATEGORIES,
  emptyCookieSelection,
  writeCookieConsent,
  type OptionalCookieCategory,
} from "@/lib/consent/cookies";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  useCookieConsent,
} from "@/lib/consent/use-cookie-consent";

const allSelected: Record<OptionalCookieCategory, boolean> = {
  preferences: true,
  analytics: true,
  external: true,
};

export function CookieConsent() {
  const consent = useCookieConsent();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selection, setSelection] = useState(emptyCookieSelection);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const configureRef = useRef<HTMLButtonElement>(null);

  const openPanel = useCallback(() => {
    setSelection(
      consent
        ? {
            preferences: consent.preferences,
            analytics: consent.analytics,
            external: consent.external,
          }
        : emptyCookieSelection(),
    );
    setPanelOpen(true);
  }, [consent]);

  useEffect(() => {
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPanel);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPanel);
  }, [openPanel]);

  // `showModal` aporta el atrapado de foco, el cierre con Escape y la
  // inertización del fondo sin reimplementarlos a mano.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panelOpen && !dialog.open) dialog.showModal();
    if (!panelOpen && dialog.open) dialog.close();
  }, [panelOpen]);

  function decide(next: Record<OptionalCookieCategory, boolean>) {
    writeCookieConsent(buildCookieConsent(next));
    setPanelOpen(false);
  }

  // Cerrar el panel sin guardar no equivale a consentir: si todavía no había
  // decisión, vuelve a aparecer el banner.
  function dismissPanel() {
    setPanelOpen(false);
    if (!consent) requestAnimationFrame(() => configureRef.current?.focus());
  }

  const showBanner = consent === null;

  return (
    <>
      {showBanner ? (
        <div
          role="region"
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80svh] overflow-y-auto border-t border-line bg-paper/98 px-5 py-4 shadow-[0_-10px_40px_rgba(29,23,44,0.14)] backdrop-blur sm:px-7 sm:py-5"
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-3xl">
              <h2 className="text-sm font-bold tracking-[-0.01em] text-ink">Su privacidad es nuestra prioridad</h2>
              <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
                En Universo Psi utilizamos cookies propias y de terceros para garantizar el correcto
                funcionamiento del sitio web, analizar el tráfico, personalizar su experiencia y recordar sus
                preferencias profesionales. Conforme a nuestra{" "}
                <Link
                  className="font-semibold text-ink underline underline-offset-4 hover:text-senda"
                  href="/privacidad"
                >
                  Política de privacidad
                </Link>
                , usted puede aceptar todas las cookies, configurar sus preferencias o rechazar su uso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row lg:shrink-0">
              <Button className="col-span-2 sm:col-span-1" onClick={() => decide(allSelected)}>
                Aceptar todas
              </Button>
              <Button ref={configureRef} variant="secondary" onClick={openPanel}>
                Configurar
              </Button>
              <Button variant="secondary" onClick={() => decide(emptyCookieSelection())}>
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="cookie-preferences-title"
        onClose={dismissPanel}
        onCancel={dismissPanel}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-3xl border border-line bg-paper p-0 text-ink backdrop:bg-ink/55 open:animate-none"
      >
        <div className="max-h-[min(85vh,44rem)] overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          <h2 id="cookie-preferences-title" className="text-xl font-semibold tracking-[-0.02em] text-ink">
            Configurar cookies
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Elegí qué cookies habilitar. Sólo las técnicas están activadas de forma obligatoria; el resto
            permanece desactivado hasta que lo indiques.
          </p>

          <ul className="mt-6 space-y-3">
            {COOKIE_CATEGORIES.map((category) => {
              const required = category.id === "necessary";
              const checked = required || selection[category.id as OptionalCookieCategory];
              return (
                <li key={category.id} className="rounded-2xl border border-line bg-canvas p-4">
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 shrink-0 accent-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 disabled:opacity-60"
                      checked={checked}
                      disabled={required}
                      onChange={(event) =>
                        setSelection((current) => ({
                          ...current,
                          [category.id as OptionalCookieCategory]: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {category.label}
                        {required ? (
                          <span className="ml-2 align-middle text-xs font-semibold text-muted">
                            (siempre activas)
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted">{category.description}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={() => decide(selection)}>Guardar preferencias</Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="quiet" onClick={() => decide(allSelected)}>
                Aceptar todas
              </Button>
              <Button variant="quiet" onClick={() => decide(emptyCookieSelection())}>
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
