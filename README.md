# 🚀 Real-Time Intelligent Attendance System (Mobile App)

A production-ready **React Native (Expo)** application designed to prevent proxy attendance using a highly secure, multi-layer verification pipeline. It integrates seamlessly with the Node.js/Socket.IO backend to provide real-time attendance tracking with a verified light-theme UX.

---

## 🏗️ System Architecture & Workflow

This app is the student-facing terminal for the attendance system. The flow is as follows:

1.  **Hardware-Anchored Binding**: On first login, the app uses `expo-application` to extract the unchangeable, physical hardware ID of the phone (`ANDROID_ID` or Apple `IDFV`). This immutable ID binds the user to their physical device, mathematically preventing proxying via account sharing.
2.  **OTP-Verified Registration**: All new registrations and password resets are secured via 6-digit OTPs delivered via **Resend**, ensuring email ownership.
3.  **Enrollment & Approval**: Students request to join a subject using a unique 6-digit code. Faculty members must manually approve these requests in the "Pending Approvals" dashboard before the student is officially part of the roster.
4.  **Real-Time Connection**: The app connects to the backend via `Socket.IO` using JWT authentication. It listens for the `session_started` event on the student's enrolled subjects.
5.  **The 15-Second Window**: When a faculty member starts attendance, the socket event instantly triggers the `AttendanceScreen`. A critical 15-second SVG countdown timer begins.
5.  **Multi-Layer Validation**: 
    -   **GPS Lock**: Silent, high-accuracy `expo-location` GPS negotiation (background).
    -   **Visual Code**: The student must select the correct 3-digit code from 4 shuffled options *(looking at the professor's board)*.
6.  **Submission**: The payload `{ sessionId, selectedCode, deviceId, latitude, longitude }` is sent to the backend.
7.  **Result Broadcast**: The backend verifies distance (strictly geofenced), hardware ID signatures, and code validity, then drops the result (`PRESENT`, `ABSENT`, or `INVALID`) back to the app via a private socket room.

---

## ✨ Features

### Faculty Capabilities
-   **Class Management**: Organize subjects by Theory or Practical modules.
-   **Enrollment Approval**: Manage student rosters with a built-in approval/rejection workflow.
-   **Dynamic Sessions**: Start scheduled attendance windows with custom dates and times.
-   **Recent Classes Dashboard**: Quick-access list of the last 10 attendance sessions on the Reports tab.
-   **Lecture Details**: View a detailed breakdown of each lecture, including student names, PRNs, and status.
-   **Manual Overrides**: Manually change a student's attendance status (Present/Absent) to correct errors.
-   **Excel Exports**: Generate and download comprehensive attendance matrices directly to device storage.

### Student Capabilities
-   **Enrollment Tracking**: Join classes and monitor your approval status.
-   **Verified Onboarding**: OTP-based registration and secure **Self-Service Password Reset (SSPR)**.
-   **High-Security Verification**: Lock your account strictly to your physical device.
-   **Attendance Analytics**: Beautifully visualized history with "Overall Percentage" and "Subject-Specific" stats.
-   **Modern Light Theme**: System-wide high-fidelity light mode for maximum readability.
-   **Push Notifications**: Receive instant alerts when a professor starts taking attendance.

---

## 🛠️ Tech Stack 

-   **Framework**: React Native with Expo (Managed Workflow)
-   **Language**: TypeScript (Strict Mode)
-   **Routing**: Expo Router (v3)
-   **Styling**: NativeWind (Tailwind CSS for React Native) & Reanimated 3
-   **State Management**: Zustand (Auth & Device State)
-   **Data Fetching**: Axios & TanStack React Query
-   **Real-Time**: Socket.IO-Client
-   **Email Engine**: Resend (Serverless Email Platform)
-   **Native APIs**: 
    -   `expo-location` (Hybrid GPS Tracking)
    -   `expo-secure-store` (Encrypted JWT persistence)
    -   `expo-notifications` (Push notification integration)
    -   `expo-application` (Hardware Fingerprinting)

---

## 📁 Project Structure

```text
AttendanceApp/
├── app/                      # Expo Router views
│   ├── (auth)/               # Login & Register
│   ├── (tabs)/               # Home, History/Reports, Profile
│   │   ├── home.tsx          # Dashboard, Active Sessions, Pending Approvals
│   │   └── history.tsx       # Stats (Student) or Recent Classes & Downloads (Faculty)
│   ├── attendance.tsx        # Core 15s Verification Screen
│   ├── lecture-detail.tsx    # Faculty-only lecture breakdown & manual edit
│   └── _layout.tsx           # Global Auth Gate & Providers
├── components/               # UI Components
│   ├── PendingApprovalsModal.tsx # Roster management UI
│   ├── SchedulingModal.tsx       # Session timer & date config
│   ├── AttendanceSummaryModal.tsx # Post-session summary
│   ├── ExportFilterModal.tsx     # Excel export date range filters
│   └── CountdownTimer.tsx        # SVG Animated 15s Ring
├── services/                 # API & Socket logic
├── store/                    # Zustand (Auth, Hydration)
└── types/                    # TypeScript interfaces
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- Expo Go app on a physical mobile device (GPS requires physical hardware).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the App
```bash
npx expo start
```
Scan the QR code printed in the terminal using the Expo Go app.

---

## 📦 Production Builds

To build a standalone APK (Android):
1.  Install EAS CLI: `npm install -g eas-cli`
2.  Login: `eas login`
3.  Build: `eas build -p android --profile preview`

---

## 🔮 Future Roadmap
1.  **Biometric Verification**: Add FaceID/Fingerprint as a 4th layer of security.
2.  **Offline Buffering**: Queue attendance submissions when network drops at the 0:01 second mark.
3.  **Analytics V2**: Add predictive models for "At-Risk" students with low attendance.
