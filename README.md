# AgriQueue+ 🌾

**GovTech Smart Agricultural Procurement & APMC Mandi Queue Management System**

AgriQueue+ is an enterprise-grade digital platform engineered to modernize agricultural market yard (APMC Mandi) procurement operations under Minimum Support Price (MSP) schemes. It connects the complete end-to-end supply chain:

$$\text{Farmer Onboarding} \longrightarrow \text{Cryptographic OTP/JWT} \longrightarrow \text{Slot Capacity Booking} \longrightarrow \text{Tamper-Proof QR Gate Pass} \longrightarrow \text{Anti-Replay Gate Clearance} \longrightarrow \text{Electronic Weighbridge} \longrightarrow \text{Moisture \& Quality Grading} \longrightarrow \text{Backend MSP Computation} \longrightarrow \text{6-Stage PFMS DBT Tracking} \longrightarrow \text{Immutable Audit Trail}$$

---

## 🌟 Key Modules & Core Capabilities

### 1. 🔐 Cryptographic Authentication & Role-Based Access Control (RBAC)
- **Zero-Backdoor Authentication**: Eliminates static/hardcoded OTPs.
- **Random 6-Digit OTP**: Server generates cryptographically random 6-digit verification codes (`crypto.randomInt(100000, 999999)`).
- **Salted SHA-256 Hashing**: OTPs are hashed with a unique per-request salt and stored with an exact 5-minute expiry timestamp.
- **Signed JWT Sessions**: Issues signed JSON Web Tokens (`HS256`) containing verified user ID, name, and role.
- **Role Enforcement**: Strict middleware (`authenticateToken`, `requireRole`) guarding critical operations. Unauthorized attempts (e.g. farmers accessing weighbridge tools or resolving complaints) are blocked with `403 Forbidden`.

### 2. 📅 Capacity-Managed Slot Booking & Anti-Overbooking
- **Live Mandi Quotas**: Enforces strict concurrent capacity limits per center, date, and time window (maximum 20 bookings per slot).
- **Overbooking Prevention**: Concurrent requests exceeding capacity are rejected with `409 Conflict`.
- **Cryptographic Gate Pass**: Generates high-resolution digital QR e-Passes formatted as `AGRIQ-V1:BOOKING_ID:TOKEN:SHA256_HASH` and verified by the backend.

### 3. 🛡️ Anti-Replay Gate Verification
- **Digital Check-In**: Mandi security and intake agents scan or enter the pass token.
- **Anti-Replay Protection**: Verifies pass integrity and checks entry state. Approved entries transition the booking to `GATE_CLEARED`. Re-scanning an already-used QR pass is strictly rejected with `400 Bad Request` (`ALREADY_USED`).

### 4. ⚖️ Electronic Weighbridge & Moisture Quality Gate
- **Gross & Tare Weighing**: Intake officers record Gross Vehicle Weight and Tare Weight. The backend automatically computes Net Weight in Kilograms and Quintals ($1\text{ Qtl} = 100\text{ kg}$).
- **Moisture Threshold Enforcement**:
  - **Wheat**: Maximum allowable moisture $\le 14\%$.
  - **Paddy**: Maximum allowable moisture $\le 17\%$.
  - Batches exceeding allowable limits are rejected for quality non-compliance, blocking payment processing.
- **Quality Grading**: Automated classification (Grade A / Grade B / Below Spec).
- **Official MSP Valuation**: Final procurement value is calculated exclusively by the backend using prevailing MSP rates (e.g. Wheat @ ₹2,275/Qtl).
- **Electronic Slip Generation**: Automatically issues official receipts (`WGH-...`) linked directly to the booking.

### 5. 💳 Dynamic 6-Stage PFMS Payment State Machine
Tracks the farmer's grain consignment across 6 sequential procurement stages:
1. `BOOKED` — Slot reservation confirmed.
2. `GATE_CLEARED` — Physical mandi entry authenticated.
3. `WEIGHED` — Gross and Tare weight recorded.
4. `QUALITY_ACCEPTED` — Moisture & FAQ grade verified.
5. `PAYMENT_INITIATED` — PFMS Direct Benefit Transfer batch generated.
6. `PAYMENT_PROCESSED` — Funds disbursed to the farmer's bank account.

