// QuickCheck page (system status) - minimal template
export default function quickcheckTemplate(checks) {
  const color = checks.status === 'ok' ? '#2ecc71' : '#e74c3c';
  return `<!DOCTYPE html>
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
    <p><strong>Version:</strong> ${checks.version || '1.0'}</p>
    <div class="check">
      <strong>D1 Connectivity:</strong> <span class="${checks.d1 ? 'ok' : 'fail'}">${checks.d1 ? '✅ Connected' : '❌ Failed'}</span>
    </div>
    <div class="check">
      <strong>Stripe Connectivity:</strong> <span class="${checks.stripe ? 'ok' : 'fail'}">${checks.stripe ? '✅ Connected' : '❌ Failed'}</span>
    </div>
  </div>
</body>
</html>`;
}
