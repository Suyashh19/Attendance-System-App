# Attendance System — Mobile App

React Native (Expo) app for a real-time classroom attendance system, used by both faculty and students. A faculty member opens a 15-second attendance window and shows a 4-digit code; each student types it in from the one phone their account is locked to.

The API lives in a separate repository: [Attendance-System-Backend](https://github.com/Suyashh19/Attendance-System-Backend).

---

## How it works

1. **Sign up** — registration and password reset are confirmed with a 6-digit OTP sent by email.
2. **Join a subject** — a student requests to join with the subject's code, and the faculty approves or rejects the request.
3. **Session starts** — the faculty starts attendance. Enrolled students get a `session_started` socket event and a push notification, and the attendance screen opens with a 15-second countdown.
4. **Enter the code** — the student types the 4-digit code shown on the faculty's screen. The code is never sent to student phones, and a student gets 3 tries.
5. **Submit** — the app sends `{ sessionId, code, deviceId }` to the backend.
6. **Result** — the backend checks enrollment, device, time window and code, then sends `PRESENT`, `INVALID` or `ABSENT` back on the student's private socket room.

### Device lock

The app reads the phone's hardware ID (`ANDROID_ID` on Android, the vendor ID on iOS) with `expo-application`. The first attendance submission locks the account to that phone; submissions from any other phone are rejected. A student can move their account to a new phone with an email OTP, once every 30 days.

---

## Features

**Faculty**

- Create theory and practical subjects
- Approve or reject enrollment requests
- Start an attendance session and watch the present count update live
- Reopen a running session after an app restart
- See a per-lecture roster with names, PRNs and statuses
- Manually change a student's status
- Export a subject's attendance to Excel

**Student**

- Join subjects by code and track approval status
- Mark attendance by typing the classroom code
- See overall and per-subject attendance percentages and history
- Get push notifications when a session starts and when the result is final

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | React Native 0.81 with Expo SDK 54 |
| Language | TypeScript |
| Routing | Expo Router 6 (typed routes) |
| Styling | NativeWind (Tailwind CSS), Reanimated 4 |
| State | Zustand |
| Data | Axios, TanStack React Query |
| Forms | React Hook Form + Zod |
| Real-time | Socket.IO client |
| Native modules | `expo-secure-store`, `expo-notifications`, `expo-application` |
| Tests | Jest with `jest-expo` |

---

## Project structure

```text
app/                      # Expo Router screens
├── _layout.tsx           # Auth gate and providers
├── index.tsx             # Entry redirect
├── (auth)/               # Login, register, forgot password
├── (tabs)/
│   ├── home.tsx          # Classes
│   ├── attendance.tsx    # Active session (hidden from the tab bar)
│   ├── history.tsx       # Attendance (student) or Reports (faculty)
│   └── profile.tsx
├── subject/[id].tsx      # Subject page (faculty and student views)
└── lecture-detail.tsx    # Faculty roster for one lecture
components/               # Shared UI, modals, and subject/ views
constants/                # Colour palette and theme tokens
hooks/                    # useDeviceId, useSocket
services/                 # API client, auth, attendance, analytics, socket, notifications
store/                    # Zustand auth store
types/                    # Shared TypeScript types
__tests__/                # Jest tests for the API client and socket service
scripts/                  # One-off Python scripts used for theme refactors
```

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- Android Studio (or Xcode on macOS) for a development build
- A physical phone for push notifications

### 1. Install

```bash
git clone https://github.com/Suyashh19/Attendance-System-App.git
cd Attendance-System-App
npm install
```

### 2. Point the app at a backend

By default the app talks to the hosted backend. To use a local or staging server, create a `.env` file in the project root:

```env
EXPO_PUBLIC_SERVER_URL=http://192.168.1.10:5000
```

Use your computer's LAN address rather than `localhost` so a phone can reach it. The same URL is used for both REST (`/api`) and Socket.IO.

### 3. Run

```bash
npm run android   # build and run a development build on Android
npm run ios       # same for iOS (macOS only)
npm start         # start the Metro bundler only
```

Push notifications need a development build on a physical device; they do not work in Expo Go on Android.

### 4. Check

```bash
npm run typecheck
npm test
```

---

## Builds

Builds use EAS with the profiles in `eas.json`:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # installable APK
eas build -p android --profile production   # store build
```

| Profile | Output |
|---|---|
| `development` | Development client APK, internal distribution |
| `preview` | APK, internal distribution |
| `production` | Store build with an auto-incremented version |

---

## Related documents

- [`ERP-integration.md`](./ERP-integration.md) — architecture plan for integrating with external ERP systems
