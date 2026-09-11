// Kroo IQ is a Kroo+ benefit. All frontend Kroo IQ entry points should use
// this single gate so access policy can be changed consistently if needed.
export const KROO_IQ_REQUIRES_KROO_PLUS = true;

// Temporary switch: keep the server-backed daily quiz paused until Kroo IQ
// content is ready in Admin. Change this to true to restore API persistence.
export const KROO_IQ_USES_BACKEND = true;

export function canUseKrooIq(isKrooPlus: boolean) {
  return KROO_IQ_REQUIRES_KROO_PLUS || isKrooPlus;
}
