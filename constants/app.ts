/** Public web URL for invite / share. */
export const APP_SHARE_URL = "https://informedministries.app";

/** Public contact for outbound API identification (Nominatim and similar). */
export const APP_CONTACT_EMAIL = "joseph@gracethroughfaith.app";

/** Render hostname still served; keep on CORS / CSP allowlists. */
export const APP_RENDER_ORIGIN = "https://informed-ministries-api.onrender.com";

/** Browser origins that may call the API. onrender.com stays listed. */
export const APP_PUBLIC_ORIGINS = [
  APP_SHARE_URL,
  "https://www.informedministries.app",
  APP_RENDER_ORIGIN,
] as const;

/** Stripe-hosted giving page. Empty hides the online card. Opened in the system browser. */
export const STRIPE_GIVING_URL = "https://buy.stripe.com/14A4gzbSGcF53VwbAP5sA00";
/** Bank transfer details. Empty values are omitted; the card hides when all four are empty. */
export const GIVING_BANK_NAME = "Luis Bermudez";
export const GIVING_BANK_BSB = "182-182";
export const GIVING_BANK_ACCOUNT = "001223585";
export const GIVING_ABN = "39 741 036 497";

