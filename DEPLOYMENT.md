# Nila's Treat — Production Deployment & Operations Guide

## 1. Architecture Overview

| Component | Purpose | Configuration |
| :--- | :--- | :--- |
| **Next.js 16 App Router** | Full-stack SSR UI, API routes, SSE realtime stream | `Dockerfile` (`node:22-alpine`, standalone/server) |
| **PostgreSQL 16** | Single production source of truth (18 normalized tables, ACID transactions, immutable order snapshots) | `drizzle/0001_initial_schema.sql`, `src/db/client.ts` |
| **Redis 7** | Multi-instance SSE event fan-out & distributed rate limiting | `REDIS_URL` (`src/lib/realtime/pubsub.ts`) |
| **Caddy + Cloudflare** | Automatic HTTPS TLS termination, HTTP/3, WAF, CDN caching for `/_next/static/*` & product media | `Caddyfile`, Cloudflare Proxy (Full Strict TLS) |
| **Razorpay** | Backend order creation, HMAC SHA-256 signature verification, raw-body webhooks | `/api/payments/razorpay/*` |
| **Automated Backups** | Daily compressed `pg_dump` snapshots with 14-day retention | `scripts/backup-postgres.sh` |

---

## 2. Environments (Development, Staging, Production)

Three separate templates are provided:
- `.env.example` — Local development template (local `dev-store` permitted only when `NODE_ENV !== "production"` and `REQUIRE_POSTGRES !== "true"`).
- `.env.staging.example` — Staging configuration using Razorpay Test Keys (`rzp_test_*`), staging Postgres DB, and staging domain.
- `.env.production.example` — Production configuration using Razorpay Live Keys (`rzp_live_*`), `REQUIRE_POSTGRES=true`, strict `JWT_SECRET` (>= 32 chars), `ADMIN_TOTP_SECRET` (MFA), and `ALLOWED_ORIGINS`.

> **Important Security Guard:** When `NODE_ENV=production` or `REQUIRE_POSTGRES=true`, `src/lib/env.ts` and `src/lib/db/dev-store.ts` disable the JSON file fallback completely and fail closed if PostgreSQL is unavailable.

---

## 3. PostgreSQL Setup & Migrations

1. Provision PostgreSQL 16 (managed RDS / Cloud SQL / self-hosted container in `docker-compose.yml`).
2. Apply the initial schema migration:
   ```bash
   psql "$DATABASE_URL" -f drizzle/0001_initial_schema.sql
   ```
   `src/db/schema.ts` also ensures idempotent table initialization (`ensurePgSchema()`) when PostgreSQL connects cleanly.
3. Verify connectivity and table counts:
   ```bash
   curl -s https://your-domain.com/api/health
   ```

---

## 4. Docker Compose Stack (App + Postgres + Redis + Caddy + Backup)

1. Copy `.env.production.example` to `.env.production` and fill all secrets:
   - `JWT_SECRET` (64+ hex characters via `openssl rand -hex 32`)
   - `ADMIN_INITIAL_PASSWORD` (strong owner password — hashed via Argon2id on first seed)
   - `ADMIN_TOTP_SECRET` (Base32 secret for RFC 6238 Authenticator App MFA)
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
   - `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`
2. Start services:
   ```bash
   docker compose --env-file .env.production up -d --build
   ```
3. Run schema migration against the Postgres container:
   ```bash
   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < drizzle/0001_initial_schema.sql
   ```

---

## 5. Razorpay & Webhook Setup

1. In the **Razorpay Dashboard -> Settings -> Webhooks**, add:
   - **Webhook URL:** `https://your-domain.com/api/payments/razorpay/webhook`
   - **Secret:** Must match `RAZORPAY_WEBHOOK_SECRET`
   - **Active Events:**
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
2. Signature Verification:
   - Checkout callbacks are verified server-side via HMAC SHA-256 (`order_id|payment_id`) in `/api/payments/razorpay/verify`.
   - Webhooks read the **unparsed raw request body** (`req.text()`) and validate `x-razorpay-signature` via timing-safe comparison, deduplicating on `event_id` in `webhook_events`.

---

## 6. Object Storage (Images) & CDN Caching (Cloudflare)

- Product and custom upload images should be served with WebP/AVIF negotiation (`next.config.ts` enables `formats: ['image/avif', 'image/webp']`).
- For multi-replica horizontal scaling, configure S3 / Cloudflare R2 credentials (`OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`) and replace `/public/uploads/*` local disk writes with signed object-storage uploads fronted by a CDN custom domain (added to `images.remotePatterns` in `next.config.ts`).
- Cloudflare Rules:
  - **Cache Everything** for `/_next/static/*` and `/images/*` (long TTL).
  - **Bypass Cache** for `/api/*`, `/checkout`, `/orders/*`, `/account`, `/admin/*` (ensured by `Cache-Control: private, no-store` headers set in `src/proxy.ts` and private routes).

---

## 7. Automated Backups & Monitoring

- **Backups:** `scripts/backup-postgres.sh` executes `pg_dump` compressed with `gzip` into `/backups`, writes SHA-256 checksums, and prunes archives older than `RETENTION_DAYS` (default `14`). Mount `/backups` to durable off-site storage or sync via `rclone` / `aws s3 cp`.
- **Health & Readiness:** `GET /api/health` checks PostgreSQL connectivity (`SELECT 1`) and returns HTTP `503` if production DB is unreachable.
- **Monitoring:** Forward structured JSON logs from stdout + configure Sentry/OpenTelemetry (`ERROR_REPORTING_DSN`) and external uptime alerts against `/api/health`.
- **Restore Drill:**
  ```bash
  gunzip -c /backups/nilas_treat_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
  ```
