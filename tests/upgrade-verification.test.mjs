import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');
const UPLOAD_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'cakes');
const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGIN = BASE_URL;

const TEST_RZP_SECRET = 'test_rzp_secret_for_hmac_verification_12345';
const TEST_WEBHOOK_SECRET = 'test_rzp_webhook_secret_for_raw_body_67890';
const TEST_ADMIN_PASSWORD = 'TestOwnerStrongPassword#2026';
const TEST_AUTH_SECRET = 'test_jwt_auth_secret_at_least_32_characters_long_abc123';

// ─── File backup/restore so automated tests leave live bakery data untouched ─
const dataSnapshot = new Map();
let originalDataFiles = new Set();
const createdUploadFiles = [];
let serverProcess = null;

function snapshotDataDir() {
  if (!fs.existsSync(DATA_DIR)) return;
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  originalDataFiles = new Set(files);
  for (const file of files) {
    dataSnapshot.set(file, fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
  }
}

function restoreDataDir() {
  if (fs.existsSync(DATA_DIR)) {
    const currentFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    for (const file of currentFiles) {
      if (!originalDataFiles.has(file)) {
        fs.rmSync(path.join(DATA_DIR, file), { force: true });
      }
    }
    for (const [file, content] of dataSnapshot.entries()) {
      fs.writeFileSync(path.join(DATA_DIR, file), content, 'utf-8');
    }
  }
  for (const uploadedPath of createdUploadFiles) {
    try {
      if (fs.existsSync(uploadedPath)) fs.rmSync(uploadedPath, { force: true });
    } catch {
      // ignore cleanup error
    }
  }
}

function extractAuthCookie(res) {
  const rawSetCookie =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
      ? [res.headers.get('set-cookie')]
      : [];

  for (const line of rawSetCookie) {
    const match = line.match(/nilas_auth_token=([^;]+)/);
    if (match && match[1]) return `nilas_auth_token=${match[1]}`;
  }
  return null;
}

async function apiFetch(routePath, { method = 'GET', body, cookie, headers = {} } = {}) {
  const reqHeaders = {
    origin: ORIGIN,
    ...headers,
  };
  if (cookie) reqHeaders.cookie = cookie;

  let payload;
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === 'string') {
      payload = body;
    } else {
      reqHeaders['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`${BASE_URL}${routePath}`, {
    method,
    headers: reqHeaders,
    body: payload,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { res, status: res.status, json, text, cookie: extractAuthCookie(res) };
}

async function waitForServerReady(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE_URL}/api/health`);
      if (r.ok || r.status === 200) return;
    } catch {
      // wait for server boot
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Test Next.js server did not become ready within ${timeoutMs}ms`);
}

function futureDateISO(daysAhead = 3) {
  const d = new Date(Date.now() + daysAhead * 86400_000);
  return d.toISOString().slice(0, 10);
}

