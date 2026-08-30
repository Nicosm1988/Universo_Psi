import "server-only";

import { serverEnv } from "@/lib/env/server";

export type PaymentAvailability = {
  provider: "MERCADO_PAGO";
  configured: boolean;
  mode: "pending-configuration";
};

/**
 * Deliberately reports capability without activating a subscription. The
 * database remains the source of truth and keeps selections in
 * PENDING_PAYMENT until a signed provider webhook is implemented.
 */
export function paymentAvailability(): PaymentAvailability {
  return {
    provider: "MERCADO_PAGO",
    configured: Boolean(
      serverEnv.MERCADOPAGO_ACCESS_TOKEN &&
        serverEnv.MERCADOPAGO_WEBHOOK_SECRET,
    ),
    mode: "pending-configuration",
  };
}
