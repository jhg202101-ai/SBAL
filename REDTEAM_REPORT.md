# RedTeam Security Audit - SBAL Payment Flow

**Date**: 2026-03-01
**Target**: SBAL (Stripe Billing Abstraction Layer)
**Mission**: Identify "free-riding" vulnerabilities (ways to get API Key without paying)

---

## Executive Summary

**Overall Risk Level**: ✅ **LOW** (No critical bypass found)
**Key Finding**: The "Pay-First-Activate-Later" logic is sound when all components work as designed.
**Recommendation**: Monitor webhook delivery latency; consider adding idempotency keys for key generation.

---

## Attack Vectors Tested

### 1. Direct `/success` Access without Payment

**Method**: Manually visit `/success?session_id=invalid_id` or valid but unpaid session.

**Expected**: Should not reveal API Key.

**Result**:
- `stripe.checkout.sessions.retrieve(session_id)` throws error → caught → generic error page.
- If session exists but `payment_status !== 'paid'` → shows "Payment in Progress" page.
- ✅ **No API Key leakage**.

**Mitigation**: Server-side Stripe verification enforced.

---

### 2. Webhook Bypass (Forging `invoice.payment_succeeded`)

**Method**: Send fake POST to `/api/v1/webhooks/stripe` with crafted JSON.

**Expected**: Should be rejected due to signature verification.

**Result**:
- Code uses `stripe.webhooks.constructEvent(body, signature, webhookSecret)`.
- Without valid `Stripe-Signature` header signed with secret, event is rejected with 401.
- ✅ **Cannot forge webhook**.

**Mitigation**: Keep `STRIPE_WEBHOOK_SECRET` secure; never expose.

---

### 3. Race Condition (Access `/success` before Webhook finishes)

**Method**: Pay successfully → immediately access `/success` (before webhook triggers/processes).

**Expected**: Should not show API Key if webhook hasn't set `api_key`.

**Result**:
- `/success` checks `customer.api_key` in D1.
- If `api_key == NULL` → returns "Finalizing Setup" page with refresh button.
- ✅ **No leakage**; eventual consistency ensured.

**Observation**: In practice, Stripe webhook delivery is near-instant (< 2s). UX is acceptable.

---

### 4. Replay Attack (Reuse Checkout Session)

**Method**: After paying once, reuse the same `session_id` to access `/success` repeatedly.

**Expected**: Should still show API Key (session immutable after paid). This is acceptable.

**Result**:
- API Key remains visible because payment status stays `paid`.
- This is intended behavior (user can revisit success page).
- ✅ **Not a vulnerability**.

---

### 5. API Key Enumeration (Brute Force)

**Method**: Guess another customer's API key format (`sk_` + 32 hex chars).

**Expected**: Should be rejected.

**Result**:
- All protected endpoints require `Authorization: Bearer <api_key>`.
- D1 query `SELECT id, email FROM customers WHERE api_key = ?` will miss the vast majority of guesses.
- Rate limiting (100 req/min per customer_id) applies only after validation, not pre-validation.
- **Potential Concern**: No global rate limit on API key validation attempts.
- ⚠️ **Low severity**: Could add global IP-based rate limiting on auth endpoints.

**Mitigation Suggested**:
```javascript
// In auth middleware, add IP-based rate limit before DB query
const ipRateKey = `rl:auth:${ip}`;
const count = await kv.get(ipRateKey);
if (count >= 10) return 429;
```
But not critical because API keys are long (UUID v4 format).

---

### 6. SQL Injection / Parameter Tampering

**Method**: Craft malicious email or tier values.

**Result**:
- All database access uses parameterized queries (`prepare().bind()`).
- No string concatenation in SQL.
- ✅ **No SQL injection**.

---

### 7. Open Redirect / XSS in Success Page

**Method**: Manipulate `return_url` or inject script via query.

**Result**:
- `return_url` is hardcoded in `wrangler.toml` and code; no user-controlled redirect.
- HTML pages serve static templates; no user input rendered without escaping (Tailwind classes are static).
- ✅ **No XSS / Open redirect**.

---

## Business Logic Weaknesses

### Weakness: No built-in subscription cancellation handling in Checkout flow

**Issue**: If user pays and then immediately cancels via Stripe dashboard, our system may not reflect cancellation until next webhook.

**Impact**: Low (customer support can manually revoke API key).

**Recommendation**: Implement `customer.subscription.deleted` webhook to set `api_key = NULL` immediately.

---

### Weakness: No duplicate payment handling

**Issue**: If user accidentally pays twice, Stripe will create two invoices; our webhook will generate **only one** API key (because `api_key` is only set if NULL). This is okay; second payment just extends subscription period.

**Impact**: None.

---

## Conclusion

**SAFE TO LAUNCH**: The current implementation correctly enforces "pay before getting API key".

**Critical Requirements** (must stay in place):
1. `customers.api_key` must be `NULL` until `invoice.payment_succeeded`.
2. `client_reference_id` must always map to D1 `customer_id`.
3. Webhook signature verification must remain enabled.

**Next Steps**:
1. Add monitoring for webhook failures (already in `webhook_failures` table).
2. Consider adding alerting if `api_key == NULL` after payment (webhook lag).
3. Optional: IP rate limiting on auth endpoints.

---

**RedTeam Sign-off**: ✅ **PASSED** (No critical "free-riding" vector identified)