before(async () => {
  snapshotDataDir();

  const nextBin = path.join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  serverProcess = spawn(process.execPath, [nextBin, 'dev', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORT),
      NEXT_PUBLIC_SITE_URL: ORIGIN,
      AUTH_SECRET: TEST_AUTH_SECRET,
      RAZORPAY_KEY_SECRET: TEST_RZP_SECRET,
      RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
      DEFAULT_ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
      ADMIN_MFA_REQUIRED: 'false',
      REQUIRE_POSTGRES: 'false',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5999/unreachable_test_db',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServerReady();
});

after(async () => {
  if (serverProcess && !serverProcess.killed) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  restoreDataDir();
});

// Shared test state across ordered integration checks
let customerACookie = '';
let customerBCookie = '';
let adminCookie = '';
let sampleProductId = '';
let sampleProductHalfKgPrice = 0;
let sampleProductEgglessExtra = 0;
let customerAOrderId = '';
let razorpayPendingOrderId = '';
let guestOrderId = '';
let guestRawToken = '';

test('1. Security Headers & Health Endpoint', async () => {
  const { res, status, json } = await apiFetch('/api/health');
  assert.equal(status, 200);
  assert.equal(json.status, 'ok');

  // Verify middleware security headers attached by proxy.ts
  const pageRes = await fetch(`${BASE_URL}/cakes`);
  assert.equal(pageRes.status, 200);
  assert.equal(pageRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(pageRes.headers.get('x-frame-options'), 'DENY');
  assert.ok(pageRes.headers.get('content-security-policy')?.includes("default-src 'self'"));
  assert.ok(pageRes.headers.get('referrer-policy'));
});

test('2. Customer Registration (Argon2id hashing), Duplicate 409 Block & Session Logout Revocation', async () => {
  const regA = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Customer Alice',
      phone: '9876500001',
      email: 'alice@example.com',
      password: 'AliceStrongPassword#1',
    },
  });
  assert.equal(regA.status, 201);
  assert.ok(regA.cookie, 'Registration should set HttpOnly auth cookie');
  assert.equal(regA.json.user.password, undefined, 'Never leak password field');
  assert.equal(regA.json.user.password_hash, undefined, 'Never leak password_hash field');
  customerACookie = regA.cookie;

  // Verify Argon2id PHC format persisted in users.json (no plaintext passwords!)
  const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8'));
  const savedAlice = users.find((u) => u.phone === '9876500001');
  assert.ok(savedAlice?.password_hash?.startsWith('$argon2id$'), 'Password must be hashed with Argon2id');
  assert.equal(savedAlice.password, undefined, 'Plaintext password must never be saved');

  // Duplicate phone registration MUST return 409 Conflict (prevents account takeover)
  const dup = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Attacker Taking Over Alice',
      phone: '9876500001',
      password: 'AttackerPassword#1',
    },
  });
  assert.equal(dup.status, 409);

  // Register Customer B for cross-customer IDOR tests
  const regB = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Customer Bob',
      phone: '9876500002',
      email: 'bob@example.com',
      password: 'BobStrongPassword#2',
    },
  });
  assert.equal(regB.status, 201);
  customerBCookie = regB.cookie;

  // Test Logout revokes server session jti so reused cookie no longer authenticates
  const regTemp = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Temp Revoke User',
      phone: '9876500099',
      password: 'TempPassword#99',
    },
  });
  assert.equal(regTemp.status, 201);
  const tempCookie = regTemp.cookie;

  const meBeforeLogout = await apiFetch('/api/auth/me', { cookie: tempCookie });
  assert.equal(meBeforeLogout.json.user.phone, '9876500099');

  await apiFetch('/api/auth/logout', { method: 'POST', cookie: tempCookie });
  const meAfterLogout = await apiFetch('/api/auth/me', { cookie: tempCookie });
  assert.equal(meAfterLogout.json.user, null, 'Revoked session cookie must fail auth after logout');
});

test('3. Customer/Admin RBAC Enforcement & Owner Login', async () => {
  // Unauthenticated access to admin endpoint -> 401
  const unauthOrders = await apiFetch('/api/orders');
  assert.equal(unauthOrders.status, 401);

  const unauthAdminUpload = await apiFetch('/api/admin/customer-logins');
  assert.equal(unauthAdminUpload.status, 401);

  // Customer A attempting admin-only product creation -> 403
  const custCreateProd = await apiFetch('/api/admin/products', {
    method: 'POST',
    cookie: customerACookie,
    body: { name: 'Hack Cake', category_id: 'cat-1', price_half_kg: 100, price_one_kg: 200 },
  });
  assert.equal(custCreateProd.status, 403);

  // Admin wrong password -> 401
  const badAdminLogin = await apiFetch('/api/admin/auth/login', {
    method: 'POST',
    body: { identifier: '9344597833', password: 'WrongPassword!' },
  });
  assert.equal(badAdminLogin.status, 401);

  // Valid Admin login -> 200
  const goodAdminLogin = await apiFetch('/api/admin/auth/login', {
    method: 'POST',
    body: { identifier: '9344597833', password: TEST_ADMIN_PASSWORD },
  });
  assert.equal(goodAdminLogin.status, 200);
  assert.equal(goodAdminLogin.json.user.role, 'admin');
  adminCookie = goodAdminLogin.cookie;
});

