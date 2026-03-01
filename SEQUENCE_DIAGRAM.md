# SBAL Payment Flow - Sequence Diagram

## 安全原則：先付款，後啟用 (Pay-First-Activate-Later)

```mermaid
sequenceDiagram
    actor User as 用戶 (客戶)
    participant UI as SBAL Frontend (首頁 + Modal)
    participant API as SBAL Backend (/api/v1/checkout)
    participant D1 as D1 Database (customers 表)
    participant Stripe as Stripe (Checkout Session)
    participant Webhook as SBAL Webhook (/api/v1/webhooks/stripe)

    Note over UI,API: 階段一：註冊與彈窗（未付費）
    User->>UI: 點擊 "Get Started" (Base/Growth)
    UI->>User: 顯示彈窗（輸入 Email）
    User->>UI: 輸入 Email + 提交
    UI->>API: POST /api/v1/checkout {email, tier}
    API->>Stripe: stripe.customers.create(email)
    API->>D1: INSERT customers (api_key = NULL)
    API->>Stripe: stripe.checkout.sessions.create<br/>client_reference_id = D1 customer_id
    API->>UI: {checkout_url, customer_id} (NO api_key)
    UI->>User: 顯示 Checkout URL（無 API Key）

    Note over User,Stripe: 階段二：Stripe 支付（外部跳轉）
    User->>Stripe: 打開 Checkout URL → 輸入卡號 → 付款
    Stripe->>Stripe: 處理付款（成功/失敗）
    Stripe->>User: 302 redirect → /success?session_id={CHECKOUT_SESSION_ID}
    User->>Webhook: 🔄 異步觸發 invoice.payment_succeeded

    Note over Webhook,D1: 階段三：Webhook 驗證並激活 API Key（關鍵安全邊界）
    Webhook->>Stripe: 驗證簽名 (constructEvent)
    Webhook->>D1: SELECT id, api_key FROM customers<br/>WHERE stripe_customer_id = data.customer
    alt api_key IS NULL (首次付款)
        Webhook->>D1: UPDATE customers SET api_key = ? WHERE id = ?
        Note over Webhook,D1: 🔐 API Key 生成並標記為 Active
    else api_key 已存在 (重複付款)
        Webhook->>D1: 跳過生成（避免覆蓋）
    end
    Webhook->>Stripe: 200 OK (已處理)

    Note over User,Webhook: 階段四：Success 頁面顯示金鑰（支付完成後）
    User->>API: GET /success?session_id=...
    API->>Stripe: stripe.checkout.sessions.retrieve(session_id)
    API->>D1: SELECT api_key FROM customers WHERE id = session.client_reference_id
    alt payment_status == 'paid' AND api_key != NULL
        API->>User: HTML 頁面顯示 API Key ✅
    else payment_status != 'paid'
        API->>User: 顯示 "Payment in Progress" ⏳
    else api_key == NULL (Webhook 未處理)
        API->>User: 顯示 "Finalizing Setup" 🔐 (請稍候刷新)
    end
```

## 關鍵安全性設計說明

| 步驟 | 控制點 | 目的 |
|------|--------|------|
| 1. Checkout API | `api_key = NULL` 插入 D1 | 確保此時客戶 **無法取得 API Key** |
| 2. Checkout Session | `client_reference_id = D1 customer_id` | Stripe → D1 的正確映射 |
| 3. Webhook 觸發 | `invoice.payment_succeeded` | 唯一入口生成 API Key |
| 4. Success 頁面 | 雙重驗證：`session.payment_status === 'paid'`<br/>且 `customer.api_key != NULL` | 最終才揭露金鑰 |
| 5. 防護機制 | 所有的 `/api/v1/*` 路由需 `Authorization: Bearer <api_key>` | 未付費者無法調用任何受保護 API |

## 潛在攻擊面與防禦（RedTeam 發現）

| 攻擊向量 | 可能性 | 防禦措施 |
|----------|--------|----------|
| 直接訪問 `/success?session_id=fake` | ❌ 被 Stripe API 攔截（session 不存在） | `stripe.checkout.sessions.retrieve()` 驗證 |
| Race Condition（支付成功但 Webhook 延遲） | ⚠️ 使用者會看到 "Finalizing Setup" | UI 提供手動刷新，100% 最終一致 |
| 偽造 Webhook 事件 | ❌ 簽名驗證失敗（`STRIPE_WEBHOOK_SECRET`） | `constructEvent` 攔截 |
| 手動調用 `/api/v1/customers` 後直接使用 api_key | ❌ api_key 為 NULL，API 回傳 401 | 所有 API 驗證 `Bearer` token |
| 重放攻擊（使用舊 session_id） | ❌ Stripe session 一次性，且檢查 payment_status | session 狀態機不可逆 |

## 總結

**API Key 的生命週期**：
```
未付費 → (D1.customers.api_key = NULL)
支付成功 → Webhook 生成 API Key → (D1.customers.api_key = 'sk_...')
狀態永久：active (除非后台手動停權)
```

**無白嫖漏洞**：任何路徑在未收到 Stripe 確認款項前，API Key 不會被賦予值。
