import Link from "next/link";

import type { CurrentUser } from "@/lib/dal/auth";

function initials(user: CurrentUser) {
  const source = user.displayName?.trim() || user.email?.trim() || "";
  const letters = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "·";
}

/**
 * Prueba visible de que la sesión está abierta, y acceso al panel.
 *
 * La foto de Google puede fallar —cuenta sin foto, imagen bloqueada, dominio
 * caído—, así que las iniciales se dibujan siempre debajo: si la imagen no
 * carga, queda el círculo con letras en lugar de un hueco.
 */
export function AccountChip({ user }: { user: CurrentUser }) {
  const label = user.displayName?.trim() || user.email || "Tu cuenta";

  return (
    <Link
      href="/dashboard"
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-full border border-line bg-paper py-1 pl-1 pr-2 transition-colors hover:border-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 motion-reduce:transition-none sm:pr-4"
    >
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-senda-soft text-xs font-bold text-senda-dark">
        {initials(user)}
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="absolute inset-0 size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </span>
      <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink sm:block">{label}</span>
      <span className="sr-only">Ir a tu espacio</span>
    </Link>
  );
}
