# NILA'S TREAT — NEXT DEVELOPMENT ROADMAP (FOR INCOMING ASSISTANT)

This roadmap outlines high-impact enhancements and next steps for the incoming AI assistant continuing work on Nila's Treat.

---

## 1. IMMEDIATE ACTION ITEMS

1. **Keep Dev Server & Tunnel Monitored**:
   - Dev Server: `npm run dev` on port 3000
   - Cloudflare Tunnel: `cloudflared.exe tunnel --url http://localhost:3000`
2. **Do Not Push to Git Yet**:
   - Confirm with the user before committing or pushing changes to the remote branch (`apram na sona matum git la push panikalam`).
3. **Database Migration Readiness**:
   - When transitioning from local JSON fallback to remote hosted PostgreSQL (Neon, Supabase, or AWS RDS), run SQL schema files and transfer `src/data/*.json` records seamlessly.

---

## 2. HIGH PRIORITY EXPANSIONS

1. **WhatsApp Order & Dispatch Alerts**:
   - Integrate WhatsApp Cloud API or Twilio WhatsApp to trigger automated order confirmation messages with the live tracking link (`/orders/[id]`) to customer mobile numbers.
2. **Push Notifications (PWA Web Push)**:
   - Implement Service Worker push notifications for riders when a new delivery is assigned, and for customers when rider reaches "Arriving Soon" (< 1 km).
3. **Multi-Image Cake Gallery**:
   - Allow bakery owner to upload 3 to 5 high-resolution photos per cake (slice cut, box presentation, custom decoration angle) in `/admin/products`.
4. **Kitchen Order Ticket (KOT) Thermal Printer Format**:
   - Provide a 1-click 80mm ESC/POS thermal print receipt layout for the kitchen team when an order is accepted.
