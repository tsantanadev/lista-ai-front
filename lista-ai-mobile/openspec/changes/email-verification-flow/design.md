## Context

The backend API (Spring Boot) now enforces email verification as a hard gate on login when the `app.email-verification.enabled` flag is `true`. Registration returns `202 Accepted` with a JSON body `{ message }` instead of `201` with tokens. Login returns `403 EMAIL_NOT_VERIFIED` for unverified users. Two new endpoints exist: `POST /v1/auth/verify-email` (token consumption via deep link) and `POST /v1/auth/resend-verification` (cooldown-gated resend). The mobile app currently has no knowledge of this flow.

## Goals / Non-Goals

**Goals:**
- Adapt `register` in `auth/store.ts` to handle `202` (no tokens) by transitioning to a `pendingVerification` UI state instead of authenticating.
- Add `VerifyEmailPending` screen: shown after registration when verification is pending; allows resending.
- Add `VerifyEmail` screen: handles the Universal Link deep link, posts the token to the API, and shows result.
- Handle `403 EMAIL_NOT_VERIFIED` on login with clear messaging and a "Resend" shortcut.
- Wire deep links so `https://app.lista-ai.com/verify-email?token=…` opens `VerifyEmail` inside the app.
- Add i18n strings to all five locales (en, pt-BR, es, fr, de).

**Non-Goals:**
- Password reset flow (separate spec).
- Email change flow.
- Web fallback page for the verify-email link.
- Push notifications for verification status.

## Decisions

### D1 — Pending verification is auth-stack state, not a Zustand flag

The `VerifyEmailPending` screen lives inside `AuthStack` (alongside `Login` and `Register`). After a `202` response from register, the `register` action in the auth store does NOT set `isAuthenticated`; instead it sets a new `pendingVerificationEmail: string | null` field and the `Register` screen navigates to `VerifyEmailPending`.

**Alternatives considered:**
- Storing `pendingVerificationEmail` in Zustand and conditionally rendering from `RootStack` — rejected because it couples root navigation to a transient auth sub-state, making the `VerifyEmailPending` → `Login` flow harder to reason about.

### D2 — Deep link handling via Expo Linking in `VerifyEmail` screen

`app.json` adds `intentFilters` (Android) and `associatedDomains` (iOS) for `app.lista-ai.com`. On app launch from a link, React Navigation's `linking` config maps `/verify-email` to `Auth/VerifyEmail` passing `token` as a route param. The `VerifyEmail` screen reads `route.params.token` and calls the API on mount.

**Alternatives considered:**
- Handling links at the root navigator level — adds complexity; React Navigation's built-in linking config is simpler.

### D3 — `apiRegister` returns a discriminated union

```ts
type RegisterResult =
  | { status: 'authenticated'; tokens: TokenResponse }
  | { status: 'pending_verification'; message: string };
```

The API layer inspects the HTTP status code (`201` vs `202`) to select which shape to return. This keeps the store action simple and type-safe.

**Alternatives considered:**
- Returning `TokenResponse | null` — null is stringly-typed and causes silent errors.

### D4 — Resend cooldown is purely server-enforced

The app shows a `429` response from `/resend-verification` as a translated "please wait" error. There is no local cooldown timer in the app — the server is the source of truth.

### D5 — Login `403 EMAIL_NOT_VERIFIED` shows error with resend shortcut

When `loginLocal` receives `403`, the store sets `error` as usual AND also sets `pendingVerificationEmail` to the submitted email. The `Login` screen detects this state and renders a second action button "Resend verification email" that navigates to `VerifyEmailPending` (pre-filled with the email).

## Risks / Trade-offs

- **Universal Links require a hosted `apple-app-site-association` file** on `app.lista-ai.com`. If that file is not in place, iOS will open Safari instead of the app. Mitigation: confirm deployment with backend team; app still works (Safari web fallback) but UX degrades.
- **`202` vs `201` detection** relies on Axios exposing `response.status`. This is reliable in the existing interceptor pattern. Mitigation: add a type guard in `apiRegister`.
- **Cooldown error on resend** returns `429`. If the backend returns a different format, the app will show a generic error. Mitigation: handle `detail` field from `ProblemDetail` response body.