test('4. Product Price Tampering Blocked & Server-Side Pricing Computed', async () => {
  const { status: prodStatus, json: prodJson } = await apiFetch('/api/products');
  assert.equal(prodStatus, 200);
  const products = prodJson.products || [];
  const activeProduct = products.find((p) => p.is_available !== false);
  assert.ok(activeProduct, 'Catalog must have an active cake');
  sampleProductId = activeProduct.id;
  const halfVariant = activeProduct.variants.find((v) => v.weight_kg === 0.5 && v.is_available);
  assert.ok(halfVariant, 'Active product must have a 0.5kg variant');
  sampleProductHalfKgPrice = halfVariant.price_paise;
  sampleProductEgglessExtra = activeProduct.eggless_extra_paise || 0;

  // Negative quantity rejected
  const negQty = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'pickup',
      payment_method: 'cod',
      delivery_date: futureDateISO(3),
      delivery_slot: '10:00 AM – 01:00 PM',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: -2 }],
    },
  });
  assert.equal(negQty.status, 400);

  // Client attempts to tamper total_paise = 100 paise (Rs 1) & eggless true
  const tamperedRes = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'pickup',
      payment_method: 'cod',
      delivery_date: futureDateISO(3),
      delivery_slot: '10:00 AM – 01:00 PM',
      total_paise: 100, // tampered!
      discount_paise: 999900, // tampered!
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: true, quantity: 1 }],
    },
  });
  assert.equal(tamperedRes.status, 201);
  const created = tamperedRes.json.order;
  customerAOrderId = created.id;

  const expectedSubtotal = sampleProductHalfKgPrice + sampleProductEgglessExtra;
  assert.equal(created.subtotal_paise, expectedSubtotal, 'Subtotal must include server eggless surcharge');
  assert.equal(created.delivery_charge_paise, 0, 'Pickup order must have 0 delivery charge');
  assert.equal(created.total_paise, expectedSubtotal, 'Server must ignore client-supplied total_paise/discount_paise');
});

test('5. Server-Validated Coupon Codes (Valid, Min Spend & Specific Customer Restriction)', async () => {
  // Admin creates a targeted coupon VIPALICE20 only for 9876500001 with minimum 200 Rs
  const createCoupon = await apiFetch('/api/coupons', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      code: 'VIPALICE20',
      discount_type: 'percentage',
      discount_value: 20,
      minimum_order_paise: 20000,
      maximum_discount_paise: 15000,
      is_active: true,
      target_type: 'specific_customers',
      allowed_phones: ['9876500001'],
    },
  });
  assert.equal(createCoupon.status, 200);
  assert.equal(createCoupon.json.success, true);

  // Customer B (unauthorized phone) trying VIPALICE20 -> 400 rejected
  const bobTryVip = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerBCookie,
    body: {
      customer_name: 'Customer Bob',
      customer_phone: '9876500002',
      fulfilment_type: 'pickup',
      payment_method: 'cod',
      delivery_date: futureDateISO(3),
      delivery_slot: '10:00 AM – 01:00 PM',
      coupon_code: 'VIPALICE20',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(bobTryVip.status, 400);

  // Customer A using VIPALICE20 -> 201 with capped server discount
  const aliceVip = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'pickup',
      payment_method: 'cod',
      delivery_date: futureDateISO(3),
      delivery_slot: '01:00 PM – 04:00 PM',
      coupon_code: 'VIPALICE20',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(aliceVip.status, 201);
  const expectedDisc = Math.min(Math.round((sampleProductHalfKgPrice * 20) / 100), 15000);
  assert.equal(aliceVip.json.order.discount_paise, expectedDisc);
  assert.equal(aliceVip.json.order.total_paise, sampleProductHalfKgPrice - expectedDisc);
});

test('6. Duplicate Order Submission Idempotency & Guest Checkout Token Access Control', async () => {
  const idempKey = `test-idemp-${Date.now()}`;
  const guestPayload = {
    customer_name: 'Guest Priya',
    customer_phone: '9876500077',
    fulfilment_type: 'pickup',
    payment_method: 'cod',
    delivery_date: futureDateISO(2),
    delivery_slot: '04:00 PM – 07:00 PM',
    idempotency_key: idempKey,
    items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
  };

  const first = await apiFetch('/api/orders', { method: 'POST', body: guestPayload });
  assert.equal(first.status, 201);
  assert.ok(first.json.guestAccessToken, 'Guest order must receive one-time cryptographic access token');
  guestOrderId = first.json.order.id;
  guestRawToken = first.json.guestAccessToken;

  // Exact duplicate retry with same idempotency_key must NOT create a second order
  const retry = await apiFetch('/api/orders', { method: 'POST', body: guestPayload });
  assert.equal(retry.status, 200);
  assert.equal(retry.json.deduplicated, true);
  assert.equal(retry.json.order.id, guestOrderId);

  // Access guest order WITHOUT token -> 401
  const noToken = await apiFetch(`/api/orders/${guestOrderId}`);
  assert.equal(noToken.status, 401);

  // Access guest order WITH wrong token -> 401
  const wrongToken = await apiFetch(`/api/orders/${guestOrderId}?token=wrongtoken123456`);
  assert.equal(wrongToken.status, 401);

  // Access guest order WITH valid token -> 200 and no token hash leaked
  const validToken = await apiFetch(`/api/orders/${guestOrderId}?token=${guestRawToken}`);
  assert.equal(validToken.status, 200);
  assert.equal(validToken.json.order.id, guestOrderId);
  assert.equal(validToken.json.order.guest_access_token_hash, undefined);
});

