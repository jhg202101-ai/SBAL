// Admin Dashboard template (with i18n)
export default function adminTemplate(customers, tiers, locale, t) {
  const langLabel = locale === 'zh-TW' ? '語言' : 'Language';
  const flagLabel = locale === 'zh-TW' ? '🇨🇳 中文' : '🇺🇸 English';

  return `<!DOCTYPE html>
<html lang="${locale}">
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
    .nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .lang-switch { position: relative; }
    .lang-btn { cursor: pointer; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
    .lang-menu { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10; display: none; }
    .lang-menu a { display: block; padding: 8px 12px; text-decoration: none; color: #333; }
    .lang-menu a:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav-header">
      <h1>SBAL Admin Dashboard</h1>
      <div class="lang-switch">
        <button id="lang-btn" class="lang-btn">${flagLabel} ${t('language')}</button>
        <div id="lang-dropdown" class="lang-menu">
          <a href="#" data-lang="en" ${locale === 'en' ? 'class="bg-gray-100"' : ''}>🇺🇸 English</a>
          <a href="#" data-lang="zh-TW" ${locale === 'zh-TW' ? 'class="bg-gray-100"' : ''}>🇨🇳 中文</a>
        </div>
      </div>
    </div>

    <h2>📋 Payment Links (Fixed - Copy & Send to Customers)</h2>
    <table>
      <tr><th>Plan</th><th>Price</th><th>Payment Link (click to copy)</th></tr>
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
          <td>${c.api_key ? c.api_key.substring(0,12)+'...' : 'null'}</td>
          <td>${c.created_at}</td>
        </tr>
      `).join('') : '<tr><td colspan="5">No customers yet.</td></tr>'}
    </table>
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
