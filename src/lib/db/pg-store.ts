import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import { getPgPool, withPgTransaction } from '@/db/client';
import { ensurePgSchema } from '@/db/schema';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_PRODUCTS,
} from '@/data/initial-data';
import {
  Address,
  AddressType,
  AdminUserRecord,
  AuditLogRecord,
  Category,
  Coupon,
  CustomerLoginRecord,
  DeliveryZone,
  GenderOption,
  NotificationPreferences,
  Order,
  OrderItem,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  PaymentTransactionStatus,
  Product,
  ProductVariant,
  SessionRecord,
  User,
  WebhookEventRecord,
} from '@/types';
import { publishRealtimeEvent } from '@/lib/realtime/pubsub';

let seeded = false;

async function ensureSeeded(pool: Pool): Promise<void> {
  await ensurePgSchema(pool);
  if (seeded) return;

  const { rows } = await pool.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM categories');
  if (Number(rows[0]?.cnt || 0) === 0) {
    await withPgTransaction(async (tx) => {
      for (const cat of INITIAL_CATEGORIES) {
        await tx.query(
          `INSERT INTO categories (id, name, slug, description, display_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [cat.id, cat.name, cat.slug, cat.description || null, cat.display_order, cat.is_active]
        );
      }
      for (const p of INITIAL_PRODUCTS) {
        await tx.query(
          `INSERT INTO products (id, category_id, name, slug, description, image_url, is_eggless_available, eggless_extra_paise, is_price_market_dependent, is_available, is_bestseller, is_featured)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
          [
            p.id,
            p.category_id,
            p.name,
            p.slug,
            p.description,
            p.image_url,
            p.is_eggless_available,
            p.eggless_extra_paise,
            p.is_price_market_dependent,
            p.is_available,
            p.is_bestseller,
            p.is_featured,
          ]
        );
        for (const v of p.variants) {
          await tx.query(
            `INSERT INTO product_variants (id, product_id, weight_kg, price_paise, is_available)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (product_id, weight_kg) DO NOTHING`,
            [v.id, p.id, v.weight_kg, v.price_paise, v.is_available]
          );
        }
      }
      for (const dz of INITIAL_DELIVERY_ZONES) {
        await tx.query(
          `INSERT INTO delivery_zones (id, pincode, area_name, delivery_charge_paise, minimum_order_paise, is_serviceable)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (pincode) DO NOTHING`,
          [dz.id, dz.pincode, dz.area_name, dz.delivery_charge_paise, dz.minimum_order_paise, dz.is_serviceable]
        );
      }
      for (const c of INITIAL_COUPONS) {
        await tx.query(
          `INSERT INTO coupons (id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, is_active, target_type, allowed_phones, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) ON CONFLICT (code) DO NOTHING`,
          [
            c.id,
            c.code.toUpperCase(),
            c.discount_type,
            c.discount_value,
            c.minimum_order_paise,
            c.maximum_discount_paise || null,
            c.is_active,
            c.target_type || 'all',
            JSON.stringify(c.allowed_phones || []),
            c.description || null,
          ]
        );
      }
    });
  }
  seeded = true;
}

async function getReadyPool(): Promise<Pool> {
  const pool = getPgPool();
  if (!pool) throw new Error('PostgreSQL pool is not configured.');
  await ensureSeeded(pool);
  return pool;
}

function mapUserRow(r: Record<string, unknown>): User {
  const dobRaw = r.date_of_birth;
  const dobStr =
    dobRaw instanceof Date
      ? dobRaw.toISOString().slice(0, 10)
      : dobRaw
      ? String(dobRaw).slice(0, 10)
      : null;

  return {
    id: String(r.id),
    full_name: String(r.full_name),
    email: r.email ? String(r.email) : null,
    phone: String(r.phone),
    role: (r.role as User['role']) || 'customer',
    is_active: Boolean(r.is_active),
    created_at: r.created_at ? new Date(String(r.created_at)).toISOString() : new Date().toISOString(),
    updated_at: r.updated_at ? new Date(String(r.updated_at)).toISOString() : undefined,
    password_hash: r.password_hash ? String(r.password_hash) : undefined,
    last_login: r.last_login ? new Date(String(r.last_login)).toISOString() : undefined,
    avatar_url: (r.profile_avatar_url ?? r.avatar_url ?? null) as string | null,
    date_of_birth: dobStr,
    gender: (r.gender as GenderOption | null) ?? null,
    notification_preferences: {
      order_updates: r.notify_order_updates !== undefined ? Boolean(r.notify_order_updates) : true,
      promotions: r.notify_promotions !== undefined ? Boolean(r.notify_promotions) : false,
    },
  };
}

