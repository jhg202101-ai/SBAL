// SBAL - Stripe Billing Abstraction Layer
// Phases 3-6 + Commerce (Admin UI, Payment Links, HTML QuickCheck)
// ESM + Hono

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

// i18n support
import { getLocale, t, interpolate } from './i18n.js';
import landingPageTemplate from './templates/landing-page.js';
import docsTemplate from './templates/docs.js';

// Inline price mapping from stripe_ids.json (copied at build time)
const PRICE_MAP = {
  "SBAL Base": { "product_id": "prod_U3yYfofIlxCxBZ", "price_id": "price_1T5qbDI7EezoPqOFiz1SzRxn" },
  "SBAL Growth": { "product_id": "prod_U3Y3lmHbe4COQ", "price_id": "price_1T5qbEI7EezoPqOFHOXW7Jdq" },
  "SBAL Enterprise": { "product_id": "prod_U3yYfoqQz4HWGk", "price_id": "price_1T5qbFI7EezoPqOF16ipfwcR" }
};

const app = new Hono();

// CORS
app.use('*', cors());

// Stripe client
let stripeSingleton = null;
function getStripe(env) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY not configured');
  if (!stripeSingleton) stripeSingleton = new Stripe(secret);
  return stripeSingleton;
}

// Price mapping (inline from stripe_ids.json)
const getPriceMap = async () => PRICE_MAP;

// Pre-generated payment links (from bootstrap or manual creation)
// These are fixed links for each tier - do not regenerate per request
const PAYMENT_LINKS = {
  "SBAL Base": {
    "url": "https://buy.stripe.com/test_3cI9ATbEx9W85j3eu9c3m01",
    "price_id": PRICE_MAP["SBAL Base"]?.price_id
  },
  "SBAL Growth": {
    "url": "https://buy.stripe.com/test_eVqaEXfUN6JW5j371Hc3m02",
    "price_id": PRICE_MAP["SBAL Growth"]?.price_id
  },
  "SBAL Enterprise": {
    "url": "https://buy.stripe.com/test_00wbJ1381fgscLvdq5c3m03",
    "price_id": PRICE_MAP["SBAL Enterprise"]?.price_id
  }
};

// Middleware: Admin Basic Auth (for now hardcoded, will move to env later)
app.use('/admin/*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    c.res.headers.append('WWW-Authenticate', 'Basic realm="SBAL Admin"');
    return c.text('Admin area: please provide credentials', 401);
  }
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(':');
  // Temporary hardcoded password for testing
  const adminPassword = 'sbadmin2025';
  if (pass !== adminPassword) {
    return c.text('Invalid credentials', 401);
  }
  await next();
});

// Middleware: API Key Auth + Rate Limit (same as before)
app.use('/api/v1/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/v1/webhooks/') || path.startsWith('/api/v1/quickcheck') || path === '/api/v1/checkout' || path === '/success') {
    return await next();
  }
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'auth_required', message: 'Missing Authorization header' }, 401);
  }
  const apiKey = authHeader.slice(7).trim();
  const db = c.env.DB;
  const customer = await db.prepare(`SELECT id, email FROM customers WHERE api_key = ?`).bind(apiKey).first();
  if (!customer) return c.json({ error: 'invalid_api_key', message: 'Invalid API key' }, 401);
  c.set('customer_id', customer.id);
  c.set('customer_email', customer.email);

  // Rate limit (100 req/min)
  const now = Math.floor(Date.now() / 1000);
  const limitKey = `rl:${customer.id}:${Math.floor(now / 60)}`;
  const kv = c.env.RATE_KV;
  const countStr = await kv.get(limitKey);
  const count = countStr ? parseInt(countStr, 10) : 0;
  if (count >= 100) return c.json({ error: 'rate_limited', message: 'Too many requests' }, 429);
  await kv.put(limitKey, (count + 1).toString(), { expirationTtl: 70 });

  await next();
});

