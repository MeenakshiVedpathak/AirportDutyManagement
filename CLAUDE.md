# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### React Native (frontend)
```powershell
# Start Metro bundler
npm start

# Run on Android (requires connected device or emulator)
npm run android

# Lint
npm run lint

# Run tests
npm test

# After adding/changing dependencies
npx patch-package   # applied automatically via postinstall
```

### Android build (Windows)
```powershell
$env:ANDROID_HOME = "C:\Users\MeenakshiVedpathak\AppData\Local\Android\Sdk"
Set-Location android
.\gradlew.bat app:assembleDebug
```

### Backend
```powershell
Set-Location backend

# Development (auto-restart)
npm run dev

# Production
npm start

# Seed the database
npm run seed
```

### Backend environment
Create `backend/.env` with: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and Firebase service account vars. The `serviceAccountKey.json` file must be present in `backend/`.

API docs available at `http://localhost:5000/api-docs` when running locally.

---

## Architecture

### Overview
Role-based duty management app for airport officers. React Native 0.83 frontend (RN CLI, not Expo) + Express.js backend on Railway (`admbackend-production-d063.up.railway.app`). MongoDB via Mongoose. OTP authentication via Twilio SMS. Firebase Cloud Messaging for push notifications.

Two user roles: `ADMIN` (manages officers, airports, duties, reports) and `OFFICER` (creates/views own duties, scans boarding passes).

### Navigation & Role Routing
`AppNavigator` checks Redux auth state on load:
- Unauthenticated → `AuthStack` (Login → OTP verification)
- `role=ADMIN` → `AdminTabs` (6 tabs, each with nested stacks)
- `role=OFFICER` → `OfficerTabs` (4 tabs, each with nested stacks)

Deep navigation params flow through React Navigation's native stack — screens receive `route.params` for IDs to fetch specific records.

### Authentication Flow
1. User submits credentials → backend validates password, generates 6-digit OTP, sends via Twilio SMS
2. Frontend shows OTP screen; user submits OTP → backend verifies, returns JWT
3. JWT stored in Redux (`authSlice`) and persisted to AsyncStorage via redux-persist
4. `axiosInstance` (in `src/api/axiosInstance.js`) attaches `Authorization: Bearer <token>` to every request; 401 responses dispatch `logout` and clear persisted storage

Only the `auth` slice is persisted. All other slices (`duties`, `officers`, `reports`, `airports`) are in-memory only and re-fetched on app start. Volatile auth fields (`error`, `isLoading`, `otpPending`) are stripped before persisting via `createTransform`.

### Data Flow Pattern
All screens use custom hooks rather than calling Redux or API directly:

```
Screen → Hook (src/hooks/) → Redux dispatch → API call (src/api/) → axiosInstance → Backend
```

Hooks handle loading states, error toasts (`react-native-toast-message`), and dispatching the result back to Redux. Screens should only read from hooks and call hook functions.

### Backend Structure
- `backend/server.js` — Express app, mounts all routes under `/api/v1/`
- `backend/middleware/auth.js` — `protect` (JWT verify) and `adminOnly` middleware
- `backend/controllers/` — Business logic; all controllers follow `(req, res) => try/catch` pattern
- `backend/models/` — Mongoose schemas: `User`, `Duty`, `Airport`, `Terminal`
- `backend/routes/` — Thin route files that apply middleware then call controllers

### Key Domain Logic

**Duty incentives** (`src/utils/incentiveUtils.js`): automatically set `incentive.eligible = true` and `incentive.amount = 500` when `officeType` is `BEFORE_OFFICE` or `AFTER_OFFICE`.

**Boarding pass scanning** (`src/utils/parseBoardingPass.js`): ML Kit text recognition (`@react-native-ml-kit/text-recognition`) extracts flight number, date, origin/destination from a photo. `BoardingPassScanScreen` calls the camera/gallery, passes the image to the parser, then pre-fills the duty creation form.

**Pending duty store** (`src/utils/pendingDutyStore.js`): AsyncStorage-backed queue used to preserve a duty draft if the app is interrupted before submission.

### API Base URL
Defined in `src/config.js`. Change `API_BASE_URL` here to point at a local backend during development.

### Patches
`patches/` contains `patch-package` diffs applied at `postinstall`. If a dep behaves unexpectedly, check here before debugging the dep itself.
