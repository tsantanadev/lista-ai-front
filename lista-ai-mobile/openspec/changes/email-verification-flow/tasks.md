## 1. API Layer

- [x] 1.1 Update `apiRegister` in `src/api/auth.ts` to return a discriminated union `{ status: 'authenticated'; tokens: TokenResponse } | { status: 'pending_verification'; message: string }` based on HTTP status code (`201` vs `202`)
- [x] 1.2 Add `apiVerifyEmail(token: string): Promise<void>` to `src/api/auth.ts` calling `POST /v1/auth/verify-email`
- [x] 1.3 Add `apiResendVerification(email: string): Promise<void>` to `src/api/auth.ts` calling `POST /v1/auth/resend-verification`

## 2. Auth Store

- [x] 2.1 Add `pendingVerificationEmail: string | null` field to `AuthState` in `src/auth/store.ts`
- [x] 2.2 Update `register` action to handle `pending_verification` result: set `pendingVerificationEmail`, do NOT set `isAuthenticated`, do NOT store tokens
- [x] 2.3 Add `setPendingVerificationEmail(email: string | null): void` action for external navigation use
- [x] 2.4 Update `loginLocal` action to detect `403 EMAIL_NOT_VERIFIED`: set the submitted email as `pendingVerificationEmail` and a translated error message

## 3. Navigation

- [x] 3.1 Add `VerifyEmailPending: { email: string }` and `VerifyEmail: { token: string }` to `AuthStackParamList` in `src/navigation/types.ts`
- [x] 3.2 Add corresponding typed props exports (`VerifyEmailPendingProps`, `VerifyEmailProps`) in `src/navigation/types.ts`
- [x] 3.3 Register `VerifyEmailPending` and `VerifyEmail` screens in `src/navigation/AuthStack.tsx`
- [x] 3.4 Add deep link `linking` config in `src/navigation/RootStack.tsx` (or wherever `NavigationContainer` lives) mapping `/verify-email` → `Auth/VerifyEmail` with `token` param
- [x] 3.5 Add `intentFilters` for Android in `app.json` (host `app.lista-ai.com`, path `/verify-email`)
- [x] 3.6 Add `associatedDomains` for iOS in `app.json` (`applinks:app.lista-ai.com`)

## 4. Register Screen Update

- [x] 4.1 Update `handleRegister` in `src/screens/Register/index.tsx` to navigate to `VerifyEmailPending` (passing `email`) when the store action completes without setting `isAuthenticated`

## 5. VerifyEmailPending Screen

- [x] 5.1 Create `src/screens/VerifyEmailPending/index.tsx` displaying the destination email and instructions
- [x] 5.2 Implement "Resend email" button calling `apiResendVerification`; show success message on `200`, cooldown error on `429`
- [x] 5.3 Implement "Back to login" link navigating to `Login`
- [x] 5.4 Apply theme tokens and NativeWind/StyleSheet consistent with existing screens

## 6. VerifyEmail Screen

- [x] 6.1 Create `src/screens/VerifyEmail/index.tsx` that reads `route.params.token` and calls `apiVerifyEmail` on mount
- [x] 6.2 Show loading state while the API call is in flight
- [x] 6.3 Show success state with "Go to login" button on `200`
- [x] 6.4 Show "invalid token" error on `400` with "Back to login" button
- [x] 6.5 Show "link expired" error on `410` with "Request a new link" button navigating to `VerifyEmailPending` (no email param — user must enter it)
- [x] 6.6 Apply theme tokens and NativeWind/StyleSheet consistent with existing screens

## 7. Login Screen Update

- [x] 7.1 In `src/screens/Login/index.tsx`, detect `pendingVerificationEmail` from auth store after a failed login
- [x] 7.2 Render a "Resend verification email" link below the error banner when `pendingVerificationEmail` is set, navigating to `VerifyEmailPending` with that email

## 8. i18n Strings

- [x] 8.1 Add `auth.verification.*` keys to `src/i18n/locales/en.json` (pending screen title, instructions, resend button, success, cooldown error; verify screen states: loading, success, invalid, expired)
- [x] 8.2 Add same keys translated to `src/i18n/locales/pt-BR.json`
- [x] 8.3 Add same keys translated to `src/i18n/locales/es.json`
- [x] 8.4 Add same keys translated to `src/i18n/locales/fr.json`
- [x] 8.5 Add same keys translated to `src/i18n/locales/de.json`
- [x] 8.6 Add `auth.login.emailNotVerified` key to all five locales (error message for 403 on login)
