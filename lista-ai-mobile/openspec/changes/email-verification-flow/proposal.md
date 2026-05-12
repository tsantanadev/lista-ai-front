## Why

The backend API now enforces email verification before allowing login: registration returns `202 Accepted` (no tokens) and login returns `403 EMAIL_NOT_VERIFIED` for unverified accounts. The mobile app currently assumes registration always returns tokens and has no UI for the verification flow, causing silent failures.

## What Changes

- **BREAKING**: `POST /v1/auth/register` now returns `202` with `{ message }` instead of `201` with tokens when email verification is enabled — the app must no longer auto-authenticate after registration.
- Add `apiVerifyEmail(token)` and `apiResendVerification(email)` to `src/api/auth.ts`.
- Update `auth/store.ts` `register` action to handle the pending-verification state (no token storage, navigate to pending screen).
- Add a `VerifyEmailPending` screen shown after registration — informs user, allows resend.
- Add a `VerifyEmail` screen that handles the Universal Link deep link and calls `POST /v1/auth/verify-email`.
- Handle `403 EMAIL_NOT_VERIFIED` on login with a user-friendly error and a "Resend verification" shortcut.
- Wire up Universal Link / deep link so `https://app.lista-ai.com/verify-email?token=<token>` opens the app.
- Add i18n strings (en, pt-BR, es, fr, de) for all new UI copy.

## Capabilities

### New Capabilities
- `email-verification`: End-to-end email verification flow — pending screen after registration, deep-link token consumption, resend with cooldown, and login gate error handling.

### Modified Capabilities
<!-- None — no existing spec files exist yet -->

## Impact

- `src/api/auth.ts` — new functions, updated `apiRegister` return type
- `src/auth/store.ts` — `register` action, new `pendingVerification` state slice
- `src/navigation/types.ts` — new screens in `AuthStackParamList`
- `src/navigation/AuthStack.tsx` — register new screens
- `src/screens/VerifyEmailPending/` — new screen
- `src/screens/VerifyEmail/` — new screen (deep-link handler)
- `src/i18n/locales/*.json` — new strings in all five locales
- `app.json` — `intentFilters` (Android) / `associatedDomains` (iOS) for Universal Links