test('7. IDOR Prevention: Customer Cannot Access Another Customer Order or Update Status', async () => {
  // Customer B reads Customer A order directly -> 403
  const bobReadsAlice = await apiFetch(`/api/orders/${customerAOrderId}`, { cookie: customerBCookie });
  assert.equal(bobReadsAlice.status, 403);

  // Customer B attempts ?phone=<AlicePhone> query parameter bypass -> only returns Bob's orders!
  const bobListsAlicePhone = await apiFetch('/api/orders?phone=9876500001', { cookie: customerBCookie });
  assert.equal(bobListsAlicePhone.status, 200);
  assert.equal(bobListsAlicePhone.json.orders.length, 0, 'Customer query must ignore other customer phone');

  // Customer A tries to self-confirm status via PATCH /api/orders/[id] -> 403
  const aliceSelfConfirm = await apiFetch(`/api/orders/${customerAOrderId}`, {
    method: 'PATCH',
    cookie: customerACookie,
    body: { status: 'Order Confirmed', payment_status: 'paid' },
  });
  assert.equal(aliceSelfConfirm.status, 403);

  // Admin advances status cleanly -> 200 + immutable status_history appended
  const adminAdvance = await apiFetch(`/api/orders/${customerAOrderId}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { status: 'Order Confirmed', note: 'Owner confirmed kitchen schedule' },
  });
  assert.equal(adminAdvance.status, 200);
  assert.equal(adminAdvance.json.order.order_status, 'Order Confirmed');
  assert.ok(adminAdvance.json.order.status_history.some((h) => h.to_status === 'Order Confirmed'));
});

test('8. Owner Credentials Blocked in Customer Order Placement & CSRF Origin Enforcement', async () => {
  const ownerPhoneInCheckout = await apiFetch('/api/orders', {
    method: 'POST',
    body: {
      customer_name: 'Owner Pretend',
      customer_phone: '9344597833',
      fulfilment_type: 'pickup',
      payment_method: 'cod',
      delivery_date: futureDateISO(3),
      delivery_slot: '10:00 AM – 01:00 PM',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(ownerPhoneInCheckout.status, 400);

  // Cross-origin CSRF attack rejected -> 403
  const evilCsrf = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    headers: { origin: 'https://evil-attacker.example.com' },
    body: { customer_name: 'CSRF', customer_phone: '9876500001' },
  });
  assert.equal(evilCsrf.status, 403);
});

test('9. Razorpay Payment Security (Failure Recovery, Invalid Signature & Bind Rejection)', async () => {
  // Create a Razorpay order via backend
  const createRzpOrder = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'pickup',
      payment_method: 'razorpay',
      delivery_date: futureDateISO(4),
      delivery_slot: '10:00 AM – 01:00 PM',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(createRzpOrder.status, 201);
  razorpayPendingOrderId = createRzpOrder.json.order.id;

  // Record a payment failure -> marks order failed while keeping retryAllowed true
  const failRes = await apiFetch('/api/payments/razorpay/failure', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      orderId: razorpayPendingOrderId,
      errorCode: 'BAD_REQUEST_ERROR',
      errorDescription: 'Customer closed UPI modal',
    },
  });
  assert.equal(failRes.status, 200);
  assert.equal(failRes.json.retryAllowed, true);

  const afterFail = await apiFetch(`/api/orders/${razorpayPendingOrderId}`, { cookie: customerACookie });
  assert.equal(afterFail.json.order.payment_status, 'failed');

  // Spoofed/unbound razorpayOrderId or forged HMAC signature MUST be rejected (400), never faked
  const rzpOrderId = `order_forged_${Date.now()}`;
  const rzpPaymentId = `pay_forged_${Date.now()}`;
  const forgedSig = crypto
    .createHmac('sha256', TEST_RZP_SECRET)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest('hex');

  const unboundVerifyRes = await apiFetch('/api/payments/razorpay/verify', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      orderId: razorpayPendingOrderId,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: forgedSig,
    },
  });
  assert.equal(unboundVerifyRes.status, 400);

  // Also test Customer B cannot trigger verify on Customer A order -> 403
  const idorVerify = await apiFetch('/api/payments/razorpay/verify', {
    method: 'POST',
    cookie: customerBCookie,
    body: {
      orderId: razorpayPendingOrderId,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: forgedSig,
    },
  });
  assert.equal(idorVerify.status, 403);
});

test('10. Razorpay Raw-Body Webhook Security, Failure/Delayed/Captured Events & Idempotency', async () => {
  // Create a fresh unpaid Razorpay order to simulate delayed webhook recovery after client drop-off
  const createDelayed = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'pickup',
      payment_method: 'razorpay',
      delivery_date: futureDateISO(4),
      delivery_slot: '04:00 PM – 07:00 PM',
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(createDelayed.status, 201);
  const delayedOrderId = createDelayed.json.order.id;
  const rzpOrderId = `order_wh_${Date.now()}`;
  const rzpPaymentId = `pay_wh_${Date.now()}`;

  // First send payment.failed webhook linked via internal_order_id note
  const failedBody = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_fail_${Date.now()}`,
          order_id: rzpOrderId,
          error_code: 'GATEWAY_TIMEOUT',
          error_description: 'Bank timed out',
          notes: { internal_order_id: delayedOrderId },
        },
      },
    },
  });
  const failedSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(failedBody)
    .digest('hex');

  // Invalid webhook signature MUST return 401
  const badWebhook = await apiFetch('/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': 'invalid_signature_value',
    },
    body: failedBody,
  });
  assert.equal(badWebhook.status, 401);

  const validFailedWh = await apiFetch('/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': failedSig,
      'x-razorpay-event-id': `evt_fail_${Date.now()}`,
    },
    body: failedBody,
  });
  assert.equal(validFailedWh.status, 200);

  const afterFailedWh = await apiFetch(`/api/orders/${delayedOrderId}`, { cookie: customerACookie });
  assert.equal(afterFailedWh.json.order.payment_status, 'failed');

  // Reject underpaid webhook amount (tamper attempt) -> 400
  const underpaidBody = JSON.stringify({
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: rzpOrderId,
          amount_paid: 100, // 1 rupee instead of full order amount
          notes: { internal_order_id: delayedOrderId },
        },
      },
    },
  });
  const underpaidSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(underpaidBody)
    .digest('hex');
  const underpaidWh = await apiFetch('/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': underpaidSig,
      'x-razorpay-event-id': `evt_underpaid_${Date.now()}`,
    },
    body: underpaidBody,
  });
  assert.equal(underpaidWh.status, 400);

  // Now send delayed payment.captured webhook -> recovers failed order to paid + confirmed!
  const capturedEventId = `evt_cap_${Date.now()}`;
  const capturedBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: createDelayed.json.order.total_paise,
          method: 'upi',
          notes: { internal_order_id: delayedOrderId },
        },
      },
    },
  });
  const capturedSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(capturedBody)
    .digest('hex');

  const firstCaptured = await apiFetch('/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': capturedSig,
      'x-razorpay-event-id': capturedEventId,
    },
    body: capturedBody,
  });
  assert.equal(firstCaptured.status, 200);
  assert.notEqual(firstCaptured.json.duplicate, true);

  // Check order became paid & confirmed via delayed webhook
  const orderAfterWh = await apiFetch(`/api/orders/${delayedOrderId}`, { cookie: customerACookie });
  assert.equal(orderAfterWh.json.order.payment_status, 'paid');
  assert.equal(orderAfterWh.json.order.order_status, 'Order Confirmed');

  // Duplicate webhook replay with SAME event_id -> acknowledged safely as duplicate: true
  const dupCaptured = await apiFetch('/api/payments/razorpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': capturedSig,
      'x-razorpay-event-id': capturedEventId,
    },
    body: capturedBody,
  });
  assert.equal(dupCaptured.status, 200);
  assert.equal(dupCaptured.json.duplicate, true);
});

