# ReachInbox - Full-Stack Email Job Scheduler

A high-performance, distributed ReachInbox-style Email Job Scheduler built with Node.js, TypeScript, Express, BullMQ, Redis, PostgreSQL (Prisma), Nodemailer (Ethereal SMTP), Google OAuth 2.0, and React with Tailwind CSS, designed in strict adherence to the official Figma design.

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 18 + Vite + Tailwind CSS)"]
        UI[ReachInbox Dashboard]
        Compose[Compose Email & CSV Lead Parser]
        AuthUI[Google OAuth 2.0 / Demo Login]
    end

    subgraph Server["Backend (Node.js + Express + TypeScript)"]
        REST[REST API Endpoints]
        AuthSvc[Auth & JWT Service]
        SchedSvc[Scheduler & Campaign Manager]
        RateLimiter[Redis Rate Limiter & Delay Spacing Engine]
    end

    subgraph Storage["Persistence & Caching"]
        DB[(PostgreSQL Database via Prisma)]
        Redis[(Redis 7 Cluster / Queue & Rate Store)]
    end

    subgraph Execution["Background Processing"]
        Queue[BullMQ Delayed Queue]
        Worker[BullMQ Dedicated Worker Pool]
        SMTP[Ethereal SMTP / Nodemailer]
    end

    UI -->|REST Requests| REST
    Compose -->|CSV Upload & Schedule Payload| REST
    AuthUI -->|OAuth Verification| AuthSvc
    
    REST --> SchedSvc
    SchedSvc -->|Persist Campaign & Emails| DB
    SchedSvc -->|Enqueue Delayed Job (deterministic jobId = email.id)| Queue
    
    Queue -->|Pulls scheduled jobs| Worker
    Worker -->|1. Idempotency Check & Status Guard| DB
    Worker -->|2. Check Atomic Hourly Limit & Min Delay| RateLimiter
    RateLimiter <-->|Atomic INCR & Last-Send Keys| Redis
    Worker -->|3. Dispatch Mail| SMTP
    Worker -->|4. Mark SENT / FAILED| DB
```

---

## ⚡ Tech Stack

### Backend
* **Language & Runtime:** TypeScript, Node.js (v20+)
* **Framework:** Express.js
* **Queue Engine:** BullMQ
* **Cache & Broker:** Redis 7
* **Database & ORM:** PostgreSQL 16, Prisma ORM
* **Mailing:** Nodemailer with Ethereal Email SMTP
* **Authentication:** Google OAuth 2.0 (`google-auth-library`) & JWT (`jsonwebtoken`)
* **Logging:** Pino & Pino-Pretty structured logging

### Frontend
* **Core:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS (Custom Figma Design System)
* **Icons:** Lucide React
* **Lead Parsing:** PapaParse (CSV & Text)
* **Date Utilities:** `date-fns`

### Infrastructure & Tooling
* **Containerization:** Docker Compose for PostgreSQL 16 & Redis 7
* **Testing:** Vitest

---

## 📁 Repository Structure

```
reachinbox-scheduler/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # PostgreSQL schema (User, Sender, Campaign, Email)
│   ├── src/
│   │   ├── config/                    # Environment variable parsing and validation
│   │   ├── controllers/               # Auth, Email, Health controllers
│   │   ├── middleware/                # JWT Auth, Zod Validation, Central Error Handler
│   │   ├── queue/                     # BullMQ Queue and Dedicated Worker logic
│   │   ├── routes/                    # Express REST route definitions
│   │   ├── services/                  # SMTP, Redis, Rate Limiter, DB, Auth services
│   │   ├── utils/                     # Logger with sensitive redaction
│   │   ├── app.ts                     # Express App initialization
│   │   ├── server.ts                  # HTTP Server entrypoint
│   │   └── worker.ts                  # Standalone Worker entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/LoginView.tsx     # Figma-matched Login with Google card
│   │   │   ├── compose/               # Compose modal, CSV Lead upload, Send Later picker
│   │   │   ├── dashboard/             # Sidebar, Header, EmailList, Detail View
│   │   │   └── ui/                    # LoadingSpinner, EmptyState
│   │   ├── context/AuthContext.tsx    # Auth state provider
│   │   ├── services/api.ts            # Axios client with interceptors
│   │   ├── types/index.ts             # TypeScript interfaces
│   │   ├── utils/csvParser.ts         # CSV & regex email parser
│   │   ├── App.tsx                    # Root dashboard application
│   │   ├── main.tsx
│   │   └── index.css                  # Tailwind styles & custom scrollbars
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml                 # PostgreSQL 16 & Redis 7 setup
├── .env.example                       # Root environment variable template
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the root directory and in `backend/.env`:

