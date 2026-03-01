#!/bin/bash
# SBAL Phase 3 API Test Script
# Run from project root after starting `npx wrangler dev`

BASE="http://localhost:8787"

echo "=== SBAL API Test ==="
echo "1. Health check"
curl -s "$BASE/" | head -1
echo ""

echo "2. Create customer"
CUSTOMER=$(curl -s -X POST "$BASE/api/v1/customers" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}')
echo $CUSTOMER
CUSTOMER_ID=$(echo $CUSTOMER | grep -o '"customer_id":"[^"]*"' | cut -d'"' -f4)
echo "Customer ID: $CUSTOMER_ID"
echo ""

# Use price from Phase 2 (SBAL Base)
PRICE_ID="price_1T5qbDI7EezoPqOFiz1SzRxn"
echo "3. Create subscription (customer_id=$CUSTOMER_ID, price_id=$PRICE_ID)"
SUBSCRIPTION=$(curl -s -X POST "$BASE/api/v1/subscriptions" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\":\"$CUSTOMER_ID\",\"plan_id\":\"$PRICE_ID\"}")
echo $SUBSCRIPTION
SUB_ID=$(echo $SUBSCRIPTION | grep -o '"subscription_id":"[^"]*"' | cut -d'"' -f4)
echo "Subscription ID: $SUB_ID"
echo ""

echo "4. Get subscription"
curl -s "$BASE/api/v1/subscriptions/$SUB_ID" | head -1
echo ""

echo "5. Create usage record (requires Stripe subscription_item_id; skip in test)"
echo "Use Stripe Dashboard to get subscription_item_id for this subscription, then:"
echo "curl -X POST $BASE/api/v1/usage_records -H 'Content-Type: application/json' -d '{\"subscription_item_id\":\"si_...\",\"quantity\":10}'"

echo "=== Done ==="