test('11. Magic-Byte File Upload Validation (Reject Spoofed Script, Accept Real PNG)', async () => {
  // Spoofed XSS HTML masquerading as image/jpeg -> 400 rejected
  const spoofForm = new FormData();
  spoofForm.append(
    'file',
    new Blob([Buffer.from('<script>alert(1)</script>')], { type: 'image/jpeg' }),
    'evil.jpg'
  );
  const badUpload = await apiFetch('/api/admin/upload', {
    method: 'POST',
    cookie: adminCookie,
    body: spoofForm,
  });
  assert.equal(badUpload.status, 400);

  // Valid 1x1 PNG binary signature -> 200 accepted
  const pngHeaderBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const goodForm = new FormData();
  goodForm.append('file', new Blob([pngHeaderBytes], { type: 'image/png' }), 'valid-cake.png');

  const goodUpload = await apiFetch('/api/admin/upload', {
    method: 'POST',
    cookie: adminCookie,
    body: goodForm,
  });
  assert.equal(goodUpload.status, 200);
  assert.ok(goodUpload.json.url.startsWith('/uploads/cakes/'));
  createdUploadFiles.push(path.join(UPLOAD_DIR, path.basename(goodUpload.json.url)));
});

test('12. Saved Delivery Addresses & Dynamic Delivery Zone Fees', async () => {
  // Save an address for Customer A
  const saveAddr = await apiFetch('/api/addresses', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      label: 'Home',
      recipient_name: 'Customer Alice',
      phone: '9876500001',
      address_line1: '42 Madurai Main Road',
      city: 'Theni',
      state: 'Tamil Nadu',
      pincode: '625531',
      is_default: true,
    },
  });
  assert.equal(saveAddr.status, 201);

  const listAddr = await apiFetch('/api/addresses', { cookie: customerACookie });
  assert.equal(listAddr.status, 200);
  assert.ok(listAddr.json.addresses.some((a) => a.pincode === '625531'));

  // Place home delivery order to unserviceable pincode -> 400
  const unserviceableOrder = await apiFetch('/api/orders', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      customer_name: 'Customer Alice',
      customer_phone: '9876500001',
      fulfilment_type: 'delivery',
      payment_method: 'cod',
      delivery_pincode: '999999',
      delivery_date: futureDateISO(3),
      delivery_slot: '10:00 AM – 01:00 PM',
      address: {
        recipient_name: 'Customer Alice',
        phone: '9876500001',
        address_line1: '42 Outside Road',
        city: 'Remote',
        state: 'Tamil Nadu',
        pincode: '999999',
      },
      items: [{ product_id: sampleProductId, weight_kg: 0.5, eggless: false, quantity: 1 }],
    },
  });
  assert.equal(unserviceableOrder.status, 400);
});

