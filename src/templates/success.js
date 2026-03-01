// Success page template (with i18n + language switcher)
export default function successTemplate(customer, locale, t) {
  const langLabel = locale === 'zh-TW' ? '語言' : 'Language';
  const flagLabel = locale === 'zh-TW' ? '🇨🇳 中文' : '🇺🇸 English';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('success.title')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center relative">
    <!-- Language Switcher -->
    <div class="absolute top-4 right-4">
      <button id="lang-btn" class="px-3 py-1 border rounded text-sm hover:bg-gray-100">${flagLabel} ${langLabel}</button>
      <div id="lang-dropdown" class="absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg hidden z-10">
        <a href="#" data-lang="en" class="block px-4 py-2 hover:bg-gray-100 ${locale === 'en' ? 'bg-gray-100' : ''}">🇺🇸 English</a>
        <a href="#" data-lang="zh-TW" class="block px-4 py-2 hover:bg-gray-100 ${locale === 'zh-TW' ? 'bg-gray-100' : ''}">🇨🇳 中文</a>
      </div>
    </div>

    <div class="text-5xl mb-4">🎉</div>
    <h1 class="text-3xl font-bold text-gray-800 mb-2">${t('success.title')}</h1>
    <p class="text-gray-600 mb-6">${t('success.welcome', { email: customer.email })}</p>

    <div class="bg-gray-100 rounded-lg p-4 mb-6 text-left">
      <p class="text-sm text-gray-500 mb-1">${t('success.apiKeyLabel')}</p>
      <code class="text-lg font-mono break-all">${customer.api_key}</code>
      <p class="text-xs text-gray-500 mt-2">${t('success.apiKeyHint')}</p>
    </div>

    <div class="space-y-3">
      <a href="/docs" class="block bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">${t('success.readDocs')}</a>
      <a href="/" class="block border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50">${t('success.backHome')}</a>
    </div>

    <p class="mt-6 text-xs text-gray-400">${t('success.needHelp')}</p>
  </div>

  <script>
    (function() {
      const btn = document.getElementById('lang-btn');
      const menu = document.getElementById('lang-dropdown');
      function switchLang(lang) {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = 'sbale_lang=' + lang + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.location.href = url.toString();
      }
      if (btn && menu) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'block' ? 'none' : 'block'; });
        document.addEventListener('click', () => { menu.style.display = 'none'; });
        menu.querySelectorAll('a[data-lang]').forEach(a => {
          a.addEventListener('click', (e) => { e.preventDefault(); switchLang(e.target.getAttribute('data-lang')); });
        });
      }
    })();
  </script>
</body>
</html>`;
}
