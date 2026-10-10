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
- **Role**: Captures attendance using the **Secure Verification Pipeline** (Manual code entry, Device hardware binding, and Session window validation).
- **Communication**: REST APIs over HTTPS.

### 3.2 Backend System (Source of Truth)
The central intelligence of the platform, built on Node.js and Express.
- **Authentication Service**: Currently utilizes JWT-based authentication for Faculty and Students.
- **Attendance Service**: Handles the complex `mark-attendance` logic with O(log N) efficiency and geofencing.
- **Device Verification**: Enforces fixed device hardware bindings to prevent proxy attendance.
- **Logging & Monitoring**: Tracks every submission attempt and verification result.

### 3.3 Database Layer (Prisma & PostgreSQL)
Utilizes **Prisma ORM** for efficient data manipulation and **PostgreSQL** for persistent storage.
- **Current Models**: `User`, `Subject`, `Enrollment`, `Session`, `Attendance`, `Otp`.
- **Relational Integrity**: B-Tree indexing on `deviceId` and `studentId` for high-concurrency performance.

### 3.4 ERP Integration Layer
This layer acts as the controlled interface between internal business logic and external systems.
- **Controlled Exposure**: Prevents direct database access or exposure of internal-only APIs.
- **Data Normalization**: Transforms internal relational structures (Prisma models) into standardized JSON for ERP consumption.
- **Version Control**: Enforced through `/api/v1/erp/` pathing for backward compatibility.

---

## 4. API Design (Standardized)

All ERP-facing APIs will reside under the `/api/v1/erp/` namespace.

### 4.1 Authentication
- **Mechanism**: API Key based authentication.
- **Implementation**: Each tenant (college) is assigned a unique, rotatable API Key.
- **Header**: `Authorization: Bearer <ERP_API_KEY>`

### 4.2 Core ERP Endpoints
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/erp/attendance` | `GET` | Fetch attendance records with filtering (`tenant_id`, `start_date`, `end_date`, `class_id`). |
| `/api/v1/erp/students` | `GET` | Sync student lists and enrollment statuses. |
| `/api/v1/erp/faculty` | `GET` | Retrieve faculty information and subject assignments. |
| `/api/v1/erp/reports/summary` | `GET` | Fetch aggregated attendance percentages per student/subject. |

### 4.3 Standardized Response Format
```json
{
  "status": "success",
  "data": [...],
  "message": "Data fetched successfully",
  "meta": {
    "total_records": 100,
    "page": 1
  }
}
```

---

## 5. Multi-Tenant Architecture
To support mass deployment across multiple colleges, a Multi-Tenant model is employed.

### 5.1 Concept: Shared Database, Isolated Data
- Every record (`User`, `Attendance`, `Session`) is associated with a `tenant_id`.
- Queries are strictly scoped to the `tenant_id` associated with the API Key provided in the request.

### 5.2 Implementation Roadmap (Data Model)
| Component | tenant_id Requirement |
| :--- | :--- |
| **Students** | Mandatory for college-level isolation. |
| **Faculty** | Mandatory for department/subject scoping. |
| **Attendance** | Critical for audit trails and billing. |

---

## 6. Security & Performance

### 6.1 Security Measures
- **HTTPS Enforcement**: Mandatory for all API traffic.
- **Rate Limiting**: Throttling requests to prevent DDoS or resource exhaustion by misconfigured ERP scripts.
- **Tenant Isolation**: Strict cross-tenant data access prevention logic via middleware.

### 6.2 Performance Strategy
- **Prisma Middlewares**: Automated injection of tenant filtering in all queries.
- **Caching (Redis)**: Recommended for high-frequency ERP summary requests to minimize database hits.
- **Indexing**: Composite indexes on `[tenant_id, createdAt]` to ensure fast reporting.

---

## 7. ERP Responsibilities
The External ERP is responsible for:
1. **Data Pulling**: Frequently syncing data via the provided endpoints.
2. **Schema Mapping**: Mapping the standardized JSON into their internal formats.
3. **Dashboards**: Generating front-end visualizations for administrators and bursars.
4. **Lifecycle Management**: Triggering student/faculty decommissioning via their internal systems.

---

## 8. Versioning & Future Enhancements
- **Versioning**: `/api/v1/...` → `/api/v2/...` ensures that ERP updates do not break existing integrations.
- **Webhooks**: Planned support for `POST` notifications to ERP endpoints upon critical events (e.g., student marks attendance).
- **GraphQL**: Potential for flexible, client-defined queries for larger ERP providers.
- **Documentation**: Swagger UI portal for ERP developers.

---

> [!NOTE]
> This document serves as the architectural blueprint for the ERP integration layer. Implementation should prioritize the creation of the `Tenant` model in the Prisma schema as the first prerequisite.