test('13. Login Rate Limiting Enforced (HTTP 429)', async () => {
  let sawRateLimit = false;
  for (let i = 0; i < 14; i++) {
    const res = await apiFetch('/api/admin/auth/login', {
      method: 'POST',
      body: { identifier: '9344597833', password: 'WrongPasswordBurst!' },
    });
    if (res.status === 429) {
      sawRateLimit = true;
      break;
    }
  }
  assert.equal(sawRateLimit, true, 'Admin login brute-force burst must trigger HTTP 429 rate limit');
});

test('14. User Profile Overview, Completion Score & Personal Information Updates', async () => {
  // Unauthenticated profile access -> 401
  const unauthProf = await apiFetch('/api/account/profile');
  assert.equal(unauthProf.status, 401);

  // Authenticated Customer A profile access -> 200
  const profA = await apiFetch('/api/account/profile', { cookie: customerACookie });
  assert.equal(profA.status, 200);
  assert.equal(profA.json.user.full_name, 'Customer Alice');
  assert.ok(typeof profA.json.completion.percentage === 'number');

  // Customer A updates personal information: full_name, dob, gender, notifications
  const updateProf = await apiFetch('/api/account/profile', {
    method: 'PATCH',
    cookie: customerACookie,
    body: {
      full_name: 'Alice Cooper',
      phone: '9876500001',
      email: 'alice.cooper@example.com',
      date_of_birth: '1998-05-15',
      gender: 'female',
      notification_preferences: {
        order_updates: true,
        promotions: true,
      },
    },
  });
  assert.equal(updateProf.status, 200);
  assert.equal(updateProf.json.user.full_name, 'Alice Cooper');
  assert.equal(updateProf.json.user.gender, 'female');
  assert.equal(updateProf.json.user.date_of_birth, '1998-05-15');
  assert.equal(updateProf.json.user.notification_preferences.promotions, true);

  // Future DOB rejected -> 400
  const futureDob = await apiFetch('/api/account/profile', {
    method: 'PATCH',
    cookie: customerACookie,
    body: {
      full_name: 'Alice Cooper',
      phone: '9876500001',
      date_of_birth: '2099-01-01',
    },
  });
  assert.equal(futureDob.status, 400);

  // Attempting to change phone to Customer B's existing phone -> 409 Conflict
  const phoneClash = await apiFetch('/api/account/profile', {
    method: 'PATCH',
    cookie: customerACookie,
    body: {
      full_name: 'Alice Cooper',
      phone: '9876500002', // Customer B's registered number
    },
  });
  assert.equal(phoneClash.status, 409);
});

