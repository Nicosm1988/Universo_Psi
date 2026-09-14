const filterKeys = new Set(["q", "need", "type", "modality", "location", "language", "verified", "sort"]);

/** Keep return links inside the directory and discard unrelated URL parameters. */
export function directoryReturnUrl(value?: string): string {
  if (!value || value.length > 4000) return "/profesionales";
  try {
    const url = new URL(value, "https://universo.invalid");
    if (url.origin !== "https://universo.invalid" || url.pathname !== "/profesionales") {
      return "/profesionales";
    }
    const query = new URLSearchParams();
    for (const [key, entry] of url.searchParams) {
      if (filterKeys.has(key) && entry) query.append(key, entry.slice(0, 80));
    }
    const hash = /^#professional-[a-zA-Z0-9-]+$/.test(url.hash) ? url.hash : "";
    return `/profesionales${query.size ? `?${query}` : ""}${hash}`;
  } catch {
    return "/profesionales";
  }
}
