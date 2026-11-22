import crypto from 'crypto';
import { isPostgresReady } from '@/db/client';
import { devStore } from './dev-store';
import { pgStore } from './pg-store';
import { shouldRequirePostgres } from '@/lib/env';
import {
  publishRealtimeEvent,
  subscribeRealtimeEvents,
  SyncEventPayload,
} from '@/lib/realtime/pubsub';
import {
  Address,
  AdminUserRecord,
  AuditLogRecord,
  Category,
  Coupon,
  CustomerLoginRecord,
  DeliveryZone,
  GenderOption,
  NotificationPreferences,
  Order,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  PaymentTransactionStatus,
  Product,
  SessionRecord,
  StoreSettings,
  User,
  WebhookEventRecord,
} from '@/types';

export function broadcastSyncEvent(type: string, data: unknown): SyncEventPayload {
  return publishRealtimeEvent(type, data);
}

export function subscribeToSyncEvents(listener: (event: SyncEventPayload) => void): () => void {
  return subscribeRealtimeEvents(listener);
}

async function usePg(): Promise<boolean> {
  const ready = await isPostgresReady();
  if (!ready && shouldRequirePostgres()) {
    throw new Error('PostgreSQL is required in production mode.');
  }
  return ready;
}

// Re-export memoryDb shim strictly for legacy read compatibility in non-prod only
export const memoryDb = new Proxy(
  {},
  {
    get(_target, prop) {
      if (shouldRequirePostgres()) {
        throw new Error('memoryDb cannot be accessed in production mode.');
      }
      return (devStore.getState() as unknown as Record<string, unknown>)[String(prop)];
    },
  }
);

