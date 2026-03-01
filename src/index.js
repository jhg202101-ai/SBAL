import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { getLocale, t, interpolate } from './i18n.js';
import { i18nMiddleware } from './middleware/i18n.js';
import landingPageTemplate from './templates/landing-page.js';
import docsTemplate from './templates/docs.js';
import quickcheckTemplate from './templates/quickcheck.js';
import adminTemplate from './templates/admin.js';
import successTemplate from './templates/success.js';
import successRoute from './routes/success.js';
const PRICE_MAP = {
  "SBAL Base": { "product_id": "prod_U3yYfofIlxCxBZ", "price_id": "price_1T5qbDI7EezoPqOFiz1SzRxn" },
  "SBAL Growth": { "product_id": "prod_U3Y3lmHbe4COQ", "price_id": "price_1T5qbEI7EezoPqOFHOXW7Jdq" },
  "SBAL Enterprise": { "product_id": "prod_U3yYfoqQz4HWGk", "price_id": "price_1T5qbFI7EezoPqOF16ipfwcR" }
};
const app = new Hono();
app.use('*', cors());

// i18n: inject locale and translation function into context
i18nMiddleware(app);

let stripeSingleton = null;
function getStripe(env) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY not configured');
  if (!stripeSingleton) stripeSingleton = new Stripe(secret);
  return stripeSingleton;
}
const getPriceMap = async () => PRICE_MAP;
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
app.use('/admin/*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    c.res.headers.append('WWW-Authenticate', 'Basic realm="SBAL Admin"');
    return c.text('Admin area: please provide credentials', 401);
  }
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(':');
  const adminPassword = 'sbadmin2025';
  if (pass !== adminPassword) {
    return c.text('Invalid credentials', 401);
  }
  await next();
});
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
  const now = Math.floor(Date.now() / 1000);
  const limitKey = `rl:${customer.id}:${Math.floor(now / 60)}`;
  const kv = c.env.RATE_KV;
  const countStr = await kv.get(limitKey);
  const count = countStr ? parseInt(countStr, 10) : 0;
  if (count >= 100) return c.json({ error: 'rate_limited', message: 'Too many requests' }, 429);
  await kv.put(limitKey, (count + 1).toString(), { expirationTtl: 70 });
  await next();
});
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
app.get('/', async (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/html')) {
    const locale = c.get('locale');
    const t = c.get('t');
    const html = landingPageTemplate(locale, t);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
  }
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
  checks.version = checks.version || '1.0';
  const html = quickcheckTemplate(checks, c.get('locale'), c.get('t'));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});
app.get('/docs', (c) => {
  const locale = c.get('locale');
  const t = c.get('t');
  const html = docsTemplate(locale, t);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});
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
    const stripeCustomer = await stripe.customers.create({
      email,
      name: email.split('@')[0],
      metadata: { source: 'checkout_flow' }
    });
    const db = c.env.DB;
    const internalCustomerId = uuidv4();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(internalCustomerId, email, stripeCustomer.id, null, now);
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
    return c.json({
      success: true,
      customer_id: internalCustomerId,
      email: email,
      tier: tier,
      checkout_url: checkoutSession.url
    });
  } catch (e) {
    console.error('POST /api/v1/checkout error:', e);
    return c.json({ error: 'server_error', message: e.message }, 500);
  }
});
successRoute(app, getStripe);
app.get('/admin', async (c) => {
  const db = c.env.DB;
  const customers = await db.prepare(`
    SELECT id, email, stripe_customer_id, api_key, created_at FROM customers ORDER BY created_at DESC LIMIT 50
  `).all();
  const tiers = [
    { name: 'SBAL Base', amount: '$99', link: PAYMENT_LINKS['SBAL Base'].url },
    { name: 'SBAL Growth', amount: '$299', link: PAYMENT_LINKS['SBAL Growth'].url },
    { name: 'SBAL Enterprise', amount: '$999', link: PAYMENT_LINKS['SBAL Enterprise'].url }
  ];
  const html = adminTemplate(customers, tiers, c.get('locale'), c.get('t'));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
});
app.post('/admin/create-customer-and-link', async (c) => {
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
    const priceId = PRICE_MAP[tier].price_id;
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        customer_id: internalCustomerId,
        email: email,
        tier: tier
      },
    });
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
app.get('/admin/generate-link', async (c) => {
  const { price_id } = c.req.query();
  if (!price_id) {
    return c.json({ error: 'Missing price_id' }, 400);
  }
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
app.post('/api/v1/usage_records', async (c) => {
  try {
    const { subscription_item_id, quantity, timestamp, description } = await c.req.json();
    if (!subscription_item_id || !quantity) return c.json({ error: 'validation_error', message: 'subscription_item_id and quantity required' }, 400);
    const db = c.env.DB;
    const envSecret = c.env.STRIPE_SECRET_KEY;
    if (!envSecret) return c.json({ error: 'config_error', message: 'Stripe secret not configured' }, 500);
    const itemResp = await fetch(`https://api.stripe.com/v1/subscription_items/${subscription_item_id}`, {
      headers: { 'Authorization': `Bearer ${envSecret}` },
    });
    const itemData = await itemResp.json();
    if (!itemResp.ok) throw new Error(itemData.error?.message || 'Failed to fetch subscription item');
    const stripeSubId = itemData.subscription;
    if (!stripeSubId) return c.json({ error: 'invalid_item', message: 'Subscription item has no subscription' }, 400);
    const subRow = await db.prepare(`
      SELECT s.id FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.stripe_subscription_id = ? AND c.id = ?
    `).bind(stripeSubId, c.get('customer_id')).first();
    let subscriptionInternalId = subRow?.id || null;
    const ts = timestamp ? Math.floor(new Date(timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const body = new URLSearchParams({ quantity: parseInt(quantity).toString(), timestamp: ts.toString(), action: 'set' });
    const response = await fetch(`https://api.stripe.com/v1/subscription_items/${subscription_item_id}/usage_records`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${envSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });
    const usageRecord = await response.json();
    if (!response.ok) throw new Error(usageRecord.error?.message || 'Stripe API error');
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
app.post('/checkout', async (c) => {
  try {
    const { email, tier } = await c.req.json();
    if (!email || !tier) return c.json({ error: 'missing_fields', message: 'email and tier required' }, 400);
    if (!PRICE_MAP[tier]) return c.json({ error: 'invalid_tier', message: 'Invalid tier' }, 400);
    const stripe = getStripe(c.env);
    const stripeCustomer = await stripe.customers.create({
      email,
      name: email.split('@')[0],
      metadata: { source: 'checkout' }
    });
    const db = c.env.DB;
    const internalId = uuidv4();
    const apiKey = 'sk_' + uuidv4().replace(/-/g, '');
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO customers (id, email, stripe_customer_id, api_key, created_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(internalId, email, stripeCustomer.id, apiKey, now);
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
export default app;
