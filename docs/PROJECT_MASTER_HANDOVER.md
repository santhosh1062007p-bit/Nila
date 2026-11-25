# NILA'S TREAT — MASTER TECHNICAL HANDOVER DOCUMENTATION
**Project**: Nila's Treat Premium Commercial Bakery E-Commerce  
**Platform**: Next.js 16 (Turbopack) | React 19 | Tailwind CSS 4 | TypeScript  
**Target Assistant**: OpenAI ChatGPT / Future Development Teams  
**Date of Handover**: November 25, 2026  
**Primary Region**: Theni, Tamil Nadu, India (Pin: 625531)  
**Bakery Coordinates**: `10.0104° N, 77.4768° E` (Madurai Main Road, Near Old Bus Stand, Theni)

---

## 1. EXECUTIVE SUMMARY & REQUISITION CONTEXT

Nila's Treat is a commercial, production-ready, mobile-first food commerce platform custom-built for an artisanal home bakery operating out of Theni, Tamil Nadu. The project combines:
1. **The Swiggy & Zomato Ordering Experience**: Instant search with live cake thumbnail previews, quick filter pills (Bestsellers, Under ₹500, 100% Eggless Pure Veg, Fresh Fruit Cakes), 4-tier sorting, in-cart weight toggling (½ Kg ⇄ 1 Kg), and customer rating badges.
2. **Real-Time GPS Live Delivery Tracking**: OpenStreetMap + Leaflet interactive routing with moving rider motorcycle SVG, distance remaining calculation via Haversine formula, dynamic ETA countdown, and multi-event SSE (Server-Sent Events) live streaming.
3. **Dedicated Delivery Partner Portal (`/delivery`)**: Mobile web application with phone number login, background `navigator.geolocation.watchPosition` GPS telemetry broadcasting, click-to-call customer phone links, Google Maps turn-by-turn navigation shortcut, and 1-tap delivery milestone updates.
4. **12-Stage Granular Order Lifecycle**: From Order Placed ➔ Payment Confirmed ➔ Order Accepted ➔ Baking in Progress ➔ Cake Decoration ➔ Quality Check ➔ Delivery Partner Assigned ➔ Picked Up ➔ Out for Delivery ➔ Arriving Soon ➔ Delivered.
5. **Zero Data Loss Guarantee & Dual-Engine Persistence**: PostgreSQL relational engine supported by a hardened JSON dev/offline fallback store that guarantees zero customer data loss across redeployments.

---

## 2. REPOSITORY & RUNTIME SPECS

- **Repository Root**: `E:\client\nilas-treat`
- **Node.js Runtime**: `v25.8.2`
- **Framework**: `Next.js 16.4.3` App Router with Turbopack (`--turbopack`)
- **UI & State**: React 19, Tailwind CSS 4, Lucide React, HTML5 Web Audio API
- **Maps & Geolocation**: Leaflet 1.9.4, OpenStreetMap Carto Tiles, Haversine Distance Engine
- **Dev Server**: `http://localhost:3000` (Local Network: `http://10.158.127.187:3000`)
- **Active Public Cloudflare Tunnel**: `https://meditation-fold-clusters-care.trycloudflare.com`

---

## 3. MASTER DOCUMENTATION INDEX

All technical specifications have been codified into dedicated markdown manuals inside `E:\client\nilas-treat\docs\`:

1. [`PROJECT_ARCHITECTURE.md`](file:///E:/client/nilas-treat/docs/PROJECT_ARCHITECTURE.md) — System topology, component tree, and realtime pub/sub mechanics.
2. [`SECURITY_AUDIT.md`](file:///E:/client/nilas-treat/docs/SECURITY_AUDIT.md) — CSRF protection, PBKDF2/bcrypt hashing, JWT cookies, rate limiting, and CSP policies.
3. [`PERFORMANCE_AUDIT.md`](file:///E:/client/nilas-treat/docs/PERFORMANCE_AUDIT.md) — Bundle analysis, Core Web Vitals (LCP < 1.1s, INP < 60ms, CLS = 0), and SSR caching.
4. [`DATABASE_DOCUMENTATION.md`](file:///E:/client/nilas-treat/docs/DATABASE_DOCUMENTATION.md) — Complete schemas for Users, Orders, Delivery Partners, Reviews, and Zones.
5. [`API_DOCUMENTATION.md`](file:///E:/client/nilas-treat/docs/API_DOCUMENTATION.md) — Exhaustive REST specification for all 28 API routes.
6. [`IMPLEMENTATION_STATUS.md`](file:///E:/client/nilas-treat/docs/IMPLEMENTATION_STATUS.md) — Detailed feature checklist and completed milestones.
7. [`NEXT_DEVELOPMENT_ROADMAP.md`](file:///E:/client/nilas-treat/docs/NEXT_DEVELOPMENT_ROADMAP.md) — Action items and recommendations for the incoming AI assistant.

---

## 4. STRICT OPERATIONAL CONSTRAINTS (FOR CHATGPT)

> [!CAUTION]
> **DO NOT PUSH TO GIT REPOSITORY** until the user explicitly requests/confirms (`apram na sona matum git la push panikalam`). All work must stay cleanly staged in the local working copy.

> [!IMPORTANT]
> **ZERO DATA LOSS RULE**: Never delete `src/data/users.json`, `src/data/orders.json`, `src/data/customer-logins.json`, or overwrite customer passwords. Always preserve the dual-layer storage integrity.