export const db = {
  // PRODUCTS
  async getProducts(includeUnavailable = true): Promise<Product[]> {
    if (await usePg()) return pgStore.getProducts(includeUnavailable);
    const list = devStore.getState().products;
    return includeUnavailable ? list : list.filter((p) => p.is_available);
  },

  async getProductById(id: string): Promise<Product | null> {
    if (await usePg()) return pgStore.getProductById(id);
    return devStore.getState().products.find((p) => p.id === id) || null;
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    if (await usePg()) return pgStore.getProductBySlug(slug);
    return devStore.getState().products.find((p) => p.slug === slug) || null;
  },

  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<Product | null> {
    if (await usePg()) return pgStore.saveProduct({ id: productId, is_available: isAvailable });
    const state = devStore.getState();
    const product = state.products.find((p) => p.id === productId);
    if (!product) return null;
    product.is_available = isAvailable;
    product.updated_at = new Date().toISOString();
    devStore.persistProducts(state.products);
    broadcastSyncEvent('PRODUCT_UPDATED', product);
    return product;
  },

  async saveProduct(productData: Partial<Product>): Promise<Product> {
    if (await usePg()) {
      const saved = await pgStore.saveProduct(productData);
      broadcastSyncEvent(productData.id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED', saved);
      return saved;
    }

    const state = devStore.getState();
    if (productData.id) {
      const index = state.products.findIndex((p) => p.id === productData.id);
      if (index !== -1) {
        state.products[index] = {
          ...state.products[index],
          ...productData,
          updated_at: new Date().toISOString(),
        };
        devStore.persistProducts(state.products);
        broadcastSyncEvent('PRODUCT_UPDATED', state.products[index]);
        return state.products[index];
      }
    }

    const id = `prod-${Date.now()}`;
    const newProduct: Product = {
      id,
      category_id: productData.category_id || 'cat-special',
      category_name: productData.category_name || 'Special Flavours',
      category_slug: productData.category_slug || 'special-flavours',
      name: productData.name || 'New Cake',
      slug:
        (productData.name || 'new-cake').toLowerCase().replace(/[^a-z0-9]+/g, '-') +
        '-' +
        Date.now(),
      description: productData.description || 'Freshly baked artisanal cake from Nila’s Treat.',
      image_url: productData.image_url || '/images/hero-cake.svg',
      is_eggless_available: productData.is_eggless_available ?? true,
      eggless_extra_paise: productData.eggless_extra_paise ?? 20000,
      is_price_market_dependent: productData.is_price_market_dependent ?? false,
      is_available: productData.is_available ?? true,
      is_bestseller: productData.is_bestseller ?? false,
      is_featured: productData.is_featured ?? false,
      variants: productData.variants || [
        { id: `var-${id}-1`, product_id: id, weight_kg: 0.5, price_paise: 40000, is_available: true },
        { id: `var-${id}-2`, product_id: id, weight_kg: 1.0, price_paise: 70000, is_available: true },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.products.unshift(newProduct);
    devStore.persistProducts(state.products);
    broadcastSyncEvent('PRODUCT_CREATED', newProduct);
    return newProduct;
  },

  async deleteProduct(productId: string): Promise<boolean> {
    if (await usePg()) {
      const ok = await pgStore.deleteProduct(productId);
      if (ok) broadcastSyncEvent('PRODUCT_DELETED', { productId });
      return ok;
    }
    const state = devStore.getState();
    const idx = state.products.findIndex((p) => p.id === productId);
    if (idx === -1) return false;
    state.products.splice(idx, 1);
    devStore.persistProducts(state.products);
    broadcastSyncEvent('PRODUCT_DELETED', { productId });
    return true;
  },

  // CATEGORIES & SETTINGS
  async getCategories(): Promise<Category[]> {
    if (await usePg()) return pgStore.getCategories();
    return devStore.getState().categories;
  },

  async getStoreSettings(): Promise<StoreSettings> {
    return devStore.getState().storeSettings;
  },

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const state = devStore.getState();
    state.storeSettings = { ...state.storeSettings, ...settings };
    devStore.persistSettings(state.storeSettings);
    broadcastSyncEvent('STORE_SETTINGS_UPDATED', state.storeSettings);
    return state.storeSettings;
  },

  // DELIVERY ZONES
  async getDeliveryZones(): Promise<DeliveryZone[]> {
    if (await usePg()) return pgStore.getDeliveryZones();
    return devStore.getState().deliveryZones;
  },

  async getDeliveryZoneByPincode(pincode: string): Promise<DeliveryZone | null> {
    if (await usePg()) return pgStore.getDeliveryZoneByPincode(pincode);
    return devStore.getState().deliveryZones.find((dz) => dz.pincode === pincode.trim()) || null;
  },

  async updateDeliveryZone(zone: DeliveryZone): Promise<DeliveryZone> {
    if (await usePg()) {
      const saved = await pgStore.updateDeliveryZone(zone);
      broadcastSyncEvent('DELIVERY_ZONE_UPDATED', saved);
      return saved;
    }
    const state = devStore.getState();
    const idx = state.deliveryZones.findIndex((dz) => dz.pincode === zone.pincode);
    if (idx !== -1) state.deliveryZones[idx] = zone;
    else state.deliveryZones.push(zone);
    devStore.persistZones(state.deliveryZones);
    broadcastSyncEvent('DELIVERY_ZONE_UPDATED', zone);
    return zone;
  },

  // COUPONS
  async getCoupons(): Promise<Coupon[]> {
    if (await usePg()) return pgStore.getCoupons();
    return devStore.getState().coupons;
  },

  async getCouponByCode(code: string): Promise<Coupon | null> {
    if (await usePg()) return pgStore.getCouponByCode(code);
    return (
      devStore
        .getState()
        .coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase()) || null
    );
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    if (await usePg()) {
      const saved = await pgStore.saveCoupon(coupon);
      broadcastSyncEvent('COUPON_UPDATED', saved);
      return saved;
    }
    const state = devStore.getState();
    const codeUpper = coupon.code.trim().toUpperCase();
    const normalized = { ...coupon, code: codeUpper, id: coupon.id || `cpn-${Date.now()}` };
    const idx = state.coupons.findIndex((c) => c.code.toUpperCase() === codeUpper);
    if (idx !== -1) state.coupons[idx] = normalized;
    else state.coupons.unshift(normalized);
    devStore.persistCoupons(state.coupons);
    broadcastSyncEvent('COUPON_UPDATED', normalized);
    return normalized;
  },

  // ORDERS
  async getOrders(): Promise<Order[]> {
    if (await usePg()) return pgStore.getOrders();
    return [...devStore.getState().orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (await usePg()) return pgStore.getOrderById(id);
    return devStore.getState().orders.find((o) => o.id === id || o.order_code === id) || null;
  },

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    if (await usePg()) return pgStore.getOrdersByUserOrPhone(null, phone);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return devStore
      .getState()
      .orders.filter((o) => o.customer_phone.replace(/[^0-9]/g, '') === cleanPhone);
  },

  async getOrdersForUser(userId: string | null, phone: string | null): Promise<Order[]> {
    if (await usePg()) return pgStore.getOrdersByUserOrPhone(userId, phone);
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    return devStore.getState().orders.filter((o) => {
      if (userId && o.user_id === userId) return true;
      if (cleanPhone && o.customer_phone.replace(/[^0-9]/g, '') === cleanPhone) return true;
      return false;
    });
  },

  async createOrder(
    orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>
  ): Promise<{ order: Order; deduplicated: boolean }> {
    if (await usePg()) return pgStore.createOrderTransactional(orderData);

    const state = devStore.getState();
    if (orderData.idempotency_key) {
      const existing = state.orders.find((o) => o.idempotency_key === orderData.idempotency_key);
      if (existing) return { order: existing, deduplicated: true };
    }

    const nextNum = state.orders.reduce((max, o) => Math.max(max, o.order_number || 1000), 1000) + 1;
    const now = new Date().toISOString();
    const orderId = `ord-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`;

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      order_number: nextNum,
      order_code: orderData.order_code || `NT-${nextNum}`,
      items: orderData.items.map((it) => ({ ...it, order_id: orderId })),
      status_history: [
        {
          id: `osh-${Date.now()}`,
          order_id: orderId,
          from_status: null,
          to_status: orderData.order_status,
          changed_by_id: orderData.user_id || null,
          changed_by_role: orderData.user_id ? 'customer' : 'guest',
          note: 'Order initialized',
          created_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    state.orders.unshift(newOrder);
    devStore.persistOrders(state.orders);
    broadcastSyncEvent('ORDER_CREATED', newOrder);
    return { order: newOrder, deduplicated: false };
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    actor: { id: string | null; role: string } = { id: 'admin', role: 'admin' },
    note?: string,
    rejectionReason?: string
  ): Promise<Order | null> {
    if (await usePg()) return pgStore.updateOrderStatus(orderId, status, actor, note, rejectionReason);
    return devStore.markOrderStatus(orderId, status, actor, note, rejectionReason);
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order | null> {
    if (await usePg()) return pgStore.updatePaymentStatus(orderId, paymentStatus);
    return devStore.markOrderPaymentStatus(orderId, paymentStatus);
  },

  // PAYMENTS & WEBHOOKS
  async createPayment(
    record: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PaymentRecord> {
    if (await usePg()) return pgStore.createPayment(record);
    const state = devStore.getState();
    const ord = state.orders.find((o) => o.id === record.order_id);
    if (ord) {
      ord.razorpay_order_id = record.razorpay_order_id;
      devStore.persistOrders(state.orders);
    }
    return devStore.createPayment(record);
  },

  async getPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentRecord | null> {
    if (await usePg()) return pgStore.getPaymentByRazorpayOrderId(razorpayOrderId);
    return (
      devStore.getState().payments.find((p) => p.razorpay_order_id === razorpayOrderId) || null
    );
  },

  async getPaymentsForOrder(orderId: string): Promise<PaymentRecord[]> {
    if (await usePg()) {
      const orders = await this.getOrderById(orderId);
      if (!orders?.razorpay_order_id) return [];
      const p = await pgStore.getPaymentByRazorpayOrderId(orders.razorpay_order_id);
      return p ? [p] : [];
    }
    return devStore.getState().payments.filter((p) => p.order_id === orderId);
  },

  async updatePaymentByRzpOrder(
    razorpayOrderId: string,
    updates: {
      razorpay_payment_id?: string | null;
      razorpay_signature?: string | null;
      status: PaymentTransactionStatus;
      method?: string | null;
      error_code?: string | null;
      error_description?: string | null;
    }
  ): Promise<PaymentRecord | null> {
    if (await usePg()) return pgStore.updatePaymentByRzpOrder(razorpayOrderId, updates);
    return devStore.updatePaymentByRzpOrder(razorpayOrderId, updates);
  },

  async recordWebhookIfNew(evt: Omit<WebhookEventRecord, 'id' | 'processed_at'>): Promise<boolean> {
    if (await usePg()) return pgStore.recordWebhookIfNew(evt);
    const state = devStore.getState();
    if (state.webhookEvents.some((w) => w.event_id === evt.event_id)) {
      return false;
    }
    state.webhookEvents.unshift({
      ...evt,
      id: `whe-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
      processed_at: new Date().toISOString(),
    });
    devStore.persistWebhooks(state.webhookEvents);
    return true;
  },

  // SESSIONS
  async createSession(session: Omit<SessionRecord, 'created_at'>): Promise<SessionRecord> {
    if (await usePg()) return pgStore.createSession(session);
    const state = devStore.getState();
    const rec: SessionRecord = { ...session, created_at: new Date().toISOString() };
    state.sessions.unshift(rec);
    if (state.sessions.length > 500) state.sessions.length = 500;
    devStore.persistSessions(state.sessions);
    return rec;
  },

  async getSessionById(id: string): Promise<SessionRecord | null> {
    if (await usePg()) return pgStore.getSessionById(id);
    return devStore.getState().sessions.find((s) => s.id === id) || null;
  },

  async revokeSession(id: string): Promise<void> {
    if (await usePg()) return pgStore.revokeSession(id);
    const state = devStore.getState();
    const s = state.sessions.find((item) => item.id === id);
    if (s) {
      s.revoked_at = new Date().toISOString();
      devStore.persistSessions(state.sessions);
    }
  },

  async markSessionMfaVerified(id: string): Promise<void> {
    if (await usePg()) return pgStore.markSessionMfaVerified(id);
    const state = devStore.getState();
    const s = state.sessions.find((item) => item.id === id);
    if (s) {
      s.mfa_verified = true;
      devStore.persistSessions(state.sessions);
    }
  },

  // USERS & ADMIN USERS
  async getUserByPhone(phone: string): Promise<User | null> {
    if (await usePg()) return pgStore.getUserByPhone(phone);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return (
      devStore.getState().users.find((u) => u.phone.replace(/[^0-9]/g, '') === cleanPhone) || null
    );
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (await usePg()) return pgStore.getUserByEmail(email);
    return (
      devStore.getState().users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase()) ||
      null
    );
  },

  async getUserById(id: string): Promise<User | null> {
    if (await usePg()) return pgStore.getUserById(id);
    return devStore.getState().users.find((u) => u.id === id) || null;
  },

  async getUsers(): Promise<User[]> {
    if (await usePg()) return pgStore.getUsers();
    return devStore.getState().users;
  },

  async createUser(userData: {
    full_name: string;
    phone: string;
    email?: string | null;
    password_hash: string;
  }): Promise<User> {
    if (await usePg()) return pgStore.createUser(userData);
    const state = devStore.getState();
    const newUser: User = {
      id: `usr-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`,
      full_name: userData.full_name,
      phone: userData.phone,
      email: userData.email || null,
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      password_hash: userData.password_hash,
    };
    state.users.push(newUser);
    devStore.persistUsers(state.users);
    return newUser;
  },

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    if (await usePg()) return pgStore.updateUserPasswordHash(userId, passwordHash);
    const state = devStore.getState();
    const u = state.users.find((user) => user.id === userId);
    if (!u) return false;
    u.password_hash = passwordHash;
    delete u.password;
    devStore.persistUsers(state.users);
    return true;
  },

  async updateUserProfile(
    userId: string,
    updates: {
      full_name?: string;
      phone?: string;
      email?: string | null;
      avatar_url?: string | null;
      date_of_birth?: string | null;
      gender?: GenderOption | null;
      notification_preferences?: Partial<NotificationPreferences>;
    }
  ): Promise<User | null> {
    if (await usePg()) {
      const saved = await pgStore.updateUserProfile(userId, updates);
      if (saved) broadcastSyncEvent('USER_PROFILE_UPDATED', { userId });
      return saved;
    }
    const state = devStore.getState();
    const u = state.users.find((user) => user.id === userId);
    if (!u) return null;

    if (updates.full_name !== undefined) u.full_name = updates.full_name;
    if (updates.phone !== undefined) u.phone = updates.phone;
    if (updates.email !== undefined) u.email = updates.email;
    if (updates.avatar_url !== undefined) u.avatar_url = updates.avatar_url;
    if (updates.date_of_birth !== undefined) u.date_of_birth = updates.date_of_birth;
    if (updates.gender !== undefined) u.gender = updates.gender;
    if (updates.notification_preferences) {
      u.notification_preferences = {
        order_updates:
          updates.notification_preferences.order_updates ??
          u.notification_preferences?.order_updates ??
          true,
        promotions:
          updates.notification_preferences.promotions ??
          u.notification_preferences?.promotions ??
          false,
      };
    }
    u.updated_at = new Date().toISOString();
    devStore.persistUsers(state.users);
    broadcastSyncEvent('USER_PROFILE_UPDATED', { userId });
    return u;
  },

  async getAdminUserByIdentifier(identifier: string): Promise<AdminUserRecord | null> {
    if (await usePg()) return pgStore.getAdminUserByIdentifier(identifier);
    const clean = identifier.trim().toLowerCase();
    return (
      devStore
        .getState()
        .adminUsers.find(
          (a) =>
            a.username.toLowerCase() === clean ||
            a.email.toLowerCase() === clean ||
            a.phone === identifier.trim()
        ) || null
    );
  },

  async getAdminUserById(id: string): Promise<AdminUserRecord | null> {
    if (await usePg()) return pgStore.getAdminUserById(id);
    return devStore.getState().adminUsers.find((a) => a.id === id) || null;
  },

  async upsertAdminUser(admin: AdminUserRecord): Promise<AdminUserRecord> {
    if (await usePg()) return pgStore.upsertAdminUser(admin);
    const state = devStore.getState();
    const idx = state.adminUsers.findIndex((a) => a.id === admin.id);
    if (idx !== -1) state.adminUsers[idx] = admin;
    else state.adminUsers.push(admin);
    devStore.persistAdminUsers(state.adminUsers);
    return admin;
  },

  // SAVED ADDRESSES
  async getAddressesByUserId(userId: string): Promise<Address[]> {
    if (await usePg()) return pgStore.getAddressesByUserId(userId);
    return devStore
      .getState()
      .addresses.filter((a) => a.user_id === userId)
      .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)));
  },

  async saveAddress(userId: string, addr: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
    if (await usePg()) {
      const saved = await pgStore.saveAddress(userId, addr);
      broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
      return saved;
    }
    const state = devStore.getState();
    const userAddrs = state.addresses.filter((a) => a.user_id === userId);
    const makeDefault = Boolean(addr.is_default) || userAddrs.length === 0;
    if (makeDefault) {
      state.addresses.forEach((a) => {
        if (a.user_id === userId) a.is_default = false;
      });
    }
    const now = new Date().toISOString();
    const addrType =
      addr.address_type ||
      (addr.label === 'Work' || addr.label === 'Other' ? addr.label : 'Home');
    const saved: Address = {
      ...addr,
      id: `addr-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`,
      user_id: userId,
      label: addr.label || addrType,
      address_type: addrType,
      is_default: makeDefault,
      created_at: now,
      updated_at: now,
    };
    state.addresses.unshift(saved);
    devStore.persistAddresses(state.addresses);
    broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
    return saved;
  },

  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Omit<Address, 'id' | 'user_id'>>
  ): Promise<Address | null> {
    if (await usePg()) {
      const saved = await pgStore.updateAddress(userId, addressId, updates);
      if (saved) broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
      return saved;
    }
    const state = devStore.getState();
    const idx = state.addresses.findIndex((a) => a.id === addressId && a.user_id === userId);
    if (idx === -1) return null;

    if (updates.is_default === true) {
      state.addresses.forEach((a) => {
        if (a.user_id === userId) a.is_default = false;
      });
    }

    const cur = state.addresses[idx];
    const nextType =
      updates.address_type ||
      (updates.label === 'Work' || updates.label === 'Other' || updates.label === 'Home'
        ? updates.label
        : cur.address_type || 'Home');

    const updated: Address = {
      ...cur,
      ...updates,
      address_type: nextType,
      label: updates.label ?? nextType,
      updated_at: new Date().toISOString(),
    };
    state.addresses[idx] = updated;
    devStore.persistAddresses(state.addresses);
    broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
    return updated;
  },

  async deleteAddressSafe(
    userId: string,
    addressId: string
  ): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'default_has_other' }> {
    if (await usePg()) {
      const res = await pgStore.deleteAddressSafe(userId, addressId);
      if (res.ok) broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
      return res;
    }
    const state = devStore.getState();
    const userAddrs = state.addresses.filter((a) => a.user_id === userId);
    const idx = state.addresses.findIndex((a) => a.id === addressId && a.user_id === userId);
    if (idx === -1) return { ok: false, reason: 'not_found' };
    if (state.addresses[idx].is_default && userAddrs.length > 1) {
      return { ok: false, reason: 'default_has_other' };
    }
    state.addresses.splice(idx, 1);
    devStore.persistAddresses(state.addresses);
    broadcastSyncEvent('USER_ADDRESSES_UPDATED', { userId });
    return { ok: true };
  },

  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    const res = await this.deleteAddressSafe(userId, addressId);
    return res.ok;
  },

  // AUDIT LOGS & CUSTOMER LOGIN STREAM
  async recordAudit(entry: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord> {
    if (await usePg()) return pgStore.recordAudit(entry);
    return devStore.recordAudit(entry);
  },

  async getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    if (await usePg()) return pgStore.getAuditLogs(limit);
    return devStore.getState().auditLogs.slice(0, limit);
  },

  async recordCustomerLogin(data: {
    user_id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    type?: 'login' | 'register';
    ip_address?: string | null;
  }): Promise<CustomerLoginRecord> {
    if (await usePg()) {
      const rec = await pgStore.recordCustomerLogin(data);
      broadcastSyncEvent('CUSTOMER_LOGGED_IN', rec);
      return rec;
    }
    const state = devStore.getState();
    const rec: CustomerLoginRecord = {
      id: `login-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`,
      user_id: data.user_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      login_time: new Date().toISOString(),
      type: data.type || 'login',
    };
    state.customerLogins.unshift(rec);
    if (state.customerLogins.length > 100) state.customerLogins.length = 100;
    devStore.persistLogins(state.customerLogins);
    broadcastSyncEvent('CUSTOMER_LOGGED_IN', rec);
    return rec;
  },

  async getCustomerLogins(): Promise<CustomerLoginRecord[]> {
    if (await usePg()) return pgStore.getCustomerLogins();
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';
    return devStore
      .getState()
      .customerLogins.filter(
        (l) => l.user_id !== 'usr-admin-1' && l.phone !== adminPhone && l.email !== adminEmail
      )
      .sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime());
  },
};
