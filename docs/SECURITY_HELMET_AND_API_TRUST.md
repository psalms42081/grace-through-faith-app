# Security notes: Helmet (staging/production) and API trust model

Short reference for deploy verification and debugging. Complements [CODE_REVIEW_REPORT_2026-04.md](../CODE_REVIEW_REPORT_2026-04.md) Appendix A (Fixes 2–3).

---

## 1. Helmet on staging and production (verification checklist)

### Why it matters

Express applies **`helmet()`** (including **Content-Security-Policy** and other security headers) in `server/index.ts` **after** the optional Metro proxy block. In **development**, requests that are **not** under `/api`, `/__health`, `/robots.txt`, or `/sitemap.xml` are proxied to Metro **before** that middleware chain, so the **JS bundle** is served **without** Helmet/CSP. That is expected locally. **Staging and production** must not use that dev-only proxy, so normal traffic should still receive Helmet on routes that go through Express.

### Preconditions

- Deploy runs with **`NODE_ENV=production`** (or at least **not** `development`) so the Metro proxy branch in `server/index.ts` is **skipped**.
- Traffic reaches this Node process (not only a CDN that strips headers—if you use one, confirm it forwards or re-adds security headers).

### Manual checks

Run against your **staging** and **production** base URLs (replace placeholders).

**Health (plain text):**

```bash
curl -sI "https://YOUR_HOST/__health"
```

**API (JSON):**

```bash
curl -sI "https://YOUR_HOST/api/pioneers"
```

### What to look for

- **`X-Content-Type-Options: nosniff`** — set by Helmet.
- **`X-DNS-Prefetch-Control`** — typically present (Helmet default).
- **CSP** — you should see **`Content-Security-Policy`** on responses that pass through `helmet()` (directives are configured in `server/index.ts`).
- **`Referrer-Policy`** — `strict-origin-when-cross-origin` per current config.

If these are **missing** on **production** `/api/*` responses, investigate: wrong `NODE_ENV`, a reverse proxy stripping headers, or traffic not hitting this server.

### Local development (expected difference)

With `NODE_ENV=development`, non-API browser traffic may be proxied to Metro **without** Helmet (see log: `Dev mode: Metro proxy installed BEFORE middleware`). **`/api/*`** and **`/__health`** still go through Helmet. Do **not** use local bundle behavior as proof that production is secure.

---

## 2. API trust model (Origin-less clients)

### Summary

The Grace Through Faith **mobile app** (Expo / React Native) often sends HTTP requests **without** an **`Origin`** header. Browsers always send `Origin` on cross-site fetches that trigger CORS. The server’s CORS logic therefore treats **“no Origin”** as a **non-browser / mobile** pattern and allows the request through that path, while **browser** origins are restricted to configured allowlists (e.g. Replit, Railway, `PUBLIC_DOMAIN`, localhost in dev).

### What actually protects the API

Defense in depth for mobile and web clients is **not** “secret URLs.” It is:

1. **Authentication** — `Authorization: Bearer <JWT>` for signed-in users.
2. **Guest / device identity** — `X-Device-Id` where guest flows apply, with server-side validation as implemented in auth middleware.
3. **Rate limiting** — e.g. auth, AI, and TTS limiters (`server/middleware/rate-limit.ts`).
4. **Input validation** — Zod and route-level checks on sensitive endpoints.
5. **Authorization** — `requireAuth`, `requireAdmin`, `requirePipelineAccess`, etc., on privileged routes.

### Implications for debugging and incidents

- **Missing `Origin` does not mean “trusted user.”** It only means the client is not a typical browser CORS scenario.
- Any **new** client that can reach the network (scripts, other apps) can call public endpoints unless auth or rate limits block them—same as most mobile-backed APIs.
- If you later add **cookie-based** sessions or **credentials** in browsers, revisit CSRF and SameSite policy; today the app is primarily **JWT in `Authorization`**, which does not rely on cookies for API auth.

### Related code

- CORS: `setupCors` in `server/index.ts`.
- Helmet / CSP: `app.use(helmet({ ... }))` in `server/index.ts`.
- Env allowlists: `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `RAILWAY_PUBLIC_DOMAIN`, `PUBLIC_DOMAIN`.

---

*Last updated: April 2026.*
