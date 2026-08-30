// Keep GPS arrivals free during launch. Change this to true when GPS check-in
// becomes a Kroo+ benefit; all GPS entry points use this single gate.
export const GPS_ARRIVALS_REQUIRE_KROO_PLUS = false;

export function canUseGpsArrivals(isKrooPlus: boolean) {
  return !GPS_ARRIVALS_REQUIRE_KROO_PLUS || isKrooPlus;
}
