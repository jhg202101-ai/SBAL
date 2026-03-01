// Admin Dashboard template
export default function adminTemplate(customers, tiers) {
  return `<!DOCTYPE html>
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
          <td>${c.api_key ? c.api_key.substring(0,12)+'...' : 'null'}</td>
          <td>${c.created_at}</td>
        </tr>
      `).join('') : '<tr><td colspan="5">No customers yet.</td></tr>'}
    </table>
  </div>
</body>
</html>`;
}
