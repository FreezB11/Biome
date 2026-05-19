# Biome / Deepenk (Algorithec UI + TS/Express + Payments)

This repo contains:
- A React + Vite frontend (desktop + mobile responsive), styled to match the Algorithec design language.
- A Node.js (TypeScript) Express backend gateway with OTP auth + Google OAuth.
- A Haskell payments microservice (Cashfree) used via backend proxy routes.

## Quickstart (Dev)

### 1) Install deps

```bash
pnpm install
```

### 2) Start backend (port 3000)

```bash
pnpm dev:server
```

Backend should be available at:
- http://localhost:3000/api/health

### 3) Start frontend (port 3001)

```bash
pnpm dev -- --port 3001
```

Frontend should be available at:
- http://localhost:3001/

Dev proxy is configured so the frontend can call:
- `/api/*` → backend `http://localhost:3000`
- `/auth/*` → backend `http://localhost:3000`
- `/socket.io` → backend `ws://localhost:3000`

## App Routes (Frontend)

- `/` welcome
- `/login` auth (Google + OTP)
- `/home` home/chat UI (calls backend `/api/search`)
- `/history` history UI
- `/food` food + maps UI (calls backend `/api/food/*`)
- `/rides` rides + maps UI (calls backend `/api/rides/*`)
- `/profile` profile UI
- `/dashboard` includes Cashfree checkout test dialog
- `/web` older landing page (kept for reference)

## Environment Variables

Create environment variables in your shell (or a local env file if you use one).

### Backend (Node/Express)

- `PORT=3000`
- `JWT_SECRET=...`
- `CORS_ORIGIN=http://localhost:3001`
- `MONGODB_URI=...` (recommended for OTP TTL + persistence)

Google OAuth:
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback` (optional; if not set, computed from request)
- `FRONTEND_URL=http://localhost:3001` (recommended so backend redirects back to UI correctly)

OTP Senders:
- SendGrid email: `SENDGRID_API_KEY=...`, `SENDGRID_FROM=...`
- Twilio SMS: `TWILIO_ACCOUNT_SID=...`, `TWILIO_AUTH_TOKEN=...`, `TWILIO_FROM=...`

Payments proxy:
- `PAYMENTS_SERVICE_URL=http://localhost:4010`

### Frontend (Vite)

Maps:
- `VITE_GOOGLE_MAPS_API_KEY=...`
- `VITE_GOOGLE_MAP_ID=...` (optional)

Optional API origin override:
- `VITE_API_URL=http://localhost:3000` (default is `/api` via dev proxy)

## Payments (Haskell / Cashfree)

The Haskell service is located in `payments-hs/` and is used via backend proxy routes:
- Backend proxy: `POST /api/payments/intents` → Haskell `POST /v1/payment_intents`
- Backend proxy: `GET /api/payments/intents/:intentId` → Haskell `GET /v1/payment_intents/:intentId`
- Webhook forwarder: `POST /api/payments/webhooks/cashfree` → Haskell `POST /v1/webhooks/cashfree`

Notes:
- Webhook verification depends on capturing the raw request body in the Node gateway.
- The Haskell service includes a background reconciliation loop to update open intents.

## Common Troubleshooting

- Port already in use:
  - Backend default is `3000`, frontend default is `3001`.
- Google Maps shows “not configured”:
  - Set `VITE_GOOGLE_MAPS_API_KEY`.
- OTP works in dev but not in prod:
  - Configure SendGrid/Twilio env vars, and set `MONGODB_URI` so OTP storage persists.
