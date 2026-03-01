// Documentation page template with i18n support
export default function docsTemplate(locale, t) {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SBAL ${t('nav.docs')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold text-blue-600">SBAL</div>
      <div class="space-x-6 flex items-center">
        <a href="/" class="text-gray-600 hover:text-blue-600">${t('nav.home')}</a>
        <a href="/docs" class="text-blue-600 font-semibold">${t('nav.docs')}</a>
        <a href="/admin" class="text-gray-600 hover:text-blue-600">${t('nav.admin')}</a>
        <div class="relative">
          <button id="lang-btn" class="text-gray-600 hover:text-blue-600 flex items-center gap-1">
            ${locale === 'zh-TW' ? '🇨🇳 中文' : '🇺🇸 English'}
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
          </button>
          <div id="lang-dropdown" class="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg hidden z-50">
            <a href="#" data-lang="en" class="block px-4 py-2 hover:bg-gray-100 ${locale === 'en' ? 'bg-gray-100' : ''}">🇺🇸 English</a>
            <a href="#" data-lang="zh-TW" class="block px-4 py-2 hover:bg-gray-100 ${locale === 'zh-TW' ? 'bg-gray-100' : ''}">🇨🇳 中文</a>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-bold mb-8">${t('nav.docs')}</h1>

    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-4">QuickStart</h2>
      <div class="prose max-w-none text-gray-800">
        <p>SBAL (Stripe Billing Abstraction Layer) provides a simple API to manage subscriptions and usage-based billing.</p>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-4">API Reference</h2>
      <div class="space-y-6">
        <div class="bg-white border rounded-lg p-6">
          <h3 class="font-bold mb-2">Create Customer</h3>
          <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code>POST /api/v1/customers
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "Customer Name"
}</code></pre>
          <p class="mt-2 text-gray-600">Response: <code>{"customer_id":"...", "stripe_customer_id":"..."}</code></p>
        </div>

        <div class="bg-white border rounded-lg p-6 mb-6">
          <h3 class="font-bold mb-2">Create a Subscription</h3>
          <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code>POST /api/v1/subscriptions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer &lt;customer_api_key&gt;" \\
  -d '{"customer_id":"&lt;internal_customer_id&gt;","plan_id":"price_...","trial_days":14}'</code></pre>
          <p class="mt-2 text-gray-600">Returns subscription details including status.</p>
        </div>

        <div class="bg-white border rounded-lg p-6">
          <h3 class="font-bold mb-2">Record Usage (Metered Billing)</h3>
          <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code>POST /api/v1/usage_records \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer &lt;customer_api_key&gt;" \\
  -d '{"subscription_item_id":"si_...","quantity":100}'</code></pre>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-4">Customer Support Guide</h2>
      <div class="prose max-w-none text-gray-800">
        <p>Use the <a href="/admin" class="text-blue-600 hover:underline">${t('nav.admin')}</a> to:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>View recent customers and their API keys</li>
          <li>Copy pre-generated payment links for any tier (Base, Growth, Enterprise)</li>
          <li>Send the appropriate link to customers for self-service onboarding</li>
        </ul>
        <p class="mt-4"><strong>Note:</strong> All payment links are fixed and ready to use. No additional configuration required.</p>
      </div>
    </section>

    <section>
      <h2 class="text-2xl font-bold mb-4">System Status</h2>
      <p>Check <a href="/api/v1/quickcheck" class="text-blue-600 hover:underline">/api/v1/quickcheck</a> for real-time health of D1 and Stripe connections.</p>
    </section>
  </main>

  <footer class="bg-gray-900 text-gray-400 py-8 mt-12">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <p>© ${new Date().getFullYear()} SBAL by OpenClaw. All rights reserved.</p>
    </div>
  </footer>

  <script>
    // Language switcher with dropdown + cookie persistence
    (function() {
      const btn = document.getElementById('lang-btn');
      const dropdown = document.getElementById('lang-dropdown');

      function switchLang(lang) {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = 'sbale_lang=' + lang + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.location.href = url.toString();
      }

      if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
          dropdown.classList.add('hidden');
        });

        dropdown.querySelectorAll('a[data-lang]').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = e.target.getAttribute('data-lang');
            switchLang(lang);
          });
        });
      }
    })();
  </script>
</body>
</html>`;
}
