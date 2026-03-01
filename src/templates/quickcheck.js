// QuickCheck page (system status) - minimal template with i18n
export default function quickcheckTemplate(checks, locale, t) {
  const color = checks.status === 'ok' ? '#2ecc71' : '#e74c3c';
  const langLabel = locale === 'zh-TW' ? '語言' : 'Language';
  const flagLabel = locale === 'zh-TW' ? '🇨🇳 中文' : '🇺🇸 English';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>SBAL QuickCheck</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
    .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; position: relative; }
    h1 { color: #333; margin-top: 0; }
    .status { display: inline-block; padding: 10px 20px; border-radius: 4px; color: white; background: ${color}; font-weight: bold; margin: 10px 0; }
    .check { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
    .ok { color: #2ecc71; font-weight: bold; }
    .fail { color: #e74c3c; font-weight: bold; }
    .lang-switch { position: absolute; top: 20px; right: 20px; }
    .lang-btn { cursor: pointer; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
    .lang-menu { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10; display: none; }
    .lang-menu a { display: block; padding: 8px 12px; text-decoration: none; color: #333; }
  </style>
</head>
<body>
  <div class="card">
    <div class="lang-switch">
      <button id="lang-btn" class="lang-btn">${flagLabel} ${langLabel}</button>
      <div id="lang-dropdown" class="lang-menu">
        <a href="#" data-lang="en" ${locale === 'en' ? 'class="bg-gray-100"' : ''}>🇺🇸 English</a>
        <a href="#" data-lang="zh-TW" ${locale === 'zh-TW' ? 'class="bg-gray-100"' : ''}>🇨🇳 中文</a>
      </div>
    </div>

    <h1>SBAL System Status</h1>
    <div class="status">${checks.status.toUpperCase()}</div>
    <p><strong>Timestamp:</strong> ${checks.timestamp}</p>
    <p><strong>Version:</strong> ${checks.version || '1.0'}</p>
    <div class="check">
      <strong>D1 Connectivity:</strong> <span class="${checks.d1 ? 'ok' : 'fail'}">${checks.d1 ? '✅ Connected' : '❌ Failed'}</span>
    </div>
    <div class="check">
      <strong>Stripe Connectivity:</strong> <span class="${checks.stripe ? 'ok' : 'fail'}">${checks.stripe ? '✅ Connected' : '❌ Failed'}</span>
    </div>
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
