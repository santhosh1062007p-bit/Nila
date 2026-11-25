import fs from 'fs';
import path from 'path';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_DELIVERY_ZONES,
  INITIAL_STORE_SETTINGS,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_PARTNERS,
  INITIAL_REVIEWS,
} from '@/data/initial-data';
import {
  Address,
  AdminUserRecord,
  AuditLogRecord,
  Category,
  Coupon,
  CustomerLoginRecord,
  DeliveryPartner,
  DeliveryLocationUpdate,
  DeliveryZone,
  Order,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  PaymentTransactionStatus,
  Product,
  Review,
  SessionRecord,
  StoreSettings,
  User,
  WebhookEventRecord,
} from '@/types';
import { shouldRequirePostgres } from '@/lib/env';
import { publishRealtimeEvent } from '@/lib/realtime/pubsub';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGINS_FILE = path.join(DATA_DIR, 'customer-logins.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-logs.json');
const ADDRESSES_FILE = path.join(DATA_DIR, 'addresses.json');
const ADMIN_USERS_FILE = path.join(DATA_DIR, 'admin-users.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');
const ZONES_FILE = path.join(DATA_DIR, 'delivery-zones.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PARTNERS_FILE = path.join(DATA_DIR, 'delivery-partners.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

function assertDevFallbackAllowed() {
  if (shouldRequirePostgres()) {
    throw new Error(
      'SECURITY ERROR: JSON file fallback is strictly disabled in production mode.'
    );
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  assertDevFallbackAllowed();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) return JSON.parse(raw) as T;
    }
  } catch (e) {
    console.warn(`[DevStore] Read failed for ${path.basename(filePath)}:`, e);
  }
  return fallback;
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  assertDevFallbackAllowed();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    console.error(`[DevStore] Write failed for ${path.basename(filePath)}:`, e);
  }
}

export interface DevStoreState {
  products: Product[];
  categories: Category[];
  deliveryZones: DeliveryZone[];
  storeSettings: StoreSettings;
  coupons: Coupon[];
  orders: Order[];
  users: User[];
  adminUsers: AdminUserRecord[];
  sessions: SessionRecord[];
  payments: PaymentRecord[];
  webhookEvents: WebhookEventRecord[];
  auditLogs: AuditLogRecord[];
  addresses: Address[];
  customerLogins: CustomerLoginRecord[];
  deliveryPartners: DeliveryPartner[];
  reviews: Review[];
}

const g = globalThis as unknown as { __nilasDevStore?: DevStoreState };

function initDevStore(): DevStoreState {
  assertDevFallbackAllowed();
  if (g.__nilasDevStore) return g.__nilasDevStore;

  const rawUsers = readJson<User[]>(USERS_FILE, []);
  const customerUsers = rawUsers.filter((u) => u.role === 'customer');

  g.__nilasDevStore = {
    products: readJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS),
    categories: INITIAL_CATEGORIES,
    deliveryZones: readJson<DeliveryZone[]>(ZONES_FILE, INITIAL_DELIVERY_ZONES),
    storeSettings: readJson<StoreSettings>(SETTINGS_FILE, INITIAL_STORE_SETTINGS),
    coupons: readJson<Coupon[]>(COUPONS_FILE, INITIAL_COUPONS),
    orders: readJson<Order[]>(ORDERS_FILE, []),
    users: customerUsers,
    adminUsers: readJson<AdminUserRecord[]>(ADMIN_USERS_FILE, []),
    sessions: readJson<SessionRecord[]>(SESSIONS_FILE, []),
    payments: readJson<PaymentRecord[]>(PAYMENTS_FILE, []),
    webhookEvents: readJson<WebhookEventRecord[]>(WEBHOOKS_FILE, []),
    auditLogs: readJson<AuditLogRecord[]>(AUDIT_FILE, []),
    addresses: readJson<Address[]>(ADDRESSES_FILE, []),
    customerLogins: readJson<CustomerLoginRecord[]>(LOGINS_FILE, []),
    deliveryPartners: readJson<DeliveryPartner[]>(PARTNERS_FILE, INITIAL_DELIVERY_PARTNERS),
    reviews: readJson<Review[]>(REVIEWS_FILE, INITIAL_REVIEWS),
  };

  return g.__nilasDevStore;
}

