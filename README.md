# Rental Payment Collection System

A full-stack application for managing shared accommodation properties — buildings, flats, rooms, and bedspaces — with tenant management, rent invoicing, payment collection, and financial reporting.

## Architecture

```
RENT/
├── backend/          # Flask REST API (Python)
│   ├── app.py        # Flask factory
│   ├── config.py     # Environment-based config
│   ├── models/       # SQLAlchemy models (10 modules)
│   ├── repositories/ # Data access layer
│   ├── services/     # Business logic layer
│   ├── routes/       # REST API endpoints (13 blueprints)
│   ├── middlewares/   # JWT auth + RBAC decorators
│   ├── rules/        # Assignment business rules engine
│   ├── audit/        # Audit logging
│   ├── db/           # Transaction manager
│   ├── serializers.py # Model-to-dict serialization
│   └── seed.py       # Database seeding
└── frontend/         # Next.js + React + Tailwind CSS
    ├── src/app/      # Pages (App Router)
    ├── src/components/ # Shared UI components
    └── src/lib/      # API client, auth context, utilities
```

## Property Hierarchy

**Building → Flat → Room → Bedspace → Tenant**

Three assignment modes:
- **Flat**: Entire flat to one tenant (blocks room/bedspace assignment within)
- **Room**: Single room to one tenant (blocks bedspace assignment within)
- **Bedspace**: Individual bed space to one tenant

## Features

- **Dashboard**: KPIs, occupancy charts, overdue tenant alerts
- **Property Management**: CRUD for buildings, flats, rooms, bedspaces
- **Tenant Management**: Profiles, document upload, search
- **Assignments**: Assign tenants with blocking rules enforcement
- **Billing**: Auto-generate invoices, late fees, extra charges, discounts, proration
- **Payments**: Multi-method collection, auto-allocation to oldest invoices
- **Deposits**: Track, deduct from, and refund security deposits
- **Maintenance**: Request tracking with priority and cost
- **Reports**: Occupancy, revenue, daily collection, overdue analysis
- **RBAC**: Admin, Manager, Cashier, Viewer roles
- **Audit Trail**: Full action logging with old/new value snapshots

## Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Node.js 18+
- npm or yarn

## Quick Start

### 1. Database

```sql
CREATE DATABASE rent_db;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets

# Initialize database and seed roles/admin
python seed.py

# Run development server
python app.py
```

API runs at `http://localhost:5000`

Default admin credentials: `admin / admin123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /api/auth/login, POST /api/auth/refresh, GET /api/auth/me |
| Users | GET/POST /api/users, GET/PUT /api/users/:id |
| Buildings | GET/POST /api/buildings, GET/PUT /api/buildings/:id |
| Flats | GET/POST /api/flats, GET/PUT /api/flats/:id |
| Rooms | GET/POST /api/rooms, GET/PUT /api/rooms/:id |
| Bedspaces | GET/POST /api/bedspaces, GET/PUT /api/bedspaces/:id |
| Tenants | GET/POST /api/tenants, GET/PUT /api/tenants/:id |
| Assignments | GET/POST /api/assignments, POST /:id/end, POST /:id/transfer |
| Invoices | GET /api/invoices, POST /generate, POST /generate-batch |
| Payments | GET/POST /api/payments, GET /:id/receipt |
| Deposits | GET /api/deposits, POST /:id/deduct, POST /:id/refund |
| Maintenance | GET/POST /api/maintenance, PUT /:id |
| Dashboard | GET /api/dashboard, GET /vacancy |
| Reports | GET daily-collection, monthly-revenue, overdue-tenants, occupancy |
| Settings | GET /api/settings/roles, /permissions, /audit-logs |

## Security

- JWT access tokens (1hr) + refresh tokens (24hr)
- Role-based access control (RBAC) with permission granularity
- bcrypt password hashing
- Rate limiting (100 req/min default)
- Security headers (XSS, content-type, frame-options)
- Audit logging with sensitive field redaction
- Monetary values stored as integer cents (BigInteger)

## Tech Stack

**Backend**: Flask 3.1, SQLAlchemy, Flask-JWT-Extended, Flask-Migrate, PostgreSQL  
**Frontend**: Next.js 14, React 18, Tailwind CSS 3, Recharts, Headless UI