### 6. 📊 Real-Time Admin Analytics & Immutable Audit Trail
- **Live Metrics**: Real-time aggregation of active farmers, completed weighments, total MSP disbursed, and active grievance alerts.
- **Immutable Security Audit Log**: Every critical transaction (`LOGIN_SUCCESS`, `BOOKING_CREATED`, `GATE_ENTRY_CLEARED`, `GATE_ENTRY_REJECTED`, `WEIGHMENT_RECORDED`, `COMPLAINT_RESOLVED`) is preserved in an immutable audit ledger (`audit_logs`) accessible to administrators.
- **Grievance Redressal**: In-app dispute intake with official resolution workflows restricted to authorized administrators.

---

## 🏗️ Architecture & Directory Structure

```
AgriQueue+/
├── backend/
│   ├── server.js                   # Express server entry point (Port 5000, Helmet, CORS)
│   ├── schema.sql                  # Relational MySQL schema & seed dataset
│   ├── config/
│   │   ├── db.js                   # Atomic JSON persistent storage engine
│   │   ├── mysqlDb.js              # MySQL connection pool adapter
│   │   └── initDatabase.js         # Automated MySQL migration runner
│   ├── middleware/
│   │   └── auth.js                 # JWT verification, RBAC guard, optionalAuth
│   ├── services/
│   │   └── auditService.js         # Centralized immutable security audit logging
│   ├── controllers/                # Secure business logic controllers
│   │   ├── authController.js       # Random OTP generation, SHA-256 hashing, JWT login
│   │   ├── bookingController.js    # Quota validation, cryptographic QR tokens, PFMS tracker
│   │   ├── agentController.js      # Anti-replay gate verification & entry clearance
│   │   ├── weighmentController.js  # Electronic weighbridge, moisture test, MSP calculation
│   │   ├── mspController.js        # MSP rates & crop value estimation
│   │   ├── centerController.js     # Center listings & time-slot quotas
│   │   ├── complaintController.js  # Grievance intake & RBAC resolution
│   │   └── adminController.js      # Live DB aggregations & audit log viewer
│   ├── routes/                     # Modular API route definitions
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── agentRoutes.js
│   │   ├── weighmentRoutes.js
│   │   ├── mspRoutes.js
│   │   ├── centerRoutes.js
│   │   ├── complaintRoutes.js
│   │   └── adminRoutes.js
│   ├── tests/
│   │   └── testPipeline.js         # 16-test automated integration suite
│   ├── data/
│   │   └── database.json           # Portable zero-config data store
│   └── package.json
│
├── frontend/
│   ├── index.html                  # GovTech academic prototype single-page web portal
│   ├── css/
│   │   ├── main.css                # Design tokens, color system, typography & utilities
│   │   ├── components.css          # Badges, status chips, responsive tables & modals
│   │   ├── landing-auth.css        # Hero presentation, 6-digit OTP UI, auth modal
│   │   ├── farmer.css              # 6-stage PFMS tracker, booking wizard, QR E-Pass
│   │   └── admin.css               # Analytics dashboards, weighbridge station UI
│   └── js/
│       ├── api.js                  # Bearer token management & REST API client
│       ├── auth.js                 # 6-digit OTP handling, dev OTP auto-fill & session management
│       ├── farmer.js               # Slot booking wizard, dynamic tracker & E-Pass render
│       ├── agent.js                # Anti-replay QR scanner, weighbridge console & slip preview
│       ├── admin.js                # Chart.js analytics & complaint resolution
│       ├── data.js                 # Reference commodity rates & initial centers
│       ├── state.js                # Reactive application state
│       ├── utils.js                # Bilingual localization (EN/HI) & toast alerts
│       └── app.js                  # App bootstrap & health poller
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v16 or higher (v18+ recommended)
- **Modern Web Browser**: Chrome, Edge, Firefox, or Safari

### 1. Install & Run Backend Server

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the server (runs on Port 5000)
npm run dev
# or
node server.js
```

The server initializes at `http://localhost:5000`.

### 2. Database Options

- **Option A (Default - Zero Configuration)**: Runs automatically with `backend/data/database.json`. No separate database server required.
- **Option B (MySQL Relational Storage)**: Configure credentials in `backend/.env` and execute:
  ```bash
  npm run db:init
  ```

### 3. Open Frontend Application

The backend serves the frontend statically directly from root:
- Open your browser to **`http://localhost:5000`**

*(Alternatively, run `npx serve frontend -p 3000`)*.

---

## 🧪 Automated Integration Test Suite

AgriQueue+ includes a 16-step automated test suite covering the entire pipeline. To execute:

```bash
cd backend
npm test
```