```env
# Application
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=reachinbox_jwt_super_secret_key_32_characters_long

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox_scheduler?schema=public"

# Redis (BullMQ Queue & Rate Limiting)
REDIS_URL="redis://localhost:6379"

# BullMQ Worker Configuration
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

# Ethereal Email SMTP (leave empty to automatically generate a live test account on startup)
ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT=587
ETHEREAL_USER=""
ETHEREAL_PASSWORD=""
ETHEREAL_FROM_NAME="ReachInbox Scheduler"
ETHEREAL_FROM_EMAIL="scheduler@reachinbox.ai"
```

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 2. Backend Setup & Database Migration
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Key Architectural Decisions & Requirements

### 1. BullMQ Delayed Job Scheduling
* Emails are scheduled using BullMQ delayed jobs backed by Redis (`delay = Math.max(0, scheduledAt - now)`).
* Primary scheduler uses Redis time-sorted sets (`ZADD` / `ZRANGEBYSCORE`) under BullMQ rather than Node.js `setTimeout` or `node-cron`, ensuring crash-resilience and horizontal scalability.
* Deterministic job IDs (`jobId = email.id`) guarantee that redundant schedule requests for the same email will not create duplicate queue entries.

### 2. Idempotency & Exactly-Once Semantics
* **Identity Guard:** Every email record is assigned a persistent UUID in PostgreSQL.
* **Pre-send Status Verification:** When the worker picks up a job, it queries PostgreSQL. If `status === 'SENT'`, the job is acknowledged and skipped immediately without calling SMTP.
* **Atomic State Transition:** The worker transitions status to `PROCESSING` with attempt incrementing before invoking SMTP.
* **Trade-Off Note:** Distributed "exactly once" delivery across external SMTP servers and internal databases cannot be guaranteed in the event of an abrupt network failure occurring after SMTP acceptance but before the database write. The system adopts an **at-least-once dispatch with strict local database idempotency** strategy to eliminate double-send risks.

### 3. Restart Persistence & Crash Recovery
* BullMQ delayed jobs are saved in Redis with AOF (`appendonly yes`).
* If the backend server or worker processes are terminated and restarted:
  1. Redis retains all pending delayed jobs.
  2. The worker re-attaches to the queue on startup and processes scheduled emails precisely when their delayed timestamps arrive.
  3. Already `SENT` records in PostgreSQL are protected by the idempotency guard and never re-sent.

### 4. Configurable Concurrency
* Concurrency is dynamically controlled via the `WORKER_CONCURRENCY` environment variable (default: `5`).
* Multiple worker processes or nodes can run concurrently against the shared BullMQ queue and Redis cluster.

### 5. Minimum Delay Between Sends
* Configured via `MIN_EMAIL_DELAY_MS` (default: `2000ms`).
* Uses Redis key `email-delay:{senderId}` to record the timestamp of the last dispatch.
* When consecutive emails are processed, the worker enforces spacing before SMTP transmission to prevent spam flag triggers.

### 6. Redis-Backed Hourly Rate Limiting
* Configured via `MAX_EMAILS_PER_HOUR` (default: `200`).
* Atomic hourly counter key: `email-rate:{senderId}:{YYYYMMDDHH}` with 2-hour TTL.
* **Non-Dropping Guarantee:** When the limit is reached:
  * The email is **not** dropped.
  * The job is **not** permanently failed.
  * The system computes the remaining time until the start of the next UTC hour window and reschedules the BullMQ job with a delay.
  * PostgreSQL status is kept as `SCHEDULED` with an updated `scheduledAt` timestamp.

