import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Universo Psi, inicio"
      className={`group inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm min-[360px]:gap-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 ${inverse ? "text-white" : "text-ink"}`}
    >
      <svg
        className="rs-logo__mark size-9 min-[360px]:size-11 sm:size-12"
        viewBox="0 0 52 52"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="rs-logo__boundary" cx="26" cy="26" r="22.5" />
        <g className="rs-logo__orbit rs-logo__orbit--one">
          <ellipse cx="26" cy="26" rx="23.5" ry="13.5" />
          <circle className="rs-logo__waypoint" cx="48" cy="22" r="1.9" />
        </g>
        <g className="rs-logo__orbit rs-logo__orbit--two">
          <ellipse cx="26" cy="26" rx="16" ry="23" />
          <circle className="rs-logo__waypoint rs-logo__waypoint--accent" cx="21" cy="3.8" r="1.5" />
        </g>
        <circle className="rs-logo__sun" cx="26" cy="26" r="3.6" />
      </svg>
      <span className="font-display text-xl font-medium tracking-[-0.02em] min-[360px]:text-2xl sm:text-3xl">
        Universo <span className={inverse ? "text-sand" : "text-senda"}>Psi</span>
      </span>
    </Link>
  );
}
