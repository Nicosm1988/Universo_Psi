import "server-only";

import { MercadoPagoHttpError } from "@/lib/integrations/payments";

export type CheckoutStage =
  | "authentication" | "action_input" | "action_profile" | "input" | "subscription_read"
  | "snapshot" | "configuration" | "account_identity" | "plan_lookup"
  | "reservation" | "provider_recovery" | "provider_create"
  | "provider_validation" | "attachment" | "reconciliation";

type CheckoutFailureReason =
  | "missing_claims" | "claims_error" | "invalid_input" | "database_error" | "missing_profile" | "missing_subscription"
  | "subscription_not_pending" | "invalid_snapshot" | "not_configured"
  | "invalid_rpc_result" | "resource_not_found" | "operation_failed";

const databaseCodes = new Set([
  "42501", "42P01", "42703", "42883", "22023", "23505", "P0002",
  "PGRST116", "PGRST202", "PGRST204", "PGRST301",
]);

const authenticationCodes = new Set([
  "bad_jwt", "session_not_found", "refresh_token_already_used", "refresh_token_not_found",
  "user_not_found", "over_request_rate_limit", "unexpected_failure", "request_timeout",
]);

/** Only fixed labels and allowlisted codes leave this boundary. Never log the
 * error object/message, request data, identifiers, or provider response bodies.
 */
export function checkoutFailure(stage: CheckoutStage, reason: CheckoutFailureReason, error?: unknown): null {
  const metadata: { stage: CheckoutStage; reason: CheckoutFailureReason; databaseCode?: string; providerStatus?: number; authenticationCode?: string; authenticationStatus?: number } = { stage, reason };
  if (stage === "authentication" && error && typeof error === "object") {
    if ("code" in error && typeof error.code === "string" && authenticationCodes.has(error.code)) {
      metadata.authenticationCode = error.code;
    }
    if ("status" in error && typeof error.status === "number" && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599) {
      metadata.authenticationStatus = error.status;
    }
  } else if (error instanceof MercadoPagoHttpError && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599) {
    metadata.providerStatus = error.status;
  } else if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && databaseCodes.has(error.code)) {
    metadata.databaseCode = error.code;
  }
  console.error("mercado_pago_checkout_failed", metadata);
  return null;
}
