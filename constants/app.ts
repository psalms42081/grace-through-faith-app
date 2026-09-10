/** Public web URL for invite / share. */
export const APP_SHARE_URL = "https://informedministries.app";

/** Render hostname still served; keep on CORS / CSP allowlists. */
export const APP_RENDER_ORIGIN = "https://informed-ministries-api.onrender.com";

/** Browser origins that may call the API. onrender.com stays listed. */
export const APP_PUBLIC_ORIGINS = [
  APP_SHARE_URL,
  "https://www.informedministries.app",
  APP_RENDER_ORIGIN,
] as const;
