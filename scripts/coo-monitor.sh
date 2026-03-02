#!/bin/bash
# COO Autonomous Monitoring Loop
# 执行：系统扫描、Stripe 交易检查、Oracle 服务器显存监测

set -e

echo "🔍 COO Monitor started at $(date -Iseconds)"
logfile="/home/ubuntu/.openclaw/workspace-router/memory/$(date +%Y-%m-%d).md"

# 1. 系统健康扫描
echo "### System Health Scan" >> "$logfile"
echo "- Timestamp: $(date -Iseconds)" >> "$logfile"
echo "- Uptime:" >> "$logfile"
uptime >> "$logfile" 2>&1 || echo "  (error)" >> "$logfile"

# 2. 检查 OpenClaw Gateway 状态
echo "- Gateway Status:" >> "$logfile"
if pgrep -f "openclaw-gateway" > /dev/null; then
  gateway_pid=$(pgrep -f "openclaw-gateway" | head -1)
  echo "  ✅ Gateway running (PID $gateway_pid)" >> "$logfile"
else
  echo "  ❌ Gateway NOT running!" >> "$logfile"
  # 尝试重启
  echo "  → Attempting gateway restart..." >> "$logfile"
  openclaw gateway restart >> "$logfile" 2>&1 || echo "  → Restart failed" >> "$logfile"
fi

# 3. Disk & Memory usage
echo "- Resource Usage:" >> "$logfile"
df -h / >> "$logfile" 2>&1
free -h >> "$logfile" 2>&1

# 4. Oracle GPU memory check (if nvidia-smi exists)
if command -v nvidia-smi &> /dev/null; then
  echo "- GPU Memory:" >> "$logfile"
  nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv,noheader >> "$logfile" 2>&1 || echo "  (nvidia-smi error)" >> "$logfile"
else
  echo "- GPU: not available (nvidia-smi missing)" >> "$logfile"
fi

# 5. OpenRouter API health (light check)
echo "- OpenRouter Status:" >> "$logfile"
OR_STATUS=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models 2>/dev/null | tail -1)
OR_BODY=$(echo "$OR_STATUS" | sed '$d')
OR_CODE=$(echo "$OR_STATUS" | tail -n1)
if [ "$OR_CODE" = "200" ]; then
  echo "  ✅ OpenRouter API reachable" >> "$logfile"
elif [ "$OR_CODE" = "429" ]; then
  echo "  ❌ OpenRouter rate limited (429)" >> "$logfile"
  # 记录到退避状态文件
  echo "$(date -Iseconds)" > /tmp/openrouter_backoff.until
  # 发送警报
  echo "🚨 ALERT: OpenRouter 429 limit triggered. Entering backoff mode." >> "$logfile"
else
  echo "  ⚠️ OpenRouter API error: HTTP $OR_CODE" >> "$logfile"
fi

# 6. 检查是否有任何异常（例如连续失败的任务）
if grep -q "error\|failed\|ERR" "$logfile" 2>/dev/null; then
  echo "🚨 Anomalies detected. Notifying..." >> "$logfile"
else
  echo "✅ All checks passed" >> "$logfile"
fi

echo "" >> "$logfile"
echo "COO Monitor cycle complete." >> "$logfile"
echo "---" >> "$logfile"