// Middleware: Auto logging
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const pathname = new URL(c.req.url).pathname;
  const cfRequestId = c.req.header('cf-request-id') || '';
  await next();
  const status = c.res.status;
  const latency = Date.now() - start;
  const customer_id = c.get('customer_id') || '';
  try {
    const db = c.env.DB;
    await db.prepare(`INSERT INTO api_logs (customer_id, endpoint, method, status_code, latency_ms, cf_request_id) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(customer_id, pathname, method, status, latency, cfRequestId);
  } catch (e) {
    console.error('Logging failed:', e);
  }
});

// Public Health or Landing Page (with i18n)
app.get('/', async (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/html')) {
    const locale = getLocale(c.req);
    const html = landingPageTemplate(locale, (key, params) => t(locale, key, params));
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
  }
  // JSON health response for monitors
  const checks = { status: 'ok', service: 'SBAL', timestamp: new Date().toISOString() };
  try {
    const db = c.env.DB;
    const res = await db.prepare('SELECT 1 as test').first();
    checks.d1 = !!res.test;
  } catch (e) { checks.d1 = false; }
  try { const stripe = getStripe(c.env); const acc = await stripe.account.retrieve(); checks.stripe = !!acc.id; } catch (e) { checks.stripe = false; }
  if (!checks.d1 || !checks.stripe) checks.status = 'degraded';
  return c.json(checks);
});

// HTML QuickCheck (dashboard)
app.get('/api/v1/quickcheck', async (c) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    d1: false,
    stripe: false,
    version: '1.0',
  };
  try {
    const db = c.env.DB;
    const res = await db.prepare('SELECT 1 as test').first();
    checks.d1 = res && res.test === 1;
  } catch (e) {
    checks.status = 'degraded';
  }
  try {
    const stripe = getStripe(c.env);
    const account = await stripe.account.retrieve();
    checks.stripe = !!account.id;
  } catch (e) {
    checks.status = 'degraded';
  }
  if (!checks.d1 || !checks.stripe) checks.status = 'degraded';

  // HTML response
  const color = checks.status === 'ok' ? '#2ecc71' : '#e74c3c';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SBAL QuickCheck</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
    .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
    h1 { color: #333; margin-top: 0; }
    .status { display: inline-block; padding: 10px 20px; border-radius: 4px; color: white; background: ${color}; font-weight: bold; margin: 10px 0; }
    .check { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
    .ok { color: #2ecc71; font-weight: bold; }
    .fail { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>SBAL System Status</h1>
    <div class="status">${checks.status.toUpperCase()}</div>
    <p><strong>Timestamp:</strong> ${checks.timestamp}</p>
    <p><strong>Version:</strong> ${checks.version}</p>
    <div class="check">
      <strong>D1 Connectivity:</strong> <span class="${checks.d1 ? 'ok' : 'fail'}">${checks.d1 ? '✅ Connected' : '❌ Failed'}</span>
    </div>
    <div class="check">
      <strong>Stripe Connectivity:</strong> <span class="${checks.stripe ? 'ok' : 'fail'}">${checks.stripe ? '✅ Connected' : '❌ Failed'}</span>
    </div>
  </div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});

// Documentation Page (/docs, i18n)
app.get('/docs', (c) => {
  const locale = getLocale(c.req);
  const html = docsTemplate(locale, (key, params) => t(locale, key, params));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});

// ============================================
// Checkout & Payment Flow (Improved UX)
// ============================================

// POST /api/v1/checkout - Create customer and return payment link with client_reference_id
app.post('/api/v1/checkout', async (c) => {
  try {
    const { email, tier } = await c.req.json();
    if (!email || !tier) {
      return c.json({ error: 'validation_error', message: 'email and tier required' }, 400);
    }

    const validTiers = ['SBAL Base', 'SBAL Growth', 'SBAL Enterprise'];
    if (!validTiers.includes(tier)) {
      return c.json({ error: 'invalid_tier', message: 'Invalid tier' }, 400);
    }

    const stripe = getStripe(c.env);

    // 1. Create Stripe Customer
    const stripeCustomer = await stripe.customers.create({
      email,
      name: email.split('@')[0],
      metadata: { source: 'checkout_flow' }
    });

    // 2. Create D1 customer record (without api_key until payment succeeds)
    const db = c.env.DB;
    const internalCustomerId = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(internalCustomerId, email, stripeCustomer.id, null, now);

    // 3. Create Checkout Session (not Payment Link) to include client_reference_id
    const priceId = PRICE_MAP[tier].price_id;
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: internalCustomerId, // 🎯 Critical: maps Stripe events back to D1 customer_id
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      return_url: `https://sbale-production.jhg202101.workers.dev/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        tier: tier,
        internal_customer_id: internalCustomerId
      }
    });

    // 4. Return checkout URL to frontend (client will redirect)
    return c.json({
      success: true,
      customer_id: internalCustomerId,
      email: email,
      tier: tier,
      checkout_url: checkoutSession.url
      // Note: API key will be available AFTER payment succeeds (via /success)
    });
  } catch (e) {
    console.error('POST /api/v1/checkout error:', e);
    return c.json({ error: 'server_error', message: e.message }, 500);
  }
});