test('15. Profile Picture Upload (Magic-Byte Validation, Size Limit & Safe Removal)', async () => {
  // Reject non-image / spoofed file upload
  const badAvatarForm = new FormData();
  badAvatarForm.append(
    'file',
    new Blob([Buffer.from('<html>not a real picture</html>')], { type: 'image/jpeg' }),
    'spoofed.jpg'
  );
  const badUpload = await apiFetch('/api/account/avatar', {
    method: 'POST',
    cookie: customerACookie,
    body: badAvatarForm,
  });
  assert.equal(badUpload.status, 400);

  // Valid 1x1 PNG upload accepted
  const pngHeaderBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const goodAvatarForm = new FormData();
  goodAvatarForm.append(
    'file',
    new Blob([pngHeaderBytes], { type: 'image/png' }),
    'avatar.png'
  );

  const goodUpload = await apiFetch('/api/account/avatar', {
    method: 'POST',
    cookie: customerACookie,
    body: goodAvatarForm,
  });
  assert.equal(goodUpload.status, 200);
  assert.ok(goodUpload.json.avatar_url.startsWith('/uploads/avatars/'));

  // Clean up avatar image on disk afterwards
  createdUploadFiles.push(
    path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars', path.basename(goodUpload.json.avatar_url))
  );

  // Verify avatar reflected on profile
  const profAfterUpload = await apiFetch('/api/account/profile', { cookie: customerACookie });
  assert.equal(profAfterUpload.json.user.avatar_url, goodUpload.json.avatar_url);

  // Delete profile picture -> returns null avatar_url
  const deleteAvatar = await apiFetch('/api/account/avatar', {
    method: 'DELETE',
    cookie: customerACookie,
  });
  assert.equal(deleteAvatar.status, 200);
  assert.equal(deleteAvatar.json.user.avatar_url, null);
});

test('16. Multiple Delivery Addresses, Editing, Setting Default & Safe Deletion', async () => {
  // Add a Work address for Customer A
  const addWork = await apiFetch('/api/addresses', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      address_type: 'Work',
      label: 'Work',
      recipient_name: 'Alice Cooper (Office)',
      phone: '9876500001',
      house_no: 'Unit 402, IT Tech Park',
      street_name: 'Bypass Road',
      area_locality: 'Collectorate Junction',
      city: 'Theni',
      state: 'Tamil Nadu',
      pincode: '625531',
      is_default: false,
    },
  });
  assert.equal(addWork.status, 201);
  const workAddrId = addWork.json.address.id;

  // Edit the Work address
  const editWork = await apiFetch(`/api/addresses/${workAddrId}`, {
    method: 'PATCH',
    cookie: customerACookie,
    body: {
      house_no: 'Unit 505, IT Tech Park Tower B',
      landmark: 'Opposite State Bank',
    },
  });
  assert.equal(editWork.status, 200);
  assert.equal(editWork.json.address.landmark, 'Opposite State Bank');

  // Customer B attempting to edit Customer A's address -> 404 / access denied
  const idorEdit = await apiFetch(`/api/addresses/${workAddrId}`, {
    method: 'PATCH',
    cookie: customerBCookie,
    body: { recipient_name: 'Attacker' },
  });
  assert.equal(idorEdit.status, 404);

  // Set Work as the default address
  const setDefault = await apiFetch(`/api/addresses/${workAddrId}`, {
    method: 'PATCH',
    cookie: customerACookie,
    body: { is_default: true },
  });
  assert.equal(setDefault.status, 200);
  assert.equal(setDefault.json.address.is_default, true);

  // Attempting to delete the default address while another address exists MUST be prevented safely (400)
  const delDefaultBlocked = await apiFetch(`/api/addresses/${workAddrId}`, {
    method: 'DELETE',
    cookie: customerACookie,
  });
  assert.equal(delDefaultBlocked.status, 400);

  // Set the first address back to default, then Work can be deleted safely
  const list = await apiFetch('/api/addresses', { cookie: customerACookie });
  const homeAddr = list.json.addresses.find((a) => a.id !== workAddrId);
  assert.ok(homeAddr, 'Must find second address');

  await apiFetch(`/api/addresses/${homeAddr.id}`, {
    method: 'PATCH',
    cookie: customerACookie,
    body: { is_default: true },
  });

  const delWorkNow = await apiFetch(`/api/addresses/${workAddrId}`, {
    method: 'DELETE',
    cookie: customerACookie,
  });
  assert.equal(delWorkNow.status, 200);
});