function mapProductRows(
  prodRows: Record<string, unknown>[],
  variantRows: Record<string, unknown>[],
  catMap: Map<string, Category>
): Product[] {
  const varByProd = new Map<string, ProductVariant[]>();
  for (const vr of variantRows) {
    const pid = String(vr.product_id);
    const list = varByProd.get(pid) || [];
    list.push({
      id: String(vr.id),
      product_id: pid,
      weight_kg: Number(vr.weight_kg) as 0.5 | 1.0,
      price_paise: Number(vr.price_paise),
      is_available: Boolean(vr.is_available),
    });
    varByProd.set(pid, list);
  }

  return prodRows.map((r) => {
    const cid = String(r.category_id);
    const cat = catMap.get(cid);
    return {
      id: String(r.id),
      category_id: cid,
      category_name: cat?.name,
      category_slug: cat?.slug,
      name: String(r.name),
      slug: String(r.slug),
      description: String(r.description),
      image_url: String(r.image_url),
      is_eggless_available: Boolean(r.is_eggless_available),
      eggless_extra_paise: Number(r.eggless_extra_paise),
      is_price_market_dependent: Boolean(r.is_price_market_dependent),
      is_available: Boolean(r.is_available),
      is_bestseller: Boolean(r.is_bestseller),
      is_featured: Boolean(r.is_featured),
      variants: varByProd.get(String(r.id)) || [],
      created_at: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
      updated_at: r.updated_at ? new Date(String(r.updated_at)).toISOString() : undefined,
    };
  });
}