### 7. Behavior with 1000+ Emails
* If 1,000 emails are scheduled simultaneously with an hourly limit of 200:
  * **Hour 1:** First 200 emails are dispatched spaced by `delayMs`.
  * **Hour 2:** Next 200 emails are dispatched automatically.
  * **Hour 3:** Next 200 emails are dispatched.
  * **Hour 4:** Next 200 emails are dispatched.
  * **Hour 5:** Final 200 emails are dispatched.

---

## 📡 REST API Documentation

### Authentication Endpoints
* `GET /api/auth/google` — Returns Google OAuth 2.0 authorization URL.
* `GET /api/auth/google/callback` — Handles OAuth redirect, creates/finds user, returns JWT.
* `POST /api/auth/demo-login` — Instant development login (Oliver Brown / demo user).
* `GET /api/auth/me` — Returns authenticated user profile and configured senders.
* `POST /api/auth/logout` — Revokes session.

### Email Endpoints (Authenticated via `Bearer <token>`)
* `POST /api/emails/schedule` — Schedules emails for single or bulk recipients.
  ```json
  {
    "subject": "Q3 Performance Review",
    "body": "<p>Hello team...</p>",
    "recipients": ["user1@example.com", "user2@example.com"],
    "startTime": "2026-08-21T18:00:00.000Z",
    "delayMs": 2000,
    "hourlyLimit": 200,
    "senderId": "optional-uuid"
  }
  ```
* `GET /api/emails/scheduled?page=1&limit=50&search=` — Retrieves scheduled emails.
* `GET /api/emails/sent?page=1&limit=50&search=` — Retrieves sent emails.
* `GET /api/emails/stats` — Retrieves aggregate counts (`scheduled`, `sent`, `failed`, `total`).
* `GET /api/emails/:id` — Retrieves single email details.

### System Endpoints
* `GET /health` — Health check reporting status of PostgreSQL, Redis, and BullMQ queue metrics.

---

## 🧪 Test Verification Suite

The repository includes a Vitest automated test suite covering all critical operational paths:

```bash
cd backend
npm test
```

### Verified Scenarios:
1. **TEST 1:** Automatic Ethereal SMTP test account creation and real message dispatch with preview URL.
2. **TEST 2:** Redis-backed hourly rate limiter atomic counter enforcement.
3. **TEST 3:** Rescheduling logic when hourly rate limit is reached.
4. **TEST 4:** Minimum delay spacing calculation between consecutive emails.
5. **TEST 5:** JWT creation and cryptographic signature verification.
6. **TEST 6:** Zod schema validation for scheduling requests.
7. **TEST 7:** Worker idempotency protection against duplicate dispatch.
8. **TEST 8:** CSV Lead parsing and deduplication.
9. **TEST 9:** Scheduled and Sent emails querying with pagination.
10. **TEST 10:** Health check endpoint connectivity reporting.

---

## 🎨 UI & Figma Compliance

The frontend accurately matches the provided Figma specifications:
* **Login Card:** Minimalist authentication modal matching `login page.png` with Google OAuth button, divider, and input styling.
* **Sidebar:** Clean navigation matching `Homepage1.png` with QNB logo, user profile card, pill Compose button, CORE navigation tabs, and live counter badges.
* **Scheduled & Sent Tables:** Email list with recipient tags, timestamp badges (`Tue 9:15:12 AM` in orange pill), subject lines, snippets, and interactive star toggles.
* **Email Detail View:** View matching `Homepage3.png` with back navigation, sender initial badge, timestamp, and message view.
* **Compose Modal:** Full editor matching `Homepage4.png`, `Homepage5.png`, `Homepage6.png` with CSV lead upload, email badge chips (`+4` badge), delay and hourly rate controls, rich formatting toolbar, and "Send Later" calendar picker popover.