export const devStore = {
  getState: () => {
    const s = initDevStore();
    s.products = readJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    s.categories = INITIAL_CATEGORIES;
    s.users = readJson<User[]>(USERS_FILE, []).filter((u) => u.role === 'customer');
    return s;
  },

  persistProducts(products: Product[]) {
    writeJsonAtomic(PRODUCTS_FILE, products);
  },
  persistOrders(orders: Order[]) {
    writeJsonAtomic(ORDERS_FILE, orders);
  },
  persistUsers(users: User[]) {
    writeJsonAtomic(USERS_FILE, users);
  },
  persistAdminUsers(admins: AdminUserRecord[]) {
    writeJsonAtomic(ADMIN_USERS_FILE, admins);
  },
  persistSessions(sessions: SessionRecord[]) {
    writeJsonAtomic(SESSIONS_FILE, sessions);
  },
  persistPayments(payments: PaymentRecord[]) {
    writeJsonAtomic(PAYMENTS_FILE, payments);
  },
  persistWebhooks(events: WebhookEventRecord[]) {
    writeJsonAtomic(WEBHOOKS_FILE, events);
  },
  persistAuditLogs(logs: AuditLogRecord[]) {
    writeJsonAtomic(AUDIT_FILE, logs);
  },
  persistAddresses(addresses: Address[]) {
    writeJsonAtomic(ADDRESSES_FILE, addresses);
  },
  persistLogins(logins: CustomerLoginRecord[]) {
    writeJsonAtomic(LOGINS_FILE, logins);
  },
  persistCoupons(coupons: Coupon[]) {
    writeJsonAtomic(COUPONS_FILE, coupons);
  },
  persistZones(zones: DeliveryZone[]) {
    writeJsonAtomic(ZONES_FILE, zones);
  },
  persistSettings(settings: StoreSettings) {
    writeJsonAtomic(SETTINGS_FILE, settings);
  },
  persistDeliveryPartners(partners: DeliveryPartner[]) {
    writeJsonAtomic(PARTNERS_FILE, partners);
  },

  recordAudit(entry: Omit<AuditLogRecord, 'id' | 'created_at'>): AuditLogRecord {
    const state = initDevStore();
    const log: AuditLogRecord = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    state.auditLogs.unshift(log);
    if (state.auditLogs.length > 500) state.auditLogs.length = 500;
    writeJsonAtomic(AUDIT_FILE, state.auditLogs);
    return log;
  },

  createPayment(record: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>): PaymentRecord {
    const state = initDevStore();
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      ...record,
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: now,
      updated_at: now,
    };
    state.payments.unshift(payment);
    writeJsonAtomic(PAYMENTS_FILE, state.payments);
    return payment;
  },

  updatePaymentByRzpOrder(
    razorpayOrderId: string,
    updates: {
      razorpay_payment_id?: string | null;
      razorpay_signature?: string | null;
      status: PaymentTransactionStatus;
      method?: string | null;
      error_code?: string | null;
      error_description?: string | null;
    }
  ): PaymentRecord | null {
    const state = initDevStore();
    const p = state.payments.find((item) => item.razorpay_order_id === razorpayOrderId);
    if (!p) return null;
    Object.assign(p, updates, { updated_at: new Date().toISOString() });
    writeJsonAtomic(PAYMENTS_FILE, state.payments);
    return p;
  },

  markOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: { id: string | null; role: string },
    note?: string,
    rejectionReason?: string
  ): Order | null {
    const state = initDevStore();
    const order = state.orders.find((o) => o.id === orderId || o.order_code === orderId);
    if (!order) return null;
    const prev = order.order_status;
    order.order_status = newStatus;
    if (rejectionReason) order.rejection_reason = rejectionReason;
    order.updated_at = new Date().toISOString();
    order.status_history = order.status_history || [];
    order.status_history.push({
      id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_id: order.id,
      from_status: prev,
      to_status: newStatus,
      changed_by_id: actor.id,
      changed_by_role: actor.role,
      note: note || null,
      created_at: order.updated_at,
    });
    writeJsonAtomic(ORDERS_FILE, state.orders);
    publishRealtimeEvent('ORDER_STATUS_CHANGED', { orderId: order.id, status: newStatus, order });
    return order;
  },

  markOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus): Order | null {
    const state = initDevStore();
    const order = state.orders.find((o) => o.id === orderId || o.order_code === orderId);
    if (!order) return null;
    order.payment_status = paymentStatus;
    order.updated_at = new Date().toISOString();
    writeJsonAtomic(ORDERS_FILE, state.orders);
    publishRealtimeEvent('ORDER_PAYMENT_STATUS_CHANGED', {
      orderId: order.id,
      paymentStatus,
      order,
    });
    return order;
  },

  persistReviews(reviews: Review[]): void {
    const state = initDevStore();
    state.reviews = reviews;
    writeJsonAtomic(REVIEWS_FILE, reviews);
  },
};
