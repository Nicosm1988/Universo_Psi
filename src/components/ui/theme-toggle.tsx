"use client";

import { useEffect, useRef } from "react";

type Theme = "light" | "dark";

const storageKey = "universo-psi-theme:v1";
const themeChangeEvent = "universo-psi-theme-change";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent<Theme>(themeChangeEvent, { detail: theme }));
  if (!persist) return;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // The visual preference still applies when storage is unavailable.
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function syncAccessibleState(theme: Theme) {
      const button = buttonRef.current;
      if (!button) return;
      const nextTheme = theme === "dark" ? "claro" : "oscuro";
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.setAttribute("aria-label", `Activar modo ${nextTheme}`);
      button.title = `Activar modo ${nextTheme}`;
    }

    syncAccessibleState(currentTheme());

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey || (event.newValue !== "light" && event.newValue !== "dark")) return;
      applyTheme(event.newValue, false);
    }

    function handleThemeChange(event: Event) {
      const theme = (event as CustomEvent<Theme>).detail;
      if (theme === "light" || theme === "dark") syncAccessibleState(theme);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(themeChangeEvent, handleThemeChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(themeChangeEvent, handleThemeChange);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`theme-toggle inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink transition-colors hover:border-senda hover:bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 focus-visible:ring-offset-2 motion-reduce:transition-none ${className}`}
      aria-label="Cambiar entre modo claro y oscuro"
      aria-pressed="false"
      title="Cambiar entre modo claro y oscuro"
      onClick={() => {
        const nextTheme = currentTheme() === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
      }}
    >
      <svg className="theme-icon theme-icon-sun size-[1.1rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.3 5.3 3.9 3.9M20.1 20.1l-1.4-1.4M18.7 5.3l1.4-1.4M3.9 20.1l1.4-1.4" />
      </svg>
      <svg className="theme-icon theme-icon-moon size-[1.1rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20.3 15.2A8.3 8.3 0 0 1 8.8 3.7 8.3 8.3 0 1 0 20.3 15.2Z" />
      </svg>
    </button>
  );
}
