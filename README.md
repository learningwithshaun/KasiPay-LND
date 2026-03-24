# Lightning Payday

A Lightning-powered income system for township youth. This is a payday system, not a crypto wallet.

## Overview

Lightning Payday enables youth to complete tasks and receive instant payments via the Lightning Network. Bitcoin is invisible to users - all values are displayed in local currency (ZAR).

## Core Users

- **Earner**: Youth participant who completes tasks and receives payments
- **Youth Operator**: Paid verifier who approves task completions
- **Admin**: Treasury and oversight management

## Tech Stack

- **Frontend**: React (PWA-first, optimized for low-end Android)
- **Backend**: Python + FastAPI
- **Database**: MongoDB with Motor async driver
- **Payments**: Lightning Network via LND gRPC
- **Containers**: Docker Compose for local services

## Project Structure

```
lightning-payday/
├── backend/              # Python FastAPI server
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, database, security
│   │   ├── models/       # Pydantic models
│   │   ├── services/     # Business logic
│   │   ├── lnd/          # Lightning Network integration
│   │   └── main.py       # Application entry point
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/             # React PWA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand state management
│   │   └── services/     # API client
│   └── package.json
├── docker/               # Docker init scripts
├── docs/                 # Documentation
├── docker-compose.yml    # MongoDB, Redis services
└── package.json          # Root workspace
```

## Getting Started

### Prerequisites

- Python >= 3.11
- Node.js >= 18.0.0
- Docker & Docker Compose

### Quick Start (Mock Mode)

Run without any external dependencies:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && pip install -r requirements.txt && cd ..

# Run in mock mode
npm run dev:mock
```

This runs everything in-memory - perfect for demos and UI development.

### Full Setup with Docker

#### 1. Start External Services

```bash
# Start MongoDB and Redis
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Reset all data
npm run docker:reset
```

#### 2. Configure Environment

Create `backend/.env`:

```bash
# Server
ENVIRONMENT=development
PORT=3001

# MongoDB (Docker)
MONGODB_URI=mongodb://lnd_app:lnd_app_password@localhost:27017/lightning-payday

# JWT
JWT_SECRET=your-secret-key-change-in-production

# LND (Optional - see docs/POLAR_SETUP.md)
LND_GRPC_HOST=127.0.0.1:10009
LND_CERT_PATH=/path/to/tls.cert
LND_MACAROON_PATH=/path/to/admin.macaroon
LND_NETWORK=regtest
```

#### 3. Run Development Server

```bash
npm run dev
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| MongoDB | 27017 | Primary database |
| Mongo Express | 8081 | Database admin UI |
| Redis | 6379 | Cache (optional) |

Access Mongo Express at http://localhost:8081 (login: admin/pass)

## Demo Credentials

These accounts are pre-created in development:

| Role | Phone | PIN |
|------|-------|-----|
| Admin | +27800000001 | 1234 |
| Operator | +27800000002 | 1234 |
| Earner | +27800000003 | 1234 |

## API Documentation

When running in development, visit:
- Swagger UI: http://localhost:3001/docs
- ReDoc: http://localhost:3001/redoc

### Key Endpoints

```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login with phone + PIN
GET  /api/tasks             - List available tasks
POST /api/jobs              - Create job (claim task)
POST /api/jobs/:id/submit   - Submit invoice
POST /api/jobs/:id/approve  - Approve job (operator)
GET  /api/lnd/status        - LND connection status
```

## Lightning Network Setup

For testing with real Lightning payments, see [docs/POLAR_SETUP.md](docs/POLAR_SETUP.md).

## Scripts Reference

```bash
# Development
npm run dev              # Full stack with MongoDB
npm run dev:mock         # Full stack without dependencies

# Docker
npm run docker:up        # Start MongoDB, Redis
npm run docker:down      # Stop services
npm run docker:logs      # View service logs
npm run docker:reset     # Reset all data

# Setup
npm run setup:backend    # Install Python dependencies

# Frontend only
npm run dev:frontend     # Run React dev server
npm run build:frontend   # Build for production
```

## Design Principles

- **Offline-first**: PWA with background sync
- **Low bandwidth**: Minimal payloads, efficient polling
- **Low digital literacy**: Simple PIN auth, clear UI
- **Instant payments**: Sub-60-second task-to-payment flow
- **Audit safety**: Append-only event log as source of truth

## License

MIT

