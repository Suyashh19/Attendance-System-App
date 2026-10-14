# ERP Integration Architecture for Real-Time Attendance System

## 1. Objective
The goal of this architecture is to enable seamless integration between the **Attendance System** and multiple **External ERP systems** using standardized, secure, and scalable APIs.

The system is designed with a "Single Source of Truth" philosophy:
- The **Attendance System** is the authoritative source for attendance data.
- **ERP systems** consume data via managed APIs.
- Responsibilities are decoupled to ensure long-term maintainability and system isolation.

---

## 2. High-Level Architecture
The integration follows a multi-layered approach to ensure security and logical separation.

```text
[ Mobile App / Devices ]
            ↓
[ Attendance Backend (Node.js/Express) ]
            ↓
[ Core Services Layer (Prisma/PostgreSQL) ]
            ↓
[ ERP Integration Layer (API Gateway / Managed Routes) ]
            ↓
[ External ERP Systems ]
```

---

## 3. Core Components

### 3.1 Mobile Application Layer
- **Environment**: React Native (Expo)
- **Role**: Captures attendance via the **Secure Verification Pipeline** (Manual code entry, Device hardware binding, and Session window validation).
- **Communication**: REST APIs over HTTPS.

### 3.2 Backend System (Source of Truth)
The central intelligence of the platform, built on Node.js and Express.
- **Verification Logic**: Multi-layered checks (Distance < 100m, Time < 20s, Device Lock).
- **Persistence**: Managed via Prisma ORM for type-safe database interactions.
- **Real-Time Engine**: Socket.IO for live broadcasts to campus devices.

### 3.3 Database Layer (Prisma & PostgreSQL)
- **Current Models**: `User`, `Subject`, `Enrollment`, `Session`, `Attendance`.
- **Indexing**: B-Tree indexes on `deviceId`, `studentId`, and `sessionId` for high-concurrency performance.

---

## 4. API Standards & Authentication

### 4.1 Authentication
- **Mechanism**: API Key based authentication.
- **Implementation**: Each tenant (college) is assigned a unique, rotatable API Key.
- **Header**: `Authorization: Bearer <ERP_API_KEY>`

### 4.2 Error Handling Standard
ERP systems require predictable failure modes. All errors return a `4xx` or `5xx` status code with the following JSON structure:

```json
{
  "status": "error",
  "error_code": "INVALID_TENANT",
  "message": "Tenant not found or unauthorized",
  "timestamp": "2024-04-18T10:00:00Z"
}
```

**Common Error Codes:**
- `AUTH_FAILED`: Invalid or expired API Key.
- `INVALID_TENANT`: Tenant ID does not match API Key scope.
- `RATE_LIMIT_EXCEEDED`: API call frequency threshold reached.
- `VALIDATION_ERROR`: Missing or malformed query parameters.

### 4.3 Timestamp Standardization
> [!IMPORTANT]
> All timestamps are stored and transmitted in **UTC (ISO 8601 format)**. Timezone conversion and localized display are the sole responsibility of the consuming ERP system.

---

## 5. Core ERP APIs (Pull Model)

The **Pull Model** is the default integration method for ERP systems.

### 5.1 Fetch Attendance Data
`GET /api/v1/erp/attendance`

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `tenant_id` | String | Yes | Unique identifier for the college. |
| `start_date` | String | No | ISO 8601 Start Date. |
| `end_date` | String | No | ISO 8601 End Date. |
| `limit` | Integer | No | Records per page (Max: 1000, Default: 100). |
| `offset` | Integer | No | Pagination offset. |

### 5.2 Pagination & Filtering Strategy
- **Max Limit**: Requests exceeding 1000 records will be automatically capped.
- **Filtering**: ERP systems should use `start_date` and `end_date` to perform incremental syncs.
- **Idempotency**: Fetching the same range multiple times returns consistent data unless records were explicitly updated by faculty.

---

## 6. Webhooks (Push Model - Optional)

For ERPs requiring instant updates, the system supports a **Push Model** via Webhooks.

### 6.1 Webhook Payload
```json
{
  "event": "attendance.marked",
  "tenant_id": "COLLEGE_001",
  "data": {
    "student_id": "123",
    "subject_id": "CS301",
    "status": "PRESENT",
    "timestamp": "2024-04-18T08:30:00Z"
  },
  "signature": "sha256=..."
}
```

### 6.2 Security & Reliability
- **Signature Verification**: ERPs must verify the `X-Hub-Signature` header using their shared secret.
- **Retry Policy**: Exponential backoff (5 retries) if the ERP endpoint returns a non-200 status.
- **Failure Handling**: If all retries fail, events are logged for manual replay via the Developer Portal.

---

## 7. Multi-Tenant Architecture
To support mass deployment, the system enforces strict resource isolation.

- **Data Scoping**: Every query is internally wrapped with a `WHERE tenant_id = ?` clause derived from the API Key.
- **Resource Limits**: Rate limiting is applied **per API Key** to ensure one vendor's burst traffic doesn't degrade performance for other colleges.
- **Rate Limit**: Default is **100 requests / minute**. Contact support for higher throughput.

---

## 8. Onboarding Pipeline for ERP Teams

1.  **Issue API Key**: Generate credentials via the System Admin Portal.
2.  **Sandbox Validation**: Integrate against the `/api/v1/sandbox` environment.
3.  **Data Mapping**: Map student `rollNo` or `prn` from the Attendance System to internal ERP IDs.
4.  **Production Migration**: Switch Base URL and API Keys to the production environment.

---

## 9. SLA & Performance Targets

- **API Uptime**: 99.9% monthly uptime target.
- **Response Time**: P95 < 200ms for standard data fetches.
- **Maintenance**: Scheduled windows weekly on Sundays (02:00 - 04:00 UTC).

---

## 10. Data Consistency & Sync Strategy

- **Periodic Sync**: It is recommended that ERPs perform a full sync once every 24 hours to reconcile any missed webhook events.
- **Conflict Resolution**: The Attendance System `id` is the primary key. If a record exists in the ERP with a different status, the Attendance System's version takes precedence.