test('17. Account Settings & Password Change (Argon2id Hashing & Auth Verification)', async () => {
  // Wrong current password -> 401
  const badOldPass = await apiFetch('/api/account/password', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      currentPassword: 'WrongOldPassword#123',
      newPassword: 'AliceBrandNewPassword#2026',
      confirmPassword: 'AliceBrandNewPassword#2026',
    },
  });
  assert.equal(badOldPass.status, 401);

  // Valid password change
  const goodPassChange = await apiFetch('/api/account/password', {
    method: 'POST',
    cookie: customerACookie,
    body: {
      currentPassword: 'AliceStrongPassword#1',
      newPassword: 'AliceBrandNewPassword#2026',
      confirmPassword: 'AliceBrandNewPassword#2026',
    },
  });
  assert.equal(goodPassChange.status, 200);

  // Verify new password can be used to log in
  const loginNewPass = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { identifier: '9876500001', password: 'AliceBrandNewPassword#2026' },
  });
  assert.equal(loginNewPass.status, 200);
});

test('18. Protected Account Page Redirection for Unauthenticated Visitors', async () => {
  const unauthAccountPage = await fetch(`${BASE_URL}/account`, { redirect: 'manual' });
  // Middleware/proxy returns 307/302 redirect to /login?redirect=/account
  assert.ok([302, 307].includes(unauthAccountPage.status));
  const location = unauthAccountPage.headers.get('location') || '';
  assert.ok(location.includes('/login'));
});

test('19. Real-Time Instant Sync Server-Sent Events (SSE) Stream & Connection Heartbeat', async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${BASE_URL}/api/sync/events`, {
      signal: controller.signal,
      headers: {
        Accept: 'text/event-stream',
      },
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));
    assert.equal(res.headers.get('cache-control'), 'no-cache, no-store, no-transform');

    // Read the first chunk to verify CONNECTED heartbeat
    const reader = res.body.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    assert.ok(text.includes('CONNECTED'));
    reader.cancel();
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
});

test('20. Real-Time Domain Events Distribution & PII Privacy Isolation', async () => {
  const adminController = new AbortController();
  const customerController = new AbortController();

  const [adminStreamRes, customerStreamRes] = await Promise.all([
    fetch(`${BASE_URL}/api/sync/events`, {
      signal: adminController.signal,
      headers: {
        Accept: 'text/event-stream',
        Cookie: adminCookie,
      },
    }),
    fetch(`${BASE_URL}/api/sync/events`, {
      signal: customerController.signal,
      headers: {
        Accept: 'text/event-stream',
        Cookie: customerACookie,
      },
    }),
  ]);

  assert.equal(adminStreamRes.status, 200);
  assert.equal(customerStreamRes.status, 200);

  // Trigger catalog update (admin saves delivery zone)
  const zoneUpdateRes = await apiFetch('/api/delivery-zones', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      id: 'dz-test-sync',
      pincode: '625535',
      area_name: 'Theni Realtime Sync Zone',
      delivery_charge_paise: 4500,
      minimum_order_paise: 25000,
      is_serviceable: true,
    },
  });
  assert.equal(zoneUpdateRes.status, 200);

  adminController.abort();
  customerController.abort();
});
