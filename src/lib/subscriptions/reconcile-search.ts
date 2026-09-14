import "server-only";

import { z } from "zod";

import {
  resolvePaymentAccount,
  verifyPaymentAccountIdentity,
  type PaymentAccountKey,
} from "@/lib/integrations/payments";
import {
  reconcileAuthorizedPayment,
  reconcileOneTimePayment,
  reconcilePreapproval,
} from "@/lib/subscriptions/reconcile";

const resourceId = z.union([z.string().min(1), z.number().int().nonnegative()]).transform(String);
const recurringPaging = z.object({
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(1000),
  total: z.number().int().nonnegative(),
});
const searchResponse = z.object({
  paging: z.object({ total: z.number().int().nonnegative() }).passthrough(),
  results: z.array(z.object({
    id: resourceId,
    preapproval_id: z.string().optional(),
    external_reference: z.string().optional(),
  })),
});

/** Recupera notificaciones perdidas consultando recursos actuales del proveedor.
 * No crea pagos, autorizaciones ni preferencias. Nunca usa el resultado de búsqueda
 * para activar beneficios: cada recurso pasa nuevamente por la reconciliación.
 */
export async function reconcileSubscriptionResources(input: {
  subscriptionId: string;
  providerSubscriptionId: string;
  accountKey: PaymentAccountKey;
  paymentModel: "RECURRING" | "ONE_TIME";
}) {
  await verifyPaymentAccountIdentity(input.accountKey);
  const account = resolvePaymentAccount(input.accountKey);
  if (!account) throw new Error("Cuenta de pagos no configurada");
  const recurring = input.paymentModel === "RECURRING";
  if (recurring) await reconcilePreapproval(input.providerSubscriptionId, input.accountKey);
  const ids = new Set<string>();
  // Límite explícito: un resultado truncado falla para pedir una recuperación
  // operativa, en lugar de anunciar que toda la historia quedó reconciliada.
  for (let offset = 0; offset < 1000;) {
    const url = new URL(recurring
      ? "https://api.mercadopago.com/authorized_payments/search"
      : "https://api.mercadopago.com/v1/payments/search");
    url.searchParams.set(recurring ? "preapproval_id" : "external_reference",
      recurring ? input.providerSubscriptionId : input.subscriptionId);
    // La consulta de facturas usa la paginación predeterminada del proveedor.
    // El sandbox rechazó limit=50; no se presupone otro límite admitido.
    if (!recurring) url.searchParams.set("limit", "50");
    if (!recurring || offset > 0) url.searchParams.set("offset", String(offset));
    if (!recurring) {
      url.searchParams.set("sort", "date_created");
      url.searchParams.set("criteria", "asc");
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("No se pudo consultar el historial de pagos");
    const page = searchResponse.parse(await response.json());
    const paging = recurring ? recurringPaging.parse(page.paging) : { ...page.paging, offset, limit: 50 };
    if (paging.offset !== offset || page.results.length > paging.limit
      || offset + page.results.length > paging.total) {
      throw new Error("Paginación del historial de pagos inválida");
    }
    if (offset + page.results.length > 1000) {
      throw new Error("El historial requiere una reconciliación operativa por lotes");
    }
    if (offset > 0 && page.results.length > 0 && page.results.every((item) => ids.has(item.id))) {
      throw new Error("El historial de pagos no avanza");
    }
    for (const item of page.results) {
      if (recurring ? item.preapproval_id !== input.providerSubscriptionId
        : item.external_reference !== input.subscriptionId) {
        throw new Error("El historial no corresponde a la suscripción solicitada");
      }
      if (ids.has(item.id)) continue;
      if (recurring) await reconcileAuthorizedPayment(item.id, input.accountKey);
      else await reconcileOneTimePayment(item.id, input.accountKey);
      ids.add(item.id);
    }
    if (offset + page.results.length >= page.paging.total) return { reconciled: ids.size };
    if (page.results.length !== paging.limit) throw new Error("Historial de pagos incompleto");
    offset += paging.limit;
  }
  throw new Error("El historial requiere una reconciliación operativa por lotes");
}
