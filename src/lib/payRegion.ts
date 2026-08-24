/**
 * @doc Billing region
 *
 * Chosen at sign-up: Arabic users are billed through Kashier (card +
 * e-wallets), everyone else through Dodo Payments. Stored locally and on the
 * auth user metadata so it survives across devices.
 */
export type PayRegion = "arab" | "global";

const KEY = "pay_region";

export function getPayRegion(): PayRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "arab" || v === "global" ? v : null;
  } catch {
    return null;
  }
}

export function setPayRegion(region: PayRegion): void {
  try {
    localStorage.setItem(KEY, region);
  } catch {
    // ignore
  }
}

/** True when the account should use the Arabic (Kashier) payment gateways. */
export function isArabBilling(): boolean {
  return getPayRegion() === "arab";
}
