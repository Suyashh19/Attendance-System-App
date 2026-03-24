# 🚀 Real-Time Intelligent Attendance System (Mobile App)

A production-ready **React Native (Expo)** application designed to prevent proxy attendance using a highly secure, multi-layer verification pipeline. It integrates seamlessly with the Node.js/Socket.IO backend to provide a 15-second real-time attendance window.

---

## 🏗️ System Architecture & Workflow

This app is the student-facing terminal for the attendance system. The flow is as follows:

1. **Authentication & Binding**: On first login, the app generates a unique Cryptographic Device ID (`UUID v4`) and stores it securely using `expo-secure-store`. This ID binds the user to their physical device to prevent proxying by sharing accounts.
2. **Real-Time Connection**: The app connects to the backend via `Socket.IO` using JWT authentication. It listens for the `session_started` event on the student's enrolled subjects.
3. **The 15-Second Window**: When a professor starts attendance, the socket event instantly triggers the `AttendanceScreen`. A critical 15-second SVG countdown timer begins.
4. **Data Collection**: During these 15 seconds, the app immediately fetches the `expo-location` (using a <30s cache for speed, falling back to fresh GPS).
5. **Multi-Layer Validation**: The student must select the correct 3-digit code from 4 shuffled options on the screen *(looking at the professor's board)*. 
6. **Submission**: The payload `{ sessionId, selectedCode, deviceId, latitude, longitude }` is sent to the backend.
7. **Result Broadcast**: The backend verifies distance (geofencing) and code strictness, then drops the result (`PRESENT`, `ABSENT`, or `INVALID` proxy attempt) directly back to the app via a private socket room.

---

## 🛠️ Tech Stack 

- **Framework**: React Native with Expo (Managed Workflow)
- **Language**: TypeScript (Strict Mode)
- **Routing**: Expo Router (v3)
- **Styling**: NativeWind (Tailwind CSS for React Native) & Reanimated 3
- **State Management**: Zustand (Auth & Device State)
- **Data Fetching**: Axios & TanStack React Query
- **Forms & Validation**: React Hook Form + Zod
- **Real-Time**: Socket.IO-Client
- **Native APIs**: 
  - `expo-location` (GPS Tracking)
  - `expo-secure-store` (Encrypted JWT + Device ID persistence)
  - `expo-notifications` (Push Token Generation)
  - `expo-device` & `expo-crypto` (Unique hardware binding)

---

## 📁 Project Structure

```text
AttendanceApp/
├── app/                      # Expo Router views
│   ├── (auth)/               # Login & Register (Public)
│   ├── (tabs)/               # Bottom Tabs: Home, History, Profile
│   │   └── attendance.tsx    # Core 15s Verification Screen (Hidden from tabs)
│   └── _layout.tsx           # Global Auth Gate & Providers
├── components/               # Reusable UI Elements
│   ├── AttendanceResultModal.tsx # Animated success/failure overlay
│   ├── CountdownTimer.tsx    # SVG Animated 15s Ring
│   └── VerificationStatus.tsx# Multi-layer check indicators
├── hooks/                    # Custom React Hooks
│   ├── useLocation.ts        # Optimized GPS fetching strategy
│   ├── useDeviceId.ts        # Crypto UUID generation & secure retrieval
│   └── useSocket.ts          # Socket.io lifecycle & room management
├── services/                 # API & External Integrations
│   ├── api.ts                # Axios Base + JWT Interceptors
│   ├── auth.ts               # Login/Register endpoints
│   ├── attendance.ts         # Submissions & History REST calls
│   └── socket.ts             # Socket singleton connection
├── store/                    # Zustand Stores
│   └── authStore.ts          # Hydration, login state, device ID
├── types/                    # Strict TypeScript Interfaces
└── app.json                  # Expo build configurations & permissions
```

---

## 🚀 Setup & Installation (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- Expo Go app installed on your physical mobile device (Android/iOS).
- *Note: GPS functionality and Push Notifications require a physical device.*

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Context
By default, the app is pointed at the deployed live backend:
`https://attendance-system-backend-uqgy.onrender.com`

If you are running the backend locally, update `BASE_URL` in `services/api.ts` and `SOCKET_URL` in `services/socket.ts` to `http://<YOUR_LOCAL_IP>:5000`. Do not use `localhost` since the physical device needs network access.

### 4. Run the App
```bash
npx expo start
```
Scan the QR code printed in the terminal using the Expo Go app on your phone.

---

## 📦 Generating the Production APK (Android)

To build a standalone APK for Android, we use Expo Application Services (EAS).

### 1. Install EAS CLI globally
```bash
npm install -g eas-cli
```

### 2. Login to your Expo account
```bash
eas login
```

### 3. Configure the Build
```bash
eas build:configure
```
*(When prompted, select Android and allow EAS to generate the `eas.json` file)*

### 4. Trigger the Build
We will use the `preview` profile to generate a `.apk` file instead of an `.aab` (App Bundle) so it can be directly side-loaded onto devices.

```bash
eas build -p android --profile preview
```

Wait for the build to finish on Expo's servers. Once completed, a download link to your `.apk` will be provided in the terminal.

---

## 🔮 Future Improvements
1. **Biometric Fallback**: Integrate `expo-local-authentication` (FaceID/Fingerprint) as a 5th verification layer before submitting the form.
2. **Background Location & Notifications**: Currently, the socket requires the app to be in the foreground. Deep linking the push notifications to the `attendance.tsx` screen will allow students to jump straight into the countdown from a locked screen.
3. **Offline Sync Queue**: If the network drops at exactly `0:01` seconds, cache the encrypted payload locally and sync it with a timestamp verification logic once reconnected.
