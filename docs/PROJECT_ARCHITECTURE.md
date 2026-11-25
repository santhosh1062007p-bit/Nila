# NILA'S TREAT — SYSTEM ARCHITECTURE SPECIFICATION

## 1. ARCHITECTURAL OVERVIEW

The application is structured as a modern full-stack progressive web application using Next.js 16 App Router.

```
                           +----------------------------------------+
                           |           Client Web Browsers          |
                           |  (Desktop / Mobile iOS & Android)      |
                           +-------------------+--------------------+
                                               |
                                     HTTPS / SSE Stream
                                               |
                                               v
                           +----------------------------------------+
                           |          Cloudflare Zero Trust         |
                           |      (Edge Proxy & DDoS Defense)       |
                           +-------------------+--------------------+
                                               |
                                        Local Port 3000
                                               |
                                               v
+---------------------------------------------------------------------------------------+
|                               Next.js 16 App Router (Turbopack)                       |
|                                                                                       |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  | Customer Portal    |  | Rider Portal       |  | Admin Control Center            |  |
|  | - /cakes           |  | - /delivery        |  | - /admin/orders                 |  |
|  | - /cart (Drawer)   |  |   (GPS Watcher)    |  | - /admin/delivery (Fleet)       |  |
|  | - /orders/[id]     |  | - Click-to-call    |  | - /admin/products               |  |
|  |   (Live Tracking)  |  | - 1-tap Status     |  | - Web Audio Kitchen Chime       |  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                                REST & SSE APIs (/api/*)                         |  |
|  | - Auth (JWT, SameSite, Secure, CSRF)     - Live GPS Updates (/api/delivery/loc) |  |
|  | - Orders & Status Transition             - Razorpay Payments & Webhooks         |  |
|  | - Instant Search & Catalog Discovery     - Customer Verified Reviews            |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                             Realtime SSE Pub/Sub Engine                         |  |
|  |           DELIVERY_LOCATION_UPDATE | ORDER_STATUS_CHANGED | REVIEW_CREATED      |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                            Database Abstraction Layer (db)                      |  |
|  |         PostgreSQL (Production Primary) <---> JSON Atomic Store (Dev/Offline)   |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. REAL-TIME EVENT STREAMING (SSE)

Real-time communication is powered by Server-Sent Events (SSE) via `/api/sync/events`. The client subscribes via `useRealtimeSubscription()` hook.

### Key Event Types:
- `ORDER_CREATED`: Notifies Admin Orders page, rings Web Audio kitchen chime.
- `ORDER_STATUS_CHANGED`: Updates live tracking step nodes on customer screen without page reload.
- `DELIVERY_LOCATION_UPDATE`: Carries rider `lat`, `lng`, `distance_remaining_km`, `eta_minutes`, moving marker smoothly on customer's Leaflet map.
- `DELIVERY_PARTNER_ASSIGNED`: Automatically links rider contact card, phone number, and vehicle specs.
- `REVIEW_CREATED`: Automatically surfaces new customer rating badge across product catalog.

---

## 3. ZERO-COST INTERACTIVE GPS ENGINE

Instead of costly Google Maps JavaScript API keys, the tracking engine leverages:
- **Leaflet 1.9.4**: Dynamic client-side rendering (SSR disabled via `next/dynamic`).
- **OpenStreetMap Carto Tiles**: Fast, free, high-contrast map tiles.
- **Custom SVG Pulsing Markers**:
  - Bakery: Burgundy bakery pin (`10.0104, 77.4768`).
  - Destination: Emerald customer address marker.
  - Rider: Amber pulsing motorcycle marker rotating according to heading angle.
- **Haversine Distance Algorithm**: Implemented in `src/app/api/delivery/location/route.ts` to calculate real-world road distance and ETA based on an average suburban delivery speed of 24 km/h.