### Test Suite Output
```
======================================================
🌾 STARTING AGRIQUEUE+ END-TO-END AUTOMATED TEST SUITE
======================================================

• Testing 1.1 Real Random OTP Dispatch & Console Log... ✅ PASSED
• Testing 1.2 Reject Arbitrary / Fake OTP (1234 backdoor removal)... ✅ PASSED
• Testing 1.3 Accept Real Hashed OTP & Issue Signed JWT Session... ✅ PASSED
• Testing 1.4 Acquire Agent & Admin Session Tokens... ✅ PASSED
• Testing 2.1 Block Unauthorized Farmer from Weighbridge Actions... ✅ PASSED
• Testing 2.2 Block Unauthorized Farmer from Resolving Complaints... ✅ PASSED
• Testing 2.3 Allow Admin to Resolve Grievance Ticket... ✅ PASSED
• Testing 3.1 Successful Mandi Slot Booking with Cryptographic QR Token... ✅ PASSED
• Testing 4.1 Agent Verifies Authentic Cryptographic QR Pass... ✅ PASSED
• Testing 4.2 Agent Approves Gate Entry (Status -> GATE_CLEARED)... ✅ PASSED
• Testing 4.3 Anti-Replay: Reject Second Gate Entry Attempt with Same QR... ✅ PASSED
• Testing 5.1 Weighbridge Gross & Tare Weighing + Automated MSP Computation... ✅ PASSED
• Testing 5.2 Quality Rejection on High Moisture (>14% threshold)... ✅ PASSED
• Testing 6.1 Payment Tracker Displays 6-Stage Real Lifecycle & Timestamps... ✅ PASSED
• Testing 7.1 Admin Overview Aggregates Live Database Metrics... ✅ PASSED
• Testing 7.2 Audit Log Records Complete Immutable Security Trail... ✅ PASSED

======================================================
🏁 TEST RESULTS: 16 PASSED, 0 FAILED
======================================================
```

---

## 📡 REST API Reference

### Authentication & Sessions
| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/api/auth/send-otp` | `POST` | Public | Generates random 6-digit OTP, stores salted hash & 5m expiry |
| `/api/auth/login` | `POST` | Public | Validates OTP hash; issues signed JWT bearer token |
| `/api/auth/register` | `POST` | Public | Registers new farmer profile |
| `/api/auth/me` | `GET` | Bearer | Returns verified authenticated identity |

### Mandi Centers & MSP Rates
| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/api/msp` | `GET` | Public | Retrieves current MSP commodity rates |
| `/api/msp/calculate` | `GET` | Public | Calculates harvest valuation preview |
| `/api/centers` | `GET` | Public | Lists procurement centers and capacity metrics |
| `/api/centers/:id/slots` | `GET` | Public | Returns remaining capacity for selected date & slot |

### Slot Booking & PFMS Tracker
| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/api/bookings` | `GET` | Bearer | Returns role-scoped booking records |
| `/api/bookings` | `POST` | Bearer | Validates slot capacity ($<20$), generates cryptographic QR token |
| `/api/bookings/:id/tracker` | `GET` | Bearer | Returns 6-stage PFMS lifecycle with real weighment metrics |

### Gate Clearance & Weighbridge Operations
| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/api/agent/queue` | `GET` | Agent/Admin | Inbound queue manifest |
| `/api/agent/verify/:token`| `GET` | Agent/Admin | Validates cryptographic QR pass against database hash |
| `/api/agent/process-entry`| `POST` | Agent/Admin | Approves entry (`GATE_CLEARED`); rejects reused passes |
| `/api/agent/reject-entry` | `POST` | Agent/Admin | Rejects batch at gate with recorded reason |
| `/api/weighments` | `POST` | Agent/Admin | Gross/Tare weighing, moisture check ($\le 14\%$), auto MSP |
| `/api/weighments/:bookingId` | `GET` | Bearer | Retrieves official weighment slip |

### Grievances & Administration
| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/api/complaints` | `GET`, `POST` | Bearer | Submits or views dispute tickets |
| `/api/complaints/:id/resolve` | `PATCH` | Admin | Resolves dispute ticket |
| `/api/admin/overview` | `GET` | Admin | Real-time database KPI aggregations |
| `/api/admin/throughput` | `GET` | Admin | Mandi intake distribution metrics |
| `/api/admin/crop-stats` | `GET` | Admin | Commodity-wise volume and payout tallies |
| `/api/admin/audit-logs` | `GET` | Admin | Immutable security and operational audit trail |

---

## 👨‍💻 Author

**Devbrat Patel**
- GitHub: [@DevbratPatel](https://github.com/DevbratPatel)
- Repository: [DevbratPatel/AgriQueuePlus](https://github.com/DevbratPatel/AgriQueuePlus)

## 📄 License

This project is licensed under the [MIT License](LICENSE).
