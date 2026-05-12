## ADDED Requirements

### Requirement: Register returns pending-verification state when server responds 202
After a successful registration call that returns HTTP `202`, the app SHALL NOT authenticate the user. Instead it SHALL store the user's email as `pendingVerificationEmail` and navigate to the `VerifyEmailPending` screen.

#### Scenario: Registration succeeds with email verification enabled
- **WHEN** the user submits the registration form and the server responds `202 Accepted`
- **THEN** the app navigates to `VerifyEmailPending` and does NOT set `isAuthenticated = true`

#### Scenario: Registration succeeds without email verification (legacy 201)
- **WHEN** the user submits the registration form and the server responds `201 Created` with tokens
- **THEN** the app authenticates normally (existing behavior preserved)

#### Scenario: Registration fails (conflict, validation)
- **WHEN** the server responds with `4xx`
- **THEN** the app shows an error message on the Register screen (existing behavior preserved)

---

### Requirement: VerifyEmailPending screen informs user and allows resend
The app SHALL display a `VerifyEmailPending` screen that shows the email address to which the verification was sent and offers a "Resend email" action.

#### Scenario: User views pending screen after registration
- **WHEN** the user lands on `VerifyEmailPending`
- **THEN** the screen shows the email address and instructions to check inbox

#### Scenario: User requests resend within cooldown
- **WHEN** the user taps "Resend email" and the server responds `429`
- **THEN** the screen shows a translated cooldown message and keeps the button enabled for a future attempt

#### Scenario: User requests resend successfully
- **WHEN** the user taps "Resend email" and the server responds `200`
- **THEN** the screen shows a success confirmation message

#### Scenario: User navigates back to login
- **WHEN** the user taps "Back to login"
- **THEN** the app navigates to the `Login` screen

---

### Requirement: VerifyEmail screen handles deep link token
The app SHALL register a `VerifyEmail` route in `AuthStack` that is reachable via the Universal Link `https://app.lista-ai.com/verify-email?token=<token>`. On mount, the screen SHALL POST the token to `POST /v1/auth/verify-email` and display the result.

#### Scenario: Token is valid and unused
- **WHEN** the deep link opens with a valid token
- **THEN** the screen shows a success message and a "Go to login" button

#### Scenario: Token is invalid
- **WHEN** the deep link opens with an unknown token (server `400`)
- **THEN** the screen shows an "invalid token" error message

#### Scenario: Token is expired or superseded
- **WHEN** the deep link opens with an expired or superseded token (server `410`)
- **THEN** the screen shows a "link expired" message and a "Request a new link" button that navigates to `VerifyEmailPending`

#### Scenario: Token already used (idempotent)
- **WHEN** the deep link opens with a token that was already verified (server `200`)
- **THEN** the screen shows the same success message as first verification

---

### Requirement: Login handles EMAIL_NOT_VERIFIED (403)
When `POST /v1/auth/login` returns `403`, the app SHALL display a translated error message and a "Resend verification email" button that pre-fills `VerifyEmailPending` with the submitted email.

#### Scenario: Login blocked due to unverified email
- **WHEN** the user submits login credentials and the server responds `403`
- **THEN** the error banner shows an email-not-verified message AND a "Resend verification email" link appears

#### Scenario: User taps resend from login error state
- **WHEN** the user taps "Resend verification email" after a `403` login response
- **THEN** the app navigates to `VerifyEmailPending` with the submitted email pre-filled

---

### Requirement: API layer exposes verifyEmail and resendVerification functions
`src/api/auth.ts` SHALL export `apiVerifyEmail(token: string): Promise<void>` and `apiResendVerification(email: string): Promise<void>`, and `apiRegister` SHALL return a discriminated union (`{ status: 'authenticated'; tokens: TokenResponse } | { status: 'pending_verification'; message: string }`).

#### Scenario: apiVerifyEmail called with valid token
- **WHEN** `apiVerifyEmail` is called with a valid token
- **THEN** it resolves without error (server `200`)

#### Scenario: apiVerifyEmail called with invalid token
- **WHEN** `apiVerifyEmail` is called with an invalid token (server `400` or `410`)
- **THEN** it rejects with an Axios error that the caller can handle

#### Scenario: apiResendVerification called
- **WHEN** `apiResendVerification` is called with an email
- **THEN** it resolves on `200` and rejects on `429`

---

### Requirement: i18n strings added for verification flow in all five locales
All user-visible copy for the email verification flow SHALL be translated in `en`, `pt-BR`, `es`, `fr`, and `de`.

#### Scenario: App renders verification strings in each locale
- **WHEN** the device locale is set to any of the five supported languages
- **THEN** all strings on VerifyEmailPending and VerifyEmail screens appear in the correct language without fallback to English keys

---

### Requirement: Deep link configuration registered in app.json
`app.json` SHALL include the Universal Link / App Link configuration so that `https://app.lista-ai.com/verify-email` opens the app on both Android and iOS.

#### Scenario: App opens from email link on Android
- **WHEN** the user taps the verification link from an Android email client
- **THEN** the OS opens the app at the `VerifyEmail` screen with the token param

#### Scenario: App opens from email link on iOS
- **WHEN** the user taps the verification link from an iOS email client
- **THEN** the OS opens the app at the `VerifyEmail` screen with the token param (requires `associatedDomains` entitlement and hosted AASA file)
