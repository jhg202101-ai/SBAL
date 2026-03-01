// Landing page template with i18n support
export default function landingPageTemplate(locale, t) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SBAL - ${t('hero.title')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold text-blue-600">SBAL</div>
      <div class="space-x-6">
        <a href="/" class="text-gray-600 hover:text-blue-600">${t('nav.home')}</a>
        <a href="/docs" class="text-gray-600 hover:text-blue-600">${t('nav.docs')}</a>
        <a href="/admin" class="text-gray-600 hover:text-blue-600">${t('nav.admin')}</a>
        <button id="lang-btn" class="text-gray-600 hover:text-blue-600">${t('language')}</button>
      </div>
    </div>
  </nav>

  <header class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <h1 class="text-5xl font-bold mb-4">${t('hero.title')}</h1>
      <p class="text-xl mb-8 opacity-90">${t('hero.subtitle')}</p>
      <div class="space-x-4">
        <a href="https://github.com/jhg202101-ai/SBAL" class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">${t('hero.viewGitHub')}</a>
        <a href="/docs" class="border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600">${t('hero.readDocs')}</a>
      </div>
    </div>
  </header>

  <section class="py-20">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">${t('features.title')}</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-xl shadow-sm border">
          <div class="text-4xl mb-4">⚡</div>
          <h3 class="text-xl font-bold mb-2">${t('features.efficiency.title')}</h3>
          <p class="text-gray-600">${t('features.efficiency.desc')}</p>
        </div>
        <div class="bg-white p-8 rounded-xl shadow-sm border">
          <div class="text-4xl mb-4">💰</div>
          <h3 class="text-xl font-bold mb-2">${t('features.cost.title')}</h3>
          <p class="text-gray-600">${t('features.cost.desc')}</p>
        </div>
        <div class="bg-white p-8 rounded-xl border shadow-sm">
          <div class="text-4xl mb-4">🛡️</div>
          <h3 class="text-xl font-bold mb-2">${t('features.production.title')}</h3>
          <p class="text-gray-600">${t('features.production.desc')}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white py-20">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-4">${t('pricing.title')}</h2>
      <p class="text-center text-gray-600 mb-12">${t('pricing.subtitle')}</p>
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Base -->
        <div class="border rounded-xl p-8 flex flex-col">
          <h3 class="text-2xl font-bold">${t('pricing.base.name')}</h3>
          <p class="text-4xl font-bold my-4">${t('pricing.base.price')}<span class="text-lg font-normal text-gray-600">${t('pricing.base.period')}</span></p>
          <ul class="mb-8 space-y-2 text-gray-700 flex-grow">
            ${t('pricing.base.features').map(f => `<li>✅ ${f}</li>`).join('')}
          </ul>
          <button onclick="openCheckoutModal('SBAL Base')" class="bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700">${t('pricing.getStarted')}</button>
        </div>
        <!-- Growth -->
        <div class="border-2 border-blue-600 rounded-xl p-8 flex flex-col relative">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm">${t('pricing.popular')}</div>
          <h3 class="text-2xl font-bold">${t('pricing.growth.name')}</h3>
          <p class="text-4xl font-bold my-4">${t('pricing.growth.price')}<span class="text-lg font-normal text-gray-600">${t('pricing.growth.period')}</span></p>
          <ul class="mb-8 space-y-2 text-gray-700 flex-grow">
            ${t('pricing.growth.features').map(f => `<li>✅ ${f}</li>`).join('')}
          </ul>
          <button onclick="openCheckoutModal('SBAL Growth')" class="bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700">${t('pricing.getStarted')}</button>
        </div>
        <!-- Enterprise -->
        <div class="border rounded-xl p-8 flex flex-col">
          <h3 class="text-2xl font-bold">${t('pricing.enterprise.name')}</h3>
          <p class="text-4xl font-bold my-4">${t('pricing.enterprise.price')}<span class="text-lg font-normal text-gray-600">${t('pricing.enterprise.period')}</span></p>
          <ul class="mb-8 space-y-2 text-gray-700 flex-grow">
            ${t('pricing.enterprise.features').map(f => `<li>✅ ${f}</li>`).join('')}
          </ul>
          <a href="/admin" class="bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700">${t('pricing.contactSales')}</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-gray-900 text-gray-400 py-8">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <p>${t('footer').replace('{{year}}', year)}</p>
    </div>
  </footer>

  <!-- Checkout Modal -->
  <div id="checkout-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-bold mb-4">${t('modal.title')}</h3>
      <form id="checkout-form">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">${t('modal.emailLabel')}</label>
          <input type="email" id="checkout-email" required class="border rounded w-full p-2" placeholder="${t('modal.emailPlaceholder')}">
        </div>
        <input type="hidden" id="checkout-tier">
        <div class="flex gap-2">
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">${t('modal.submit')}</button>
          <button type="button" onclick="closeCheckoutModal()" class="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">${t('modal.cancel')}</button>
        </div>
      </form>
      <div id="checkout-result" class="mt-4 p-3 bg-green-50 border border-green-200 rounded hidden">
        <p class="text-sm mb-2">${t('modal.success')}</p>
        <div class="flex gap-2 mt-2">
          <input type="text" id="payment-link-url" class="text-sm border rounded p-1 flex-grow" readonly>
          <button onclick="copyPaymentLink()" class="bg-green-600 text-white px-3 py-1 rounded text-sm">${t('modal.copy')}</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Language persistence: auto-switch based on localStorage
    (function() {
      const storedLang = localStorage.getItem('lang');
      const urlParams = new URLSearchParams(window.location.search);
      const currentLang = urlParams.get('lang') || (storedLang || 'en');
      // If URL has no lang but localStorage has one, redirect to add it
      if (!urlParams.has('lang') && storedLang) {
        window.location.search = '?lang=' + storedLang;
        return;
      }
      // Update localStorage when user clicks language button
      const btn = document.getElementById('lang-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const newLang = currentLang === 'en' ? 'zh-TW' : 'en';
          localStorage.setItem('lang', newLang);
          window.location.search = '?lang=' + newLang;
        });
      }
    })();

    function openCheckoutModal(tier) {
      document.getElementById('checkout-tier').value = tier;
      document.getElementById('checkout-email').value = '';
      document.getElementById('checkout-result').classList.add('hidden');
      document.getElementById('checkout-modal').classList.remove('hidden');
    }
    function closeCheckoutModal() {
      document.getElementById('checkout-modal').classList.add('hidden');
    }
    function copyPaymentLink() {
      const input = document.getElementById('payment-link-url');
      input.select();
      document.execCommand('copy');
      alert('${t('modal.copy')}!');
    }
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('checkout-email').value.trim();
      const tier = document.getElementById('checkout-tier').value;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = '${t('modal.processing')}';
      try {
        const resp = await fetch('/api/v1/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, tier })
        });
        const data = await resp.json();
        if (data.success) {
          document.getElementById('payment-link-url').value = data.checkout_url;
          document.getElementById('checkout-result').classList.remove('hidden');
        } else {
          alert('Error: ' + (data.message || data.error || 'unknown'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '${t('modal.submit')}';
      }
    });
  </script>
</body></html>`;
}
