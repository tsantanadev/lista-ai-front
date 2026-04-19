# EAS Build — Multi-Environment CI/CD Design

**Date:** 2026-04-19

## Overview

Automate Android and iOS builds for two environments — **test** and **prod** — using EAS Build triggered from GitHub Actions. Test builds run on every push to `develop`; prod builds run on version tags and require manual approval before EAS is invoked.

---

## EAS Build Profiles (`eas.json`)

Two profiles:

### `preview` (test)
- **Android:** APK (`buildType: "apk"`)
- **iOS:** IPA (device build, `simulator: false`)
- **Android package name:** `com.<org>.listai.test`
- **iOS bundle ID:** `com.<org>.listai.test`
- **App name override:** `Lista AI (Test)` — allows coexistence with prod on the same device

### `production`
- **Android:** AAB (`buildType: "app-bundle"`) — ready for Play Store upload
- **iOS:** IPA — ready for App Store / TestFlight upload
- **Android package name:** `com.<org>.listai`
- **iOS bundle ID:** `com.<org>.listai`
- **App name:** `Lista AI`

App ID and name overrides live in `eas.json` (`android.packageName`, `ios.bundleIdentifier`, `android.applicationId`), keeping `app.json` environment-agnostic.

---

## GitHub Actions Workflow (`.github/workflows/build.yml`)

Single workflow file with two independent jobs.

### `build-test`

**Trigger:** `push` to branch `develop`

**Steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 20, npm cache
3. `npm ci` in `lista-ai-mobile/`
4. `expo/expo-github-action@v8` — installs EAS CLI, authenticates via `EXPO_TOKEN`
5. `eas build --profile preview --platform all --non-interactive`

**Environment variables passed to EAS:**
- `EXPO_PUBLIC_API_BASE_URL` ← `TEST_API_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ← `TEST_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` ← `TEST_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` ← `TEST_GOOGLE_ANDROID_CLIENT_ID`

### `build-prod`

**Trigger:** `push` of tags matching `v*.*.*`

**GitHub environment:** `production` — requires manual reviewer approval before the job runs. Configure in GitHub → Settings → Environments → `production` → Required reviewers.

**Steps:** identical to `build-test`, except:
- EAS profile: `production`
- Env vars sourced from `PROD_*` secrets scoped to the `production` environment

---

## Secrets & Environment Variables

### GitHub Secrets (repository-level)

| Secret | Used by |
|---|---|
| `EXPO_TOKEN` | Both jobs (EAS auth) |
| `TEST_API_URL` | `build-test` |
| `TEST_GOOGLE_WEB_CLIENT_ID` | `build-test` |
| `TEST_GOOGLE_IOS_CLIENT_ID` | `build-test` |
| `TEST_GOOGLE_ANDROID_CLIENT_ID` | `build-test` |

### GitHub Environment Secrets (`production` environment)

| Secret | Used by |
|---|---|
| `PROD_API_URL` | `build-prod` |
| `PROD_GOOGLE_WEB_CLIENT_ID` | `build-prod` |
| `PROD_GOOGLE_IOS_CLIENT_ID` | `build-prod` |
| `PROD_GOOGLE_ANDROID_CLIENT_ID` | `build-prod` |

Secrets are passed to EAS via the `--env` flag in the build command, mapping to the `EXPO_PUBLIC_*` names the app already reads.

---

## Distribution

- **Test:** EAS hosts the APK/IPA. Build URL is available in the EAS dashboard and linked from the GitHub Actions run summary.
- **Prod:** EAS hosts the AAB/IPA artifacts. Manual download and upload to Play Store / App Store.

---

## Files to Create/Modify

| File | Action |
|---|---|
| `lista-ai-mobile/eas.json` | Create — defines `preview` and `production` profiles |
| `.github/workflows/build.yml` | Create — two-job workflow |
| `lista-ai-mobile/app.json` | No change — stays environment-agnostic |

---

## Out of Scope

- Automatic store submission (EAS Submit)
- Firebase App Distribution
- Slack/email build notifications
- Maestro E2E tests in CI
