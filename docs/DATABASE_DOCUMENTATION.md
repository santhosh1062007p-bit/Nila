# NILA'S TREAT — DATABASE SCHEMAS & DATA STRUCTURES

## 1. DUAL-ENGINE ARCHITECTURE

Nila's Treat utilizes a unified database abstraction layer (`src/lib/db/index.ts`):
1. **Production Engine**: PostgreSQL (configured via `DATABASE_URL`).
2. **Development / Offline Engine**: Atomic JSON storage (`src/lib/db/dev-store.ts`) operating out of `src/data/*.json`.

---

## 2. KEY DATA SCHEMAS (TypeScript Definitions)

### 2.1 Order (`src/types/index.ts`)
```typescript
export interface Order {
  id: string;
  order_code: string; // e.g. "NT-8491"
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  fulfilment_type: 'delivery' | 'pickup';
  delivery_address?: Address | null;
  delivery_pincode?: string | null;
  items: CartItem[];
  subtotal_paise: number;
  delivery_charge_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_method: 'online' | 'cod';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: OrderStatus;
  delivery_partner_id?: string | null;
  delivery_partner?: DeliveryPartner | null;
  live_delivery_location?: DeliveryLocationUpdate | null;
  status_history: OrderStatusHistoryItem[];
  created_at: string;
  updated_at: string;
}
```

### 2.2 Delivery Partner (`src/types/index.ts`)
```typescript
export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'van';
  vehicle_number: string;
  is_active: boolean;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_updated_at?: string | null;
}
```

### 2.3 Delivery Location Update (`src/types/index.ts`)
```typescript
export interface DeliveryLocationUpdate {
  order_id: string;
  partner_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  distance_remaining_km?: number | null;
  eta_minutes?: number | null;
  timestamp: string;
}
```

### 2.4 Verified Customer Review (`src/types/index.ts`)
```typescript
export interface Review {
  id: string;
  order_id?: string;
  product_id: string;
  product_name?: string;
  customer_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}
```

---

## 3. INITIAL SEED & BACKUP FILES

All initial data files are stored in `src/data/`:
- `products.json` (or `src/data/initial-data.ts`)
- `users.json`
- `orders.json`
- `delivery-partners.json`
- `delivery-zones.json`
- `reviews.json`
- `customer-logins.json`
- `audit-logs.json`

Safety backup snapshots are preserved in:
`E:\client\nilas-treat\backups\pre_ultimate_upgrade_20261125\`