// --- Admin UI ---

// Admin Dashboard

// Admin Dashboard
app.get('/admin', async (c) => {
  const db = c.env.DB;
  const customers = await db.prepare(`
    SELECT id, email, stripe_customer_id, api_key, created_at FROM customers ORDER BY created_at DESC LIMIT 50
  `).all();

  // Build static payment links table
  const tiers = [
    { name: 'SBAL Base', amount: '$99', link: PAYMENT_LINKS['SBAL Base'].url },
    { name: 'SBAL Growth', amount: '$299', link: PAYMENT_LINKS['SBAL Growth'].url },
    { name: 'SBAL Enterprise', amount: '$999', link: PAYMENT_LINKS['SBAL Enterprise'].url }
  ];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SBAL Admin</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
    .container { max-width: 1200px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007bff; color: white; }
    tr:hover { background: #f5f5f5; }
    .copy-btn { padding: 6px 10px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .copy-btn:hover { background: #138496; }
    .link-cell { font-family: monospace; font-size: 12px; word-break: break-all; max-width: 300px; }
    h1, h2 { color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SBAL Admin Dashboard</h1>

    <h2>📋 Payment Links (Fixed - Copy & Send to Customers)</h2>
    <table>
      <tr><th>方案</th><th>价格</th><th>支付链接 (点击复制)</th></tr>
      ${tiers.map(t => `
        <tr>
          <td>${t.name}</td>
          <td>${t.amount}</td>
          <td class="link-cell">
            <a href="${t.link}" target="_blank">${t.link}</a>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${t.link}').then(()=>alert('Copied!'))">Copy</button>
          </td>
        </tr>
      `).join('')}
    </table>

    <h2>👥 Customers (latest 50)</h2>
    <table>
      <tr><th>ID</th><th>Email</th><th>Stripe Customer ID</th><th>API Key</th><th>Created</th></tr>
      ${customers.rows ? customers.rows.map(c => `
        <tr>
          <td>${c.id.substring(0,8)}...</td>
          <td>${c.email}</td>
          <td>${c.stripe_customer_id.substring(0,12)}...</td>
          <td>${c.api_key.substring(0,10)}...</td>
          <td>${c.created_at}</td>
        </tr>
      `).join('') : '<tr><td colspan="5">No customers yet.</td></tr>'}
    </table>
  </div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});

// Generate Payment Link (NEW FLOW: create customer then dynamic payment link)
app.post('/admin/create-customer-and-link', async (c) => {
  try {
    const { email, tier } = await c.req.json();
    if (!email || !tier) {
      return c.json({ error: 'validation_error', message: 'email and tier required' }, 400);
    }

    // Validate tier
    const validTiers = ['SBAL Base', 'SBAL Growth', 'SBAL Enterprise'];
    if (!validTiers.includes(tier)) {
      return c.json({ error: 'invalid_tier', message: 'Invalid tier' }, 400);
    }

    // 1. Create Customer in D1 and Stripe
    const stripe = getStripe(c.env);
    const stripeCustomer = await stripe.customers.create({
      email,
      name: email.split('@')[0],
      metadata: { source: 'admin_panel' }
    });

    const db = c.env.DB;
    const internalCustomerId = uuidv4();
    const apiKey = 'sk_' + uuidv4().replace(/-/g, '');
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(internalCustomerId, email, stripeCustomer.id, apiKey, now);

    // 2. Create Payment Link for this specific customer
    const priceId = PRICE_MAP[tier].price_id;
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        customer_id: internalCustomerId,
        email: email,
        tier: tier
      },
      // Optional: after_completion could redirect to a thank you page
    });

    // 3. Return the link
    return c.json({
      success: true,
      customer_id: internalCustomerId,
      email: email,
      tier: tier,
      payment_link: paymentLink.url,
      payment_link_id: paymentLink.id,
      api_key: apiKey,
      message: 'Customer created and payment link generated'
    });
  } catch (e) {
    console.error('POST /admin/create-customer-and-link error:', e);
    return c.json({ error: 'server_error', message: e.message }, 500);
  }
});

// Generate Payment Link (legacy - returns pre-generated fixed link based on price_id)
app.get('/admin/generate-link', async (c) => {
  const { price_id } = c.req.query();
  if (!price_id) {
    return c.json({ error: 'Missing price_id' }, 400);
  }

  // Find which tier matches this price_id
  const tier = Object.keys(PAYMENT_LINKS).find(t => PAYMENT_LINKS[t].price_id === price_id);
  if (!tier) {
    return c.json({ error: 'Unknown price_id' }, 404);
  }

  const linkUrl = PAYMENT_LINKS[tier].url;
  return c.json({
    success: true,
    url: linkUrl,
    tier,
    price_id,
    note: 'Pre-generated fixed payment link (legacy)'
  });
});

// --- Core APIs (unchanged) ---

// POST /api/v1/customers
app.post('/api/v1/customers', async (c) => {
  try {
    const { email, name } = await c.req.json();
    if (!email) return c.json({ error: 'validation_error', message: 'email required' }, 400);
    const internalId = uuidv4();
    const stripe = getStripe(c.env);
    const customer = await stripe.customers.create({
      email,
      name: name || '',
      metadata: { internal_id: internalId }
    });
    const db = c.env.DB;
    const now = new Date().toISOString();
    const apiKey = 'sk_' + uuidv4().replace(/-/g, '');
    await db.prepare(`INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(internalId, email, customer.id, apiKey, now);
    return c.json({ customer_id: internalId, stripe_customer_id: customer.id }, 201);
  } catch (e) {
    console.error('POST /api/v1/customers error:', e);
    return c.json({ error: 'stripe_error', message: e.message, code: e.type || 'unknown' }, e.statusCode || 500);
  }
});

// POST /api/v1/subscriptions
app.post('/api/v1/subscriptions', async (c) => {
  try {
    const { customer_id, plan_id, quantity = 1, trial_days = 0 } = await c.req.json();
    if (!customer_id || !plan_id) return c.json({ error: 'validation_error', message: 'customer_id and plan_id required' }, 400);
    const requestingCustomerId = c.get('customer_id');
    if (requestingCustomerId && requestingCustomerId !== customer_id) {
      return c.json({ error: 'forbidden', message: 'Cannot access other customers' }, 403);
    }
    const db = c.env.DB;
    const customerRow = await db.prepare(`SELECT stripe_customer_id FROM customers WHERE id = ?`).bind(customer_id).first();
    if (!customerRow) return c.json({ error: 'not_found', message: 'customer not found' }, 404);
    const stripe = getStripe(c.env);
    const subscription = await stripe.subscriptions.create({
      customer: customerRow.stripe_customer_id,
      items: [{ price: plan_id, quantity: parseInt(quantity) }],
      trial_period_days: parseInt(trial_days),
    });
    const subInternalId = uuidv4();
    const now = new Date().toISOString();
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
    await db.prepare(`
      INSERT INTO subscriptions (id, customer_id, stripe_subscription_id, stripe_price_id, status, current_period_end, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(subInternalId, customer_id, subscription.id, plan_id, subscription.status, periodEnd, now);
    return c.json({ subscription_id: subInternalId, status: subscription.status, current_period_end: subscription.current_period_end }, 201);
  } catch (e) {
    console.error('POST /api/v1/subscriptions error:', e);
    return c.json({ error: 'stripe_error', message: e.message, code: e.type || 'unknown' }, e.statusCode || 500);
  }
});

// GET /api/v1/subscriptions/:id
app.get('/api/v1/subscriptions/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const db = c.env.DB;
    const row = await db.prepare(`SELECT s.* FROM subscriptions s JOIN customers c ON s.customer_id = c.id WHERE s.id = ? AND c.id = ?`)
      .bind(id, c.get('customer_id')).first();
    if (!row) return c.json({ error: 'not_found', message: 'subscription not found' }, 404);
    return c.json(row);
  } catch (e) {
    console.error('GET /api/v1/subscriptions/:id error:', e);
    return c.json({ error: 'server_error', message: e.message }, 500);
  }
});

// POST /api/v1/usage_records
app.post('/api/v1/usage_records', async (c) => {
  try {
    const { subscription_item_id, quantity, timestamp, description } = await c.req.json();
    if (!subscription_item_id || !quantity) return c.json({ error: 'validation_error', message: 'subscription_item_id and quantity required' }, 400);
    const db = c.env.DB;
    const envSecret = c.env.STRIPE_SECRET_KEY;
    if (!envSecret) return c.json({ error: 'config_error', message: 'Stripe secret not configured' }, 500);

    // Get subscription item info
    const itemResp = await fetch(`https://api.stripe.com/v1/subscription_items/${subscription_item_id}`, {
      headers: { 'Authorization': `Bearer ${envSecret}` },
    });
    const itemData = await itemResp.json();
    if (!itemResp.ok) throw new Error(itemData.error?.message || 'Failed to fetch subscription item');
    const stripeSubId = itemData.subscription;
    if (!stripeSubId) return c.json({ error: 'invalid_item', message: 'Subscription item has no subscription' }, 400);

    // Verify ownership
    const subRow = await db.prepare(`
      SELECT s.id FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.stripe_subscription_id = ? AND c.id = ?
    `).bind(stripeSubId, c.get('customer_id')).first();
    let subscriptionInternalId = subRow?.id || null;

    // Create usage record via Stripe REST
    const ts = timestamp ? Math.floor(new Date(timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const body = new URLSearchParams({ quantity: parseInt(quantity).toString(), timestamp: ts.toString(), action: 'set' });
    const response = await fetch(`https://api.stripe.com/v1/subscription_items/${subscription_item_id}/usage_records`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${envSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });
    const usageRecord = await response.json();
    if (!response.ok) throw new Error(usageRecord.error?.message || 'Stripe API error');

    // Save audit
    const recordId = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO usage_records (id, subscription_id, stripe_subscription_item_id, quantity, recorded_at, stripe_usage_record_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(recordId, subscriptionInternalId, subscription_item_id, parseInt(quantity), now, usageRecord.id, description || '');

    return c.json({ record_id: recordId, submitted_at: usageRecord.id }, 201);
  } catch (e) {
    console.error('POST /api/v1/usage_records error:', e);
    return c.json({ error: 'stripe_error', message: e.message, code: e.type || 'unknown' }, e.statusCode || 500);
  }
});

// Webhook endpoint
app.post('/api/v1/webhooks/stripe', async (c) => {
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return c.json({ error: 'config_error', message: 'Webhook secret missing' }, 500);
  const body = await c.req.text();
  const signature = c.req.header('Stripe-Signature');
  if (!signature) return c.json({ error: 'auth_error', message: 'Missing Stripe-Signature header' }, 401);
  let event;
  try {
    const stripe = getStripe(c.env);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    try {
      const db = c.env.DB;
      await db.prepare(`INSERT INTO webhook_failures (event_id, customer_id, attempt_count, last_error, next_retry_at, created_at) VALUES (?, ?, ?, ?, datetime('now', '+1 hour'), datetime('now'))`)
        .bind('unknown', null, 1, `signature_failed: ${err.message}`);
    } catch (dbErr) { console.error('Failed to log webhook failure:', dbErr); }
    return c.json({ error: 'signature_invalid', message: 'Webhook signature verification failed' }, 401);
  }
  try {
    await handleWebhookEvent(c.env.DB, event);
  } catch (procErr) {
    console.error('Error processing webhook:', procErr);
    try {
      const db = c.env.DB;
      await db.prepare(`INSERT INTO webhook_failures (event_id, customer_id, attempt_count, last_error, next_retry_at, created_at) VALUES (?, ?, ?, ?, datetime('now', '+1 hour'), datetime('now'))`)
        .bind(event.id, event.data.object.customer || null, 1, procErr.message);
    } catch (dbErr) { console.error('Failed to log webhook processing error:', dbErr); }
  }
  return c.json({ received: true, event: event.type, event_id: event.id }, 200);
});

async function handleWebhookEvent(db, event) {
  const eventType = event.type;
  const data = event.data.object;
  console.log(`Processing webhook: ${eventType} (id: ${event.id})`);
  switch (eventType) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const stripeSubId = data.id;
      const status = data.status;
      const periodEnd = data.cancel_at_period_end ? data.ended_at_timestamp : data.current_period_end;
      const now = new Date().toISOString();
      const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      const result = await db.prepare(`UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = ? WHERE stripe_subscription_id = ?`)
        .bind(status, periodEndIso, now, stripeSubId);
      if (result.changes === 0) console.warn(`No subscription found for ${stripeSubId}`);
      else console.log(`✅ Subscription ${stripeSubId} updated: ${status}`);
      break;
    case 'invoice.payment_succeeded':
      console.log(`✅ Payment succeeded for invoice ${data.id} (amount: ${data.amount_paid})`);
      // Generate API key for the customer if not already set
      const stripeCustomerId = data.customer;
      if (stripeCustomerId) {
        const customerRow = await db.prepare(
          'SELECT id, api_key FROM customers WHERE stripe_customer_id = ?'
        ).bind(stripeCustomerId).first();
        if (customerRow && !customerRow.api_key) {
          const newApiKey = 'sk_' + uuidv4().replace(/-/g, '');
          await db.prepare(
            'UPDATE customers SET api_key = ? WHERE id = ?'
          ).bind(newApiKey, customerRow.id);
          console.log(`🔑 API key generated for customer ${customerRow.id}`);
        }
      }
      break;
    case 'invoice.payment_failed':
      const reason = data.last_payment_error?.message || 'unknown';
      await db.prepare(`INSERT INTO webhook_failures (event_id, customer_id, attempt_count, last_error, next_retry_at, created_at) VALUES (?, ?, ?, ?, datetime('now', '+1 day'), datetime('now'))`)
        .bind(data.id, data.customer, 1, `payment_failed: ${reason}`);
      console.log(`❌ Payment failed for invoice ${data.id}: ${reason}`);
      break;
    default:
      console.log(`ℹ️  Unhandled webhook: ${eventType}`);
  }
}


// --- NEW: Checkout API ---
app.post('/checkout', async (c) => {
  try {
    const { email, tier } = await c.req.json();
    if (!email || !tier) return c.json({ error: 'missing_fields', message: 'email and tier required' }, 400);
    if (!PRICE_MAP[tier]) return c.json({ error: 'invalid_tier', message: 'Invalid tier' }, 400);

    const stripe = getStripe(c.env);
    // Create Stripe Customer
    const stripeCustomer = await stripe.customers.create({
      email,
      name: email.split('@')[0],
      metadata: { source: 'checkout' }
    });

    // Save to D1
    const db = c.env.DB;
    const internalId = uuidv4();
    const apiKey = 'sk_' + uuidv4().replace(/-/g, '');
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(internalId, email, stripeCustomer.id, apiKey, now);

    // Create Payment Link with after_completion redirect
    const priceId = PRICE_MAP[tier].price_id;
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { customer_id: internalId, email, tier },
      after_completion: {
        type: 'redirect',
        redirect: { url: `https://sbale-production.jhg202101.workers.dev/success?customer_id=${internalId}` }
      }
    });

    return c.json({
      success: true,
      payment_link: paymentLink.url,
      customer_id: internalId,
      api_key: apiKey
    });
  } catch (e) {
    console.error('POST /api/v1/checkout error:', e);
    return c.json({ error: 'server_error', message: e.message }, 500);
  }
});

// --- NEW: Success Page ---
// GET /success - Payment success page (displays API key only after verification)
app.get('/success', async (c) => {
  const { session_id } = c.req.query();
  const locale = getLocale(c.req);
  // Localized strings (fallback to en)
  const missingSessionTitle = locale === 'zh-TW' ? '缺少 session ID' : 'Missing session ID';
  const missingSessionMsg = locale === 'zh-TW' ? '請聯繫支援團隊' : 'Please contact support if this problem persists.';
  const pendingTitle = t(locale, 'pending.title');
  const pendingMsg = t(locale, 'pending.message');
  const pendingCloseHint = t(locale, 'pending.closeHint');
  const pendingBackHome = t(locale, 'pending.backToHome');
  const finalizingTitle = t(locale, 'finalizing.title');
  const finalizingMsg = t(locale, 'finalizing.message');
  const finalizingWaitHint = t(locale, 'finalizing.waitHint');
  const finalizingRefresh = t(locale, 'finalizing.refresh');
  const successTitle = t(locale, 'success.title');
  const successWelcome = (email) => t(locale, 'success.welcome', { email });
  const successApiKeyLabel = t(locale, 'success.apiKeyLabel');
  const successApiKeyHint = t(locale, 'success.apiKeyHint');
  const successReadDocs = t(locale, 'success.readDocs');
  const successBackHome = t(locale, 'success.backHome');
  const successNeedHelp = t(locale, 'success.needHelp');

  if (!session_id) {
    return c.html(`<!DOCTYPE html>
<html lang="${locale}">
<head><title>Error</title></head>
<body>
  <h1>${missingSessionTitle}</h1>
  <p>${missingSessionMsg}</p>
</body>
</html>`);
  }

  try {
    // Retrieve Checkout Session from Stripe
    const stripe = getStripe(c.env);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify payment status
    if (session.payment_status !== 'paid') {
      const pendingHtml = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pendingTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-yellow-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
    <div class="text-5xl mb-4">⏳</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">${pendingTitle}</h1>
    <p class="text-gray-600 mb-6">${pendingMsg}</p>
    <p class="text-sm text-gray-500 mb-4">${pendingCloseHint}</p>
    <a href="/" class="text-blue-600 hover:underline">${pendingBackHome}</a>
  </div>
</body>
</html>`;
      return new Response(pendingHtml, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
    }

    // Get D1 customer_id from client_reference_id
    const d1CustomerId = session.client_reference_id;
    if (!d1CustomerId) {
      throw new Error('Checkout session missing client_reference_id');
    }

    // Fetch customer from D1
    const db = c.env.DB;
    const customer = await db.prepare(
      'SELECT id, email, api_key, created_at FROM customers WHERE id = ?'
    ).bind(d1CustomerId).first();

    if (!customer) {
      throw new Error('Customer not found in D1');
    }

    // Ensure API key exists (must have been set by webhook)
    if (!customer.api_key) {
      const processingHtml = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalizingTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-blue-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
    <div class="text-5xl mb-4">🔐</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">${finalizingTitle}</h1>
    <p class="text-gray-600 mb-6">${finalizingMsg}</p>
    <p class="text-sm text-gray-500 mb-4">${finalizingWaitHint}</p>
    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">${finalizingRefresh}</button>
  </div>
</body>
</html>`;
      return new Response(processingHtml, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
    }

    // Render success page with API key
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${successTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
    <div class="text-5xl mb-4">🎉</div>
    <h1 class="text-3xl font-bold text-gray-800 mb-2">${successTitle}</h1>
    <p class="text-gray-600 mb-6">${successWelcome(customer.email)}</p>

    <div class="bg-gray-100 rounded-lg p-4 mb-6 text-left">
      <p class="text-sm text-gray-500 mb-1">${successApiKeyLabel}</p>
      <code class="text-lg font-mono break-all">${customer.api_key}</code>
      <p class="text-xs text-gray-500 mt-2">${successApiKeyHint}</p>
    </div>

    <div class="space-y-3">
      <a href="/docs" class="block bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">${successReadDocs}</a>
      <a href="/" class="block border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50">${successBackHome}</a>
    </div>

    <p class="mt-6 text-xs text-gray-400">${successNeedHelp}</p>
  </div>
</body>
</html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
  } catch (e) {
    console.error('/success error:', e);
    const errorTitle = locale === 'zh-TW' ? '無法驗證付款' : 'Unable to verify payment';
    return c.html(`<!DOCTYPE html>
<html>
<head><title>${errorTitle}</title></head>
<body>
  <h1>${errorTitle}</h1>
  <p>Error: ${e.message}</p>
  <p>Please contact support.</p>
</body>
</html>`);
  }
});

export default app;
