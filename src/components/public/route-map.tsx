export function RouteMap({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-[5/4] w-full ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 400" fill="none">
        <ellipse cx="250" cy="200" rx="212" ry="112" className="rs-routemap__ring rs-routemap__ring--one" />
        <ellipse
          cx="250"
          cy="200"
          rx="156"
          ry="176"
          className="rs-routemap__ring rs-routemap__ring--two opacity-60"
          transform="rotate(38 250 200)"
        />
        <g className="rs-routemap__path-group">
          <path
            d="M48 294C136 244 177 310 264 225c66-64 117-71 190-121"
            className="stroke-sand opacity-55"
          />
          <path
            d="M65 330C161 273 207 344 303 253c58-55 102-65 154-97"
            className="stroke-line-strong opacity-60"
            strokeDasharray="4 9"
          />
          <circle cx="125" cy="276" r="6" className="fill-senda" />
          <circle cx="264" cy="225" r="8" className="fill-sand" />
          <circle cx="407" cy="135" r="5" className="fill-sky-dark" />
        </g>
      </svg>
      <span className="absolute left-[18%] top-[64%] text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
        01 · 34°36&apos;S
      </span>
      <span className="absolute right-[8%] top-[26%] text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
        02 · 58°22&apos;W
      </span>
    </div>
  );
}
