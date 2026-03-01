// SBAL Stripe Infrastructure Bootstrap (ESM)
// Automates Product/Price creation and Webhook registration

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Load .env manually (supports export KEY="value")
const homeDir = process.env.HOME || '/home/ubuntu';
const envPath = join(homeDir, '.openclaw', '.env');
const envContent = await readFile(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  let match = line.match(/^export\s+([^=]+)=(.*)$/);
  if (!match) match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const stripeSecretKey = envVars.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not set in .env');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);
const workerUrl = envVars.WORKER_URL;

// Products configuration
const PRODUCTS = [
  { name: 'SBAL Base', description: 'Stripe Billing Abstraction Layer - Base Tier', price: 99 },
  { name: 'SBAL Growth', description: 'SBAL - Growth Tier', price: 299 },
  { name: 'SBAL Enterprise', description: 'SBAL - Enterprise Tier', price: 999 },
];

async function createProducts() {
  console.log('🚀 Creating products and prices...');
  const ids = {};

  for (const prod of PRODUCTS) {
    // Search existing product by name
    let product = await stripe.products.search({
      query: `name:"${prod.name}"`,
      limit: 1,
    }).then(res => res.data[0]).catch(() => null);

    if (!product) {
      product = await stripe.products.create({
        name: prod.name,
        description: prod.description,
        active: true,
      });
      console.log(`   ✅ Product created: ${product.name} (${product.id})`);
    } else {
      console.log(`   ℹ️  Product exists: ${product.name} (${product.id})`);
    }

    // Create price (recurring monthly)
    const price = await stripe.prices.create({
      unit_amount: prod.price * 100,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: product.id,
      active: true,
    });
    console.log(`   💰 Price created: $${prod.price}/mo (${price.id})`);

    ids[prod.name] = { product_id: product.id, price_id: price.id };
  }

  // Save to stripe_ids.json
  const idsPath = join(process.cwd(), 'stripe_ids.json');
  await writeFile(idsPath, JSON.stringify(ids, null, 2));
  console.log('📁 Product/Price IDs saved to stripe_ids.json');

  return ids;
}

async function registerWebhook() {
  if (!workerUrl) {
    console.warn('⚠️  WORKER_URL not set in .env. Skipping webhook registration.');
    console.warn('   Set WORKER_URL after deployment, then rerun this script.');
    return null;
  }

  console.log('\n🔗 Registering webhook endpoint...');
  const endpointUrl = `${workerUrl.replace(/\/$/, '')}/api/v1/webhooks/stripe`;

  // Check existing endpoints
  const existing = await stripe.webhookEndpoints.list({ limit: 50 });
  const dup = existing.data.find(e => e.url === endpointUrl);
  if (dup) {
    console.log(`   ℹ️  Webhook endpoint already exists: ${dup.id} (URL: ${endpointUrl})`);
    if (!envVars.STRIPE_WEBHOOK_SECRET) {
      await appendEnv('STRIPE_WEBHOOK_SECRET', dup.secret);
    }
    return dup;
  }

  // Create new endpoint
  const endpoint = await stripe.webhookEndpoints.create({
    url: endpointUrl,
    enabled_events: [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'payment_intent.succeeded',
    ],
  });
  console.log(`   ✅ Webhook endpoint created: ${endpoint.id} (URL: ${endpointUrl})`);

  // Append secret to .env
  await appendEnv('STRIPE_WEBHOOK_SECRET', endpoint.secret);
  console.log('   🔐 WEBHOOK_SECRET appended to ~/.openclaw/.env');

  return endpoint;
}

async function appendEnv(key, value) {
  const envPath = join(homeDir, '.openclaw', '.env');
  const content = await readFile(envPath, 'utf8');
  if (!content.includes(key)) {
    await writeFile(envPath, content + `\n${key}=${value}\n`);
  }
}

// Main
(async () => {
  try {
    const ids = await createProducts();
    const webhook = await registerWebhook();

    console.log('\n✅ Bootstrap complete!');
    console.log('Products & Prices created.');
    if (webhook) {
      console.log(`Webhook: ${webhook.url} (secret saved)`);
    } else {
      console.log('Webhook: skipped (set WORKER_URL to register)');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  }
})();
