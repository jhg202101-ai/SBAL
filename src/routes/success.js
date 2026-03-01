// Success page route handler (i18n aware)
import successTemplate from '../templates/success.js';

export default function successRoute(app, getStripe) {
  app.get('/success', async (c) => {
    const { session_id } = c.req.query();
    const locale = c.get('locale');
    const t = c.get('t');

    if (!session_id) {
      return c.html(`<!DOCTYPE html>
<html lang="${locale}">
<head><title>${t('pending.title') || 'Error'}</title></head>
<body>
  <h1>${locale === 'zh-TW' ? '缺少 session ID' : 'Missing session ID'}</h1>
  <p>${locale === 'zh-TW' ? '請聯繫支援團隊' : 'Please contact support.'}</p>
</body>
</html>`);
    }

    try {
      const stripe = getStripe(c.env);
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status !== 'paid') {
        return c.html(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('pending.title')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-yellow-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
    <div class="text-5xl mb-4">⏳</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">${t('pending.title')}</h1>
    <p class="text-gray-600 mb-6">${t('pending.message')}</p>
    <p class="text-sm text-gray-500 mb-4">${t('pending.closeHint')}</p>
    <a href="/" class="text-blue-600 hover:underline">${t('pending.backToHome')}</a>
  </div>
</body>
</html>`);
      }

      const d1CustomerId = session.client_reference_id;
      if (!d1CustomerId) throw new Error('Checkout session missing client_reference_id');

      const db = c.env.DB;
      const customer = await db.prepare('SELECT id, email, api_key, created_at FROM customers WHERE id = ?')
        .bind(d1CustomerId).first();

      if (!customer) throw new Error('Customer not found in D1');

      if (!customer.api_key) {
        return c.html(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('finalizing.title')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-blue-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
    <div class="text-5xl mb-4">🔐</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">${t('finalizing.title')}</h1>
    <p class="text-gray-600 mb-6">${t('finalizing.message')}</p>
    <p class="text-sm text-gray-500 mb-4">${t('finalizing.waitHint')}</p>
    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">${t('finalizing.refresh')}</button>
  </div>
</body>
</html>`);
      }

      const html = successTemplate(customer, locale, t);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
    } catch (e) {
      console.error('/success error:', e);
      return c.html(`<!DOCTYPE html>
<html lang="${locale}">
<head><title>Error</title></head>
<body>
  <h1>${locale === 'zh-TW' ? '無法驗證付款' : 'Unable to verify payment'}</h1>
  <p>Error: ${e.message}</p>
  <p>Please contact support.</p>
</body>
</html>`);
    }
  });
}