async function hydrateOrders(pool: Pool | PoolClient, rows: Record<string, unknown>[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const itemRes = await pool.query(
    'SELECT * FROM order_items WHERE order_id = ANY($1::text[])',
    [ids]
  );
  const histRes = await pool.query(
    'SELECT * FROM order_status_history WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC',
    [ids]
  );

  const itemsMap = new Map<string, OrderItem[]>();
  for (const ir of itemRes.rows) {
    const oid = String(ir.order_id);
    const list = itemsMap.get(oid) || [];
    list.push({
      id: String(ir.id),
      order_id: oid,
      product_id: String(ir.product_id || ''),
      product_name: String(ir.product_name),
      category_name: String(ir.category_name),
      product_image_snapshot: ir.product_image_snapshot ? String(ir.product_image_snapshot) : undefined,
      weight_kg: Number(ir.weight_kg) as 0.5 | 1.0,
      eggless: Boolean(ir.eggless),
      custom_message: ir.custom_message ? String(ir.custom_message) : null,
      unit_price_paise: Number(ir.unit_price_paise),
      quantity: Number(ir.quantity),
      line_total_paise: Number(ir.line_total_paise),
    });
    itemsMap.set(oid, list);
  }

  const histMap = new Map<string, Order['status_history']>();
  for (const hr of histRes.rows) {
    const oid = String(hr.order_id);
    const list = histMap.get(oid) || [];
    list.push({
      id: String(hr.id),
      order_id: oid,
      from_status: hr.from_status ? String(hr.from_status) : null,
      to_status: String(hr.to_status) as OrderStatus,
      changed_by_id: hr.changed_by_id ? String(hr.changed_by_id) : null,
      changed_by_role: String(hr.changed_by_role),
      note: hr.note ? String(hr.note) : null,
      created_at: new Date(String(hr.created_at)).toISOString(),
    });
    histMap.set(oid, list);
  }

  return rows.map((r) => ({
    id: String(r.id),
    order_number: Number(r.order_number),
    order_code: String(r.order_code),
    user_id: r.user_id ? String(r.user_id) : null,
    guest_access_token_hash: r.guest_access_token_hash ? String(r.guest_access_token_hash) : null,
    idempotency_key: r.idempotency_key ? String(r.idempotency_key) : null,
    customer_name: String(r.customer_name),
    customer_phone: String(r.customer_phone),
    customer_email: r.customer_email ? String(r.customer_email) : null,
    fulfilment_type: String(r.fulfilment_type) as 'delivery' | 'pickup',
    order_status: String(r.order_status) as OrderStatus,
    payment_method: String(r.payment_method) as 'razorpay' | 'cod',
    payment_status: String(r.payment_status) as PaymentStatus,
    subtotal_paise: Number(r.subtotal_paise),
    delivery_charge_paise: Number(r.delivery_charge_paise),
    discount_paise: Number(r.discount_paise),
    coupon_code: r.coupon_code ? String(r.coupon_code) : null,
    total_paise: Number(r.total_paise),
    delivery_pincode: r.delivery_pincode ? String(r.delivery_pincode) : null,
    delivery_address_snapshot: (r.delivery_address_snapshot as Address | null) || null,
    delivery_date: String(r.delivery_date),
    delivery_slot: String(r.delivery_slot),
    special_instructions: r.special_instructions ? String(r.special_instructions) : null,
    rejection_reason: r.rejection_reason ? String(r.rejection_reason) : null,
    razorpay_order_id: r.razorpay_order_id ? String(r.razorpay_order_id) : null,
    items: itemsMap.get(String(r.id)) || [],
    status_history: histMap.get(String(r.id)) || [],
    created_at: new Date(String(r.created_at)).toISOString(),
    updated_at: new Date(String(r.updated_at)).toISOString(),
  }));
}

export const pgStore = {
  async getCategories(): Promise<Category[]> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM categories ORDER BY display_order ASC');
    return res.rows as Category[];
  },

  async getProducts(includeUnavailable = true): Promise<Product[]> {
    const pool = await getReadyPool();
    const cats = await this.getCategories();
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const prodRes = await pool.query(
      includeUnavailable
        ? 'SELECT * FROM products ORDER BY created_at DESC'
        : 'SELECT * FROM products WHERE is_available = TRUE ORDER BY created_at DESC'
    );
    const varRes = await pool.query('SELECT * FROM product_variants ORDER BY weight_kg ASC');
    return mapProductRows(prodRes.rows, varRes.rows, catMap);
  },

  async getProductById(id: string): Promise<Product | null> {
    const pool = await getReadyPool();
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
    if (prodRes.rowCount === 0) return null;
    const varRes = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY weight_kg ASC',
      [id]
    );
    const cats = await this.getCategories();
    const catMap = new Map(cats.map((c) => [c.id, c]));
    return mapProductRows(prodRes.rows, varRes.rows, catMap)[0] || null;
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const pool = await getReadyPool();
    const prodRes = await pool.query('SELECT * FROM products WHERE slug = $1 LIMIT 1', [slug]);
    if (prodRes.rowCount === 0) return null;
    return this.getProductById(String(prodRes.rows[0].id));
  },

  async saveProduct(data: Partial<Product>): Promise<Product> {
    const pool = await getReadyPool();
    const productId = await withPgTransaction(async (tx) => {
      if (data.id) {
        await tx.query(
          `UPDATE products SET
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            image_url = COALESCE($4, image_url),
            category_id = COALESCE($5, category_id),
            is_eggless_available = COALESCE($6, is_eggless_available),
            eggless_extra_paise = COALESCE($7, eggless_extra_paise),
            is_available = COALESCE($8, is_available),
            updated_at = NOW()
           WHERE id = $1`,
          [
            data.id,
            data.name ?? null,
            data.description ?? null,
            data.image_url ?? null,
            data.category_id ?? null,
            data.is_eggless_available ?? null,
            data.eggless_extra_paise ?? null,
            data.is_available ?? null,
          ]
        );
        if (data.variants) {
          for (const v of data.variants) {
            await tx.query(
              `INSERT INTO product_variants (id, product_id, weight_kg, price_paise, is_available)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (product_id, weight_kg) DO UPDATE SET price_paise = EXCLUDED.price_paise, is_available = EXCLUDED.is_available`,
              [v.id || `var-${crypto.randomUUID().slice(0, 8)}`, data.id, v.weight_kg, v.price_paise, v.is_available]
            );
          }
        }
        return data.id;
      }

      const id = `prod-${Date.now()}`;
      const slug = (data.name || 'cake').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      await tx.query(
        `INSERT INTO products (id, category_id, name, slug, description, image_url, is_eggless_available, eggless_extra_paise, is_price_market_dependent, is_available, is_bestseller, is_featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          data.category_id || 'cat-special',
          data.name || 'Artisan Cake',
          slug,
          data.description || 'Freshly baked artisanal cake.',
          data.image_url || '/images/hero-cake.svg',
          data.is_eggless_available ?? true,
          data.eggless_extra_paise ?? 20000,
          data.is_price_market_dependent ?? false,
          data.is_available ?? true,
          false,
          false,
        ]
      );
      const variants = data.variants || [
        { id: `var-${id}-1`, product_id: id, weight_kg: 0.5, price_paise: 40000, is_available: true },
        { id: `var-${id}-2`, product_id: id, weight_kg: 1.0, price_paise: 70000, is_available: true },
      ];
      for (const v of variants) {
        await tx.query(
          `INSERT INTO product_variants (id, product_id, weight_kg, price_paise, is_available)
           VALUES ($1,$2,$3,$4,$5)`,
          [v.id || `var-${id}-${v.weight_kg}`, id, v.weight_kg, v.price_paise, v.is_available]
        );
      }
      return id;
    });
    return (await this.getProductById(productId))!;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const pool = await getReadyPool();
    const res = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  },

  async getDeliveryZones(): Promise<DeliveryZone[]> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM delivery_zones ORDER BY pincode ASC');
    return res.rows as DeliveryZone[];
  },

  async getDeliveryZoneByPincode(pincode: string): Promise<DeliveryZone | null> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM delivery_zones WHERE pincode = $1 LIMIT 1', [
      pincode.trim(),
    ]);
    return (res.rows[0] as DeliveryZone) || null;
  },

  async updateDeliveryZone(zone: DeliveryZone): Promise<DeliveryZone> {
    const pool = await getReadyPool();
    await pool.query(
      `INSERT INTO delivery_zones (id, pincode, area_name, delivery_charge_paise, minimum_order_paise, is_serviceable)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (pincode) DO UPDATE SET
         area_name = EXCLUDED.area_name,
         delivery_charge_paise = EXCLUDED.delivery_charge_paise,
         minimum_order_paise = EXCLUDED.minimum_order_paise,
         is_serviceable = EXCLUDED.is_serviceable`,
      [
        zone.id || `dz-${Date.now()}`,
        zone.pincode.trim(),
        zone.area_name,
        zone.delivery_charge_paise,
        zone.minimum_order_paise,
        zone.is_serviceable,
      ]
    );
    return (await this.getDeliveryZoneByPincode(zone.pincode))!;
  },

  async getCoupons(): Promise<Coupon[]> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.rows as Coupon[];
  },

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) LIMIT 1', [
      code.trim(),
    ]);
    return (res.rows[0] as Coupon) || null;
  },

  async saveCoupon(c: Coupon): Promise<Coupon> {
    const pool = await getReadyPool();
    const id = c.id || `cpn-${Date.now()}`;
    await pool.query(
      `INSERT INTO coupons (id, code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, is_active, target_type, allowed_phones, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (code) DO UPDATE SET
         discount_type = EXCLUDED.discount_type,
         discount_value = EXCLUDED.discount_value,
         minimum_order_paise = EXCLUDED.minimum_order_paise,
         maximum_discount_paise = EXCLUDED.maximum_discount_paise,
         is_active = EXCLUDED.is_active,
         target_type = EXCLUDED.target_type,
         allowed_phones = EXCLUDED.allowed_phones,
         description = EXCLUDED.description`,
      [
        id,
        c.code.trim().toUpperCase(),
        c.discount_type,
        c.discount_value,
        c.minimum_order_paise,
        c.maximum_discount_paise || null,
        c.is_active,
        c.target_type || 'all',
        JSON.stringify(c.allowed_phones || []),
        c.description || null,
      ]
    );
    return (await this.getCouponByCode(c.code))!;
  },

  async getOrders(): Promise<Order[]> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return hydrateOrders(pool, res.rows);
  },

  async getOrderById(id: string): Promise<Order | null> {
    const pool = await getReadyPool();
    const res = await pool.query(
      'SELECT * FROM orders WHERE id = $1 OR order_code = $1 LIMIT 1',
      [id]
    );
    if (res.rowCount === 0) return null;
    const list = await hydrateOrders(pool, res.rows);
    return list[0] || null;
  },

  async getOrdersByUserOrPhone(userId: string | null, phone: string | null): Promise<Order[]> {
    const pool = await getReadyPool();
    const clean = phone ? phone.replace(/[^0-9]/g, '') : null;
    const res = await pool.query(
      `SELECT * FROM orders
       WHERE ($1::text IS NOT NULL AND user_id = $1)
          OR ($2::text IS NOT NULL AND regexp_replace(customer_phone, '[^0-9]', '', 'g') = $2)
       ORDER BY created_at DESC`,
      [userId, clean]
    );
    return hydrateOrders(pool, res.rows);
  },

  async createOrderTransactional(
    orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>
  ): Promise<{ order: Order; deduplicated: boolean }> {
    const pool = await getReadyPool();
    return withPgTransaction(async (tx) => {
      if (orderData.idempotency_key) {
        const existingRes = await tx.query(
          'SELECT * FROM orders WHERE idempotency_key = $1 LIMIT 1',
          [orderData.idempotency_key]
        );
        if (existingRes.rowCount && existingRes.rowCount > 0) {
          const existing = (await hydrateOrders(tx, existingRes.rows))[0];
          return { order: existing, deduplicated: true };
        }
      }

      const orderId = `ord-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      const insRes = await tx.query(
        `INSERT INTO orders (
          id, order_code, user_id, guest_access_token_hash, idempotency_key,
          customer_name, customer_phone, customer_email, fulfilment_type, order_status,
          payment_method, payment_status, subtotal_paise, delivery_charge_paise,
          discount_paise, coupon_code, total_paise, delivery_pincode,
          delivery_address_snapshot, delivery_date, delivery_slot, special_instructions
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22)
        RETURNING *`,
        [
          orderId,
          orderData.order_code,
          orderData.user_id || null,
          orderData.guest_access_token_hash || null,
          orderData.idempotency_key || null,
          orderData.customer_name,
          orderData.customer_phone,
          orderData.customer_email || null,
          orderData.fulfilment_type,
          orderData.order_status,
          orderData.payment_method,
          orderData.payment_status,
          orderData.subtotal_paise,
          orderData.delivery_charge_paise,
          orderData.discount_paise,
          orderData.coupon_code || null,
          orderData.total_paise,
          orderData.delivery_pincode || null,
          orderData.delivery_address_snapshot
            ? JSON.stringify(orderData.delivery_address_snapshot)
            : null,
          orderData.delivery_date,
          orderData.delivery_slot,
          orderData.special_instructions || null,
        ]
      );

      for (const item of orderData.items) {
        await tx.query(
          `INSERT INTO order_items (
            id, order_id, product_id, product_name, category_name, product_image_snapshot,
            weight_kg, eggless, custom_message, unit_price_paise, quantity, line_total_paise
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            item.id,
            orderId,
            item.product_id || null,
            item.product_name,
            item.category_name,
            item.product_image_snapshot || null,
            item.weight_kg,
            item.eggless,
            item.custom_message || null,
            item.unit_price_paise,
            item.quantity,
            item.line_total_paise,
          ]
        );
      }

      if (orderData.coupon_code) {
        await tx.query(
          'UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER($1)',
          [orderData.coupon_code]
        );
      }

      await tx.query(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by_id, changed_by_role, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          `osh-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
          orderId,
          null,
          orderData.order_status,
          orderData.user_id || null,
          orderData.user_id ? 'customer' : 'guest',
          'Order initialized',
        ]
      );

      const hydrated = (await hydrateOrders(tx, insRes.rows))[0];
      publishRealtimeEvent('ORDER_CREATED', hydrated);
      return { order: hydrated, deduplicated: false };
    });
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    actor: { id: string | null; role: string },
    note?: string,
    rejectionReason?: string
  ): Promise<Order | null> {
    const pool = await getReadyPool();
    return withPgTransaction(async (tx) => {
      const curRes = await tx.query(
        'SELECT * FROM orders WHERE id = $1 OR order_code = $1 FOR UPDATE',
        [orderId]
      );
      if (curRes.rowCount === 0) return null;
      const cur = curRes.rows[0];
      await tx.query(
        `UPDATE orders SET order_status = $2, rejection_reason = COALESCE($3, rejection_reason), updated_at = NOW()
         WHERE id = $1`,
        [cur.id, status, rejectionReason || null]
      );
      await tx.query(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by_id, changed_by_role, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          `osh-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
          cur.id,
          cur.order_status,
          status,
          actor.id,
          actor.role,
          note || null,
        ]
      );
      const updated = (await hydrateOrders(tx, (await tx.query('SELECT * FROM orders WHERE id = $1', [cur.id])).rows))[0];
      publishRealtimeEvent('ORDER_STATUS_CHANGED', { orderId: cur.id, status, order: updated });
      return updated;
    });
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order | null> {
    const pool = await getReadyPool();
    const res = await pool.query(
      'UPDATE orders SET payment_status = $2, updated_at = NOW() WHERE id = $1 OR order_code = $1 RETURNING *',
      [orderId, paymentStatus]
    );
    if (res.rowCount === 0) return null;
    const updated = (await hydrateOrders(pool, res.rows))[0];
    publishRealtimeEvent('ORDER_PAYMENT_STATUS_CHANGED', {
      orderId: updated.id,
      paymentStatus,
      order: updated,
    });
    return updated;
  },

  async createPayment(record: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentRecord> {
    const pool = await getReadyPool();
    const id = `pay-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const res = await withPgTransaction(async (tx) => {
      await tx.query('UPDATE orders SET razorpay_order_id = $2, updated_at = NOW() WHERE id = $1', [
        record.order_id,
        record.razorpay_order_id,
      ]);
      return tx.query(
        `INSERT INTO payments (id, order_id, provider, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_paise, currency, status, method, error_code, error_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          id,
          record.order_id,
          record.provider,
          record.razorpay_order_id,
          record.razorpay_payment_id || null,
          record.razorpay_signature || null,
          record.amount_paise,
          record.currency,
          record.status,
          record.method || null,
          record.error_code || null,
          record.error_description || null,
        ]
      );
    });
    return res.rows[0] as PaymentRecord;
  },

  async getPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentRecord | null> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = $1 LIMIT 1', [
      razorpayOrderId,
    ]);
    return (res.rows[0] as PaymentRecord) || null;
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
    const pool = await getReadyPool();
    const res = await pool.query(
      `UPDATE payments SET
        razorpay_payment_id = COALESCE($2, razorpay_payment_id),
        razorpay_signature = COALESCE($3, razorpay_signature),
        status = $4,
        method = COALESCE($5, method),
        error_code = COALESCE($6, error_code),
        error_description = COALESCE($7, error_description),
        updated_at = NOW()
       WHERE razorpay_order_id = $1 RETURNING *`,
      [
        razorpayOrderId,
        updates.razorpay_payment_id ?? null,
        updates.razorpay_signature ?? null,
        updates.status,
        updates.method ?? null,
        updates.error_code ?? null,
        updates.error_description ?? null,
      ]
    );
    return (res.rows[0] as PaymentRecord) || null;
  },

  async recordWebhookIfNew(evt: Omit<WebhookEventRecord, 'id' | 'processed_at'>): Promise<boolean> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `INSERT INTO webhook_events (id, provider, event_id, event_type, razorpay_order_id, razorpay_payment_id, signature_verified, status, payload_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [
        `whe-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        evt.provider,
        evt.event_id,
        evt.event_type,
        evt.razorpay_order_id,
        evt.razorpay_payment_id,
        evt.signature_verified,
        evt.status,
        evt.payload_hash,
      ]
    );
    return (res.rowCount || 0) > 0;
  },

  async createSession(session: Omit<SessionRecord, 'created_at'>): Promise<SessionRecord> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `INSERT INTO sessions (id, subject_id, subject_role, mfa_verified, ip_address, user_agent, revoked_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        session.id,
        session.subject_id,
        session.subject_role,
        session.mfa_verified,
        session.ip_address || null,
        session.user_agent || null,
        session.revoked_at,
        session.expires_at,
      ]
    );
    return res.rows[0] as SessionRecord;
  },

  async getSessionById(id: string): Promise<SessionRecord | null> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM sessions WHERE id = $1 LIMIT 1', [id]);
    return (res.rows[0] as SessionRecord) || null;
  },

  async revokeSession(id: string): Promise<void> {
    const pool = await getReadyPool();
    await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [id]);
  },

  async markSessionMfaVerified(id: string): Promise<void> {
    const pool = await getReadyPool();
    await pool.query('UPDATE sessions SET mfa_verified = TRUE WHERE id = $1', [id]);
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    const pool = await getReadyPool();
    const clean = phone.replace(/[^0-9]/g, '');
    const res = await pool.query(
      `SELECT u.*, up.avatar_url AS profile_avatar_url, up.date_of_birth, up.gender,
              up.notify_order_updates, up.notify_promotions
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE regexp_replace(u.phone, '[^0-9]', '', 'g') = $1 LIMIT 1`,
      [clean]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `SELECT u.*, up.avatar_url AS profile_avatar_url, up.date_of_birth, up.gender,
              up.notify_order_updates, up.notify_promotions
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async getUserById(id: string): Promise<User | null> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `SELECT u.*, up.avatar_url AS profile_avatar_url, up.date_of_birth, up.gender,
              up.notify_order_updates, up.notify_promotions
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async getUsers(): Promise<User[]> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `SELECT u.*, up.avatar_url AS profile_avatar_url, up.date_of_birth, up.gender,
              up.notify_order_updates, up.notify_promotions
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    return res.rows.map(mapUserRow);
  },

  async createUser(data: {
    full_name: string;
    phone: string;
    email?: string | null;
    password_hash: string;
  }): Promise<User> {
    return withPgTransaction(async (tx) => {
      const id = `usr-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      const res = await tx.query(
        `INSERT INTO users (id, full_name, phone, email, password_hash, role, is_active)
         VALUES ($1,$2,$3,$4,$5,'customer',TRUE) RETURNING *`,
        [id, data.full_name, data.phone, data.email || null, data.password_hash]
      );
      await tx.query(
        `INSERT INTO user_profiles (user_id, notify_order_updates, notify_promotions)
         VALUES ($1, TRUE, FALSE) ON CONFLICT (user_id) DO NOTHING`,
        [id]
      );
      return mapUserRow(res.rows[0]);
    });
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
    const pool = await getReadyPool();
    void pool;
    return withPgTransaction(async (tx) => {
      const curRes = await tx.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      const current = curRes.rows[0];
      if (!current) return null;

      const nextName = updates.full_name !== undefined ? updates.full_name : current.full_name;
      const nextPhone = updates.phone !== undefined ? updates.phone : current.phone;
      const nextEmail = updates.email !== undefined ? updates.email : current.email;
      const nextAvatar =
        updates.avatar_url !== undefined ? updates.avatar_url : current.avatar_url ?? null;

      await tx.query(
        `UPDATE users
         SET full_name = $2, phone = $3, email = $4, avatar_url = $5, updated_at = NOW()
         WHERE id = $1`,
        [userId, nextName, nextPhone, nextEmail, nextAvatar]
      );

      const profRes = await tx.query('SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1', [
        userId,
      ]);
      const prof = profRes.rows[0];
      const finalAvatar =
        updates.avatar_url !== undefined ? updates.avatar_url : prof?.avatar_url ?? nextAvatar ?? null;
      const finalDob =
        updates.date_of_birth !== undefined ? updates.date_of_birth : prof?.date_of_birth ?? null;
      const finalGender =
        updates.gender !== undefined ? updates.gender : prof?.gender ?? null;
      const finalNotifyOrders =
        updates.notification_preferences?.order_updates !== undefined
          ? updates.notification_preferences.order_updates
          : prof?.notify_order_updates ?? true;
      const finalNotifyPromos =
        updates.notification_preferences?.promotions !== undefined
          ? updates.notification_preferences.promotions
          : prof?.notify_promotions ?? false;

      await tx.query(
        `INSERT INTO user_profiles (user_id, avatar_url, date_of_birth, gender, notify_order_updates, notify_promotions, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           avatar_url = EXCLUDED.avatar_url,
           date_of_birth = EXCLUDED.date_of_birth,
           gender = EXCLUDED.gender,
           notify_order_updates = EXCLUDED.notify_order_updates,
           notify_promotions = EXCLUDED.notify_promotions,
           updated_at = NOW()`,
        [userId, finalAvatar, finalDob || null, finalGender || null, finalNotifyOrders, finalNotifyPromos]
      );

      const finalRes = await tx.query(
        `SELECT u.*, up.avatar_url AS profile_avatar_url, up.date_of_birth, up.gender,
                up.notify_order_updates, up.notify_promotions
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.id = $1 LIMIT 1`,
        [userId]
      );
      return finalRes.rows[0] ? mapUserRow(finalRes.rows[0]) : null;
    });
  },

  async updateUserPasswordHash(userId: string, passwordHash: string): Promise<boolean> {
    const pool = await getReadyPool();
    const res = await pool.query(
      'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [userId, passwordHash]
    );
    return (res.rowCount || 0) > 0;
  },

  async getAdminUserByIdentifier(identifier: string): Promise<AdminUserRecord | null> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `SELECT * FROM admin_users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1`,
      [identifier.trim()]
    );
    return (res.rows[0] as AdminUserRecord) || null;
  },

  async getAdminUserById(id: string): Promise<AdminUserRecord | null> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [id]);
    return (res.rows[0] as AdminUserRecord) || null;
  },

  async upsertAdminUser(admin: AdminUserRecord): Promise<AdminUserRecord> {
    const pool = await getReadyPool();
    const res = await pool.query(
      `INSERT INTO admin_users (id, username, full_name, phone, email, password_hash, mfa_enabled, mfa_secret, mfa_backup_codes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         mfa_enabled = EXCLUDED.mfa_enabled,
         mfa_secret = EXCLUDED.mfa_secret,
         mfa_backup_codes = EXCLUDED.mfa_backup_codes,
         updated_at = NOW()
       RETURNING *`,
      [
        admin.id,
        admin.username,
        admin.full_name,
        admin.phone,
        admin.email,
        admin.password_hash,
        admin.mfa_enabled,
        admin.mfa_secret || null,
        JSON.stringify(admin.mfa_backup_codes || []),
        admin.is_active,
      ]
    );
    return res.rows[0] as AdminUserRecord;
  },

  async getAddressesByUserId(userId: string): Promise<Address[]> {
    const pool = await getReadyPool();
    const res = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return res.rows as Address[];
  },

  async saveAddress(userId: string, addr: Omit<Address, 'id' | 'user_id'>): Promise<Address> {
    const pool = await getReadyPool();
    void pool;
    return withPgTransaction(async (tx) => {
      const existingCountRes = await tx.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM addresses WHERE user_id = $1',
        [userId]
      );
      const makeDefault = Boolean(addr.is_default) || Number(existingCountRes.rows[0]?.cnt || 0) === 0;
      if (makeDefault) {
        await tx.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
      }
      const id = `addr-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      const addrType: AddressType =
        addr.address_type ||
        (addr.label === 'Work' || addr.label === 'Other' ? addr.label : 'Home');
      const res = await tx.query(
        `INSERT INTO addresses (
           id, user_id, label, address_type, recipient_name, phone, alternate_phone,
           house_no, street_name, area_locality, address_line1, address_line2,
           city, district, state, pincode, landmark, is_default, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
         RETURNING *`,
        [
          id,
          userId,
          addr.label || addrType,
          addrType,
          addr.recipient_name,
          addr.phone,
          addr.alternate_phone || null,
          addr.house_no || addr.address_line1,
          addr.street_name || addr.address_line2 || null,
          addr.area_locality || addr.city || null,
          addr.address_line1,
          addr.address_line2 || null,
          addr.city || addr.district || 'Theni',
          addr.district || addr.city || 'Theni',
          addr.state || 'Tamil Nadu',
          addr.pincode,
          addr.landmark || null,
          makeDefault,
        ]
      );
      return res.rows[0] as Address;
    });
  },

  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Omit<Address, 'id' | 'user_id'>>
  ): Promise<Address | null> {
    const pool = await getReadyPool();
    void pool;
    return withPgTransaction(async (tx) => {
      const existingRes = await tx.query(
        'SELECT * FROM addresses WHERE id = $1 AND user_id = $2 LIMIT 1',
        [addressId, userId]
      );
      const cur = existingRes.rows[0] as Address | undefined;
      if (!cur) return null;

      if (updates.is_default === true) {
        await tx.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
      }

      const nextType: AddressType =
        updates.address_type ||
        (updates.label === 'Work' || updates.label === 'Other' || updates.label === 'Home'
          ? updates.label
          : cur.address_type || 'Home');

      const res = await tx.query(
        `UPDATE addresses SET
           label = $3,
           address_type = $4,
           recipient_name = $5,
           phone = $6,
           alternate_phone = $7,
           house_no = $8,
           street_name = $9,
           area_locality = $10,
           address_line1 = $11,
           address_line2 = $12,
           city = $13,
           district = $14,
           state = $15,
           pincode = $16,
           landmark = $17,
           is_default = $18,
           updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          addressId,
          userId,
          updates.label ?? nextType,
          nextType,
          updates.recipient_name ?? cur.recipient_name,
          updates.phone ?? cur.phone,
          updates.alternate_phone !== undefined ? updates.alternate_phone : cur.alternate_phone || null,
          updates.house_no ?? updates.address_line1 ?? cur.house_no ?? cur.address_line1,
          updates.street_name !== undefined ? updates.street_name : cur.street_name ?? cur.address_line2 ?? null,
          updates.area_locality !== undefined ? updates.area_locality : cur.area_locality ?? cur.city ?? null,
          updates.address_line1 ?? cur.address_line1,
          updates.address_line2 !== undefined ? updates.address_line2 : cur.address_line2 ?? null,
          updates.city ?? cur.city,
          updates.district ?? updates.city ?? cur.district ?? cur.city,
          updates.state ?? cur.state,
          updates.pincode ?? cur.pincode,
          updates.landmark !== undefined ? updates.landmark : cur.landmark ?? null,
          updates.is_default !== undefined ? updates.is_default : Boolean(cur.is_default),
        ]
      );
      return (res.rows[0] as Address) || null;
    });
  },

  async deleteAddressSafe(
    userId: string,
    addressId: string
  ): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'default_has_other' }> {
    const pool = await getReadyPool();
    void pool;
    return withPgTransaction(async (tx) => {
      const listRes = await tx.query<Address>(
        'SELECT * FROM addresses WHERE user_id = $1',
        [userId]
      );
      const target = listRes.rows.find((a) => a.id === addressId);
      if (!target) return { ok: false, reason: 'not_found' };
      if (target.is_default && listRes.rows.length > 1) {
        return { ok: false, reason: 'default_has_other' };
      }
      await tx.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
      return { ok: true };
    });
  },

  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    const res = await this.deleteAddressSafe(userId, addressId);
    return res.ok;
  },

  async recordAudit(entry: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord> {
    const pool = await getReadyPool();
    const id = `aud-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const res = await pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, user_agent, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
      [
        id,
        entry.actor_id,
        entry.actor_role,
        entry.action,
        entry.target_type,
        entry.target_id || null,
        entry.ip_address || null,
        entry.user_agent || null,
        JSON.stringify(entry.metadata || {}),
      ]
    );
    return res.rows[0] as AuditLogRecord;
  },

  async getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    const pool = await getReadyPool();
    const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows as AuditLogRecord[];
  },

  async recordCustomerLogin(data: {
    user_id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    type?: 'login' | 'register';
    ip_address?: string | null;
  }): Promise<CustomerLoginRecord> {
    const pool = await getReadyPool();
    const id = `login-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const res = await pool.query(
      `INSERT INTO customer_login_events (id, user_id, full_name, phone, email, event_type, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, data.user_id, data.full_name, data.phone, data.email || null, data.type || 'login', data.ip_address || null]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      login_time: new Date(r.created_at).toISOString(),
      type: r.event_type,
    };
  },

  async getCustomerLogins(): Promise<CustomerLoginRecord[]> {
    const pool = await getReadyPool();
    const res = await pool.query(
      'SELECT * FROM customer_login_events ORDER BY created_at DESC LIMIT 100'
    );
    return res.rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      login_time: new Date(r.created_at).toISOString(),
      type: r.event_type,
    }));
  },
};
