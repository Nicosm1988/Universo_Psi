// Supabase Auth error `code` values, mapped to specific, actionable Spanish
// copy — a single generic message ("no pudimos crear la cuenta") hides
// whether the problem is the account already existing, a weak password, a
// rate limit, or a real outage on our side, so users can't tell what to do
// next.

const SIGNUP_MESSAGES: Record<string, string> = {
  user_already_exists: "Ese email ya tiene una cuenta creada. Iniciá sesión o recuperá tu contraseña si no la recordás.",
  email_exists: "Ese email ya tiene una cuenta creada. Iniciá sesión o recuperá tu contraseña si no la recordás.",
  weak_password: "Esa contraseña es débil. Combiná mayúsculas, minúsculas y números.",
  email_address_invalid: "Ese email no es válido. Revisalo y probá de nuevo.",
  email_address_not_authorized: "Ese email no puede registrarse por ahora. Escribinos si necesitás ayuda.",
  over_email_send_rate_limit: "Estamos recibiendo muchos registros en simultáneo. Esperá un minuto y probá de nuevo.",
  signup_disabled: "El registro está desactivado por el momento. Escribinos si necesitás ayuda.",
};

const SIGNIN_MESSAGES: Record<string, string> = {
  invalid_credentials: "El email o la contraseña no coinciden. Revisalos o recuperá tu acceso.",
  email_not_confirmed: "Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y spam) para completar el registro.",
  over_request_rate_limit: "Probaste muchas veces seguidas. Esperá un minuto y volvé a intentar.",
};

export function signUpErrorMessage(code: string | undefined): string {
  if (code && SIGNUP_MESSAGES[code]) return SIGNUP_MESSAGES[code];
  return "Tuvimos un problema técnico de nuestro lado al crear la cuenta. Ya lo estamos revisando — probá de nuevo en unos minutos.";
}

export function signInErrorMessage(code: string | undefined): string {
  if (code && SIGNIN_MESSAGES[code]) return SIGNIN_MESSAGES[code];
  return "Tuvimos un problema técnico de nuestro lado al iniciar sesión. Probá de nuevo en unos minutos.";
}
