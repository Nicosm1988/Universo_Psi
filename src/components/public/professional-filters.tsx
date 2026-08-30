"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  languageOptions,
  locationOptions,
  modalityOptions,
  needOptions,
  professionalTypeOptions,
  sortOptions,
  type ProfessionalFilters,
} from "@/lib/demo/public-data";
import { trackAnalytics } from "@/lib/analytics/client";

type Option = { value: string; label: string };

function ChoiceGroup({
  legend,
  name,
  options,
  selected = [],
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  selected?: string[];
}) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-[0.09em] text-ink">{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm leading-5 text-muted hover:bg-canvas">
            <input
              className="size-4 shrink-0 rounded border-line-strong accent-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FilterFields({ selected, idPrefix }: { selected: ProfessionalFilters; idPrefix: string }) {
  const searchId = `${idPrefix}-professional-search`;
  const sortId = `${idPrefix}-sort`;
  const typeId = `${idPrefix}-professional-type`;

  return (
    <>
      <div className="pb-4">
        <label htmlFor={searchId} className="text-xs font-bold uppercase tracking-[0.09em] text-ink">
          Buscar por palabra
        </label>
        <input
          id={searchId}
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={selected.q}
          placeholder="Ej.: ansiedad, adolescencia…"
          className="mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-paper px-3.5 text-base text-ink placeholder:text-muted/70 focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20 xl:text-sm"
        />
      </div>

      <div className="border-t border-line py-4">
        <label htmlFor={typeId} className="text-xs font-bold uppercase tracking-[0.09em] text-ink">
          Tipo de profesional
        </label>
        <select
          id={typeId}
          name="type"
          defaultValue={selected.type?.[0] ?? ""}
          className="mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-paper px-3 text-base text-ink focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20 xl:text-sm"
        >
          <option value="">Tipo de profesional</option>
          {professionalTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-line py-4">
        <label htmlFor={sortId} className="text-xs font-bold uppercase tracking-[0.09em] text-ink">
          Ordenar por
        </label>
        <select
          id={sortId}
          name="sort"
          defaultValue={selected.sort ?? "relevance"}
          className="mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-paper px-3 text-base text-ink focus-visible:border-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/20 xl:text-sm"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ChoiceGroup legend="Qué estás atravesando" name="need" options={needOptions} selected={selected.need} />
      <ChoiceGroup legend="Modalidad" name="modality" options={modalityOptions} selected={selected.modality} />
      <ChoiceGroup legend="Ubicación" name="location" options={locationOptions} selected={selected.location} />
      <ChoiceGroup legend="Idioma" name="language" options={languageOptions} selected={selected.language} />

      <label className="flex min-h-14 cursor-pointer items-center gap-3 border-t border-line py-4 text-sm leading-5 text-muted">
        <input
          className="size-4 shrink-0 rounded accent-senda focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35"
          type="checkbox"
          name="verified"
          value="true"
          defaultChecked={selected.verified}
        />
        <span>
          <strong className="block font-semibold text-ink">Sólo perfiles verificados</strong>
          Credenciales revisadas por Universo Psi.
        </span>
      </label>
    </>
  );
}

function FilterActions() {
  return (
    <div className="flex shrink-0 gap-2 border-t border-line bg-paper p-4 shadow-[0_-10px_20px_-16px_rgba(23,32,29,0.35)]">
      <Button className="flex-1" type="submit">
        Buscar
      </Button>
      <Link href="/profesionales" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35">
        Limpiar
      </Link>
    </div>
  );
}

function filterStateKey(selected: ProfessionalFilters) {
  return JSON.stringify({
    q: selected.q ?? "",
    need: selected.need ?? [],
    type: selected.type ?? [],
    modality: selected.modality ?? [],
    location: selected.location ?? [],
    language: selected.language ?? [],
    verified: selected.verified ?? false,
    sort: selected.sort ?? "relevance",
  });
}

export function ProfessionalFiltersForm({ selected, activeCount }: { selected: ProfessionalFilters; activeCount: number }) {
  const urlStateKey = filterStateKey(selected);

  function trackFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    trackAnalytics("filter_applied", { properties: { active_count: activeCount } });
    if (String(formData.get("q") ?? "").trim()) {
      trackAnalytics("search_started");
    }
  }

  function applySelection(event: React.ChangeEvent<HTMLFormElement>) {
    const control = event.target;
    if (control instanceof HTMLInputElement && control.type === "search") return;
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <>
      <form
        action="/profesionales"
        method="get"
        aria-label="Filtros de profesionales"
        data-testid="professional-filters-desktop"
        onChange={applySelection}
        onSubmit={trackFilterSubmit}
        className="hidden max-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-paper xl:flex"
      >
        <div className="flex shrink-0 items-center justify-between p-5 pb-4">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Afinar búsqueda</h2>
          {activeCount > 0 ? <span className="rounded-full bg-senda-soft px-2.5 py-1 text-xs font-bold text-senda-dark">{activeCount} activos</span> : null}
        </div>
        <div data-testid="professional-filters-desktop-scroll" className="flex-1 overscroll-contain px-5 [scrollbar-gutter:stable] xl:overflow-y-auto">
          <FilterFields key={urlStateKey} selected={selected} idPrefix="desktop" />
        </div>
        <FilterActions />
      </form>

      {/* Native <details> does not shrink flex descendants to fit a max-height
          (confirmed: the equivalent plain <form> below does this correctly),
          so the scrollable region gets an explicit height budget instead of
          flex-1, leaving room for the summary (3.5rem) and the actions
          footer (4.75rem). */}
      <details className="filter-panel max-h-[min(72dvh,40rem)] overflow-hidden rounded-[1.25rem] border border-line bg-paper xl:hidden">
        <summary className="sticky top-0 z-10 flex min-h-14 cursor-pointer list-none items-center justify-between border-b border-line bg-paper px-5 font-semibold text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-senda/35">
          <span>Filtros y orden</span>
          <span className="text-xs text-senda-dark">{activeCount > 0 ? `${activeCount} activos` : "Elegir"}</span>
        </summary>
        <form
          action="/profesionales"
          method="get"
          aria-label="Filtros de profesionales"
          data-testid="professional-filters-mobile"
          onChange={applySelection}
          onSubmit={trackFilterSubmit}
        >
          <div data-testid="professional-filters-mobile-scroll" className="max-h-[calc(min(72dvh,40rem)-8.25rem)] overflow-y-auto overscroll-contain px-5 [scrollbar-gutter:stable]">
            <FilterFields key={urlStateKey} selected={selected} idPrefix="mobile" />
          </div>
          <FilterActions />
        </form>
      </details>
    </>
  );
}
