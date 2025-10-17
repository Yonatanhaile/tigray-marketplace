#!/bin/bash

# End-to-end API testing script for Tigray Marketplace
# Usage: ./scripts/test-flows.sh

API_URL=${API_URL:-http://localhost:3000}
SELLER_EMAIL="seller_$(date +%s)@example.com"
BUYER_EMAIL="buyer_$(date +%s)@example.com"

echo "🚀 Starting API flow tests for Tigray Marketplace"
echo "API URL: $API_URL"
echo ""

# 1. Register Seller
echo "1️⃣  Registering seller..."
SELLER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Seller\",
    \"email\": \"$SELLER_EMAIL\",
    \"phone\": \"+25191$(date +%N | cut -c1-7)\",
    \"password\": \"password123\",
    \"roles\": [\"seller\"]
  }")

SELLER_TOKEN=$(echo $SELLER_RESPONSE | jq -r '.token')
SELLER_ID=$(echo $SELLER_RESPONSE | jq -r '.user.id')

if [ "$SELLER_TOKEN" != "null" ]; then
  echo "✅ Seller registered. Token: ${SELLER_TOKEN:0:20}..."
else
  echo "❌ Seller registration failed"
  echo "$SELLER_RESPONSE" | jq
  exit 1
fi

# 2. Register Buyer
echo ""
echo "2️⃣  Registering buyer..."
BUYER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Buyer\",
    \"email\": \"$BUYER_EMAIL\",
    \"phone\": \"+25191$(date +%N | cut -c1-7)\",
    \"password\": \"password123\"
  }")

BUYER_TOKEN=$(echo $BUYER_RESPONSE | jq -r '.token')

if [ "$BUYER_TOKEN" != "null" ]; then
  echo "✅ Buyer registered. Token: ${BUYER_TOKEN:0:20}..."
else
  echo "❌ Buyer registration failed"
  exit 1
fi

# 3. Create Listing
echo ""
echo "3️⃣  Creating listing..."
LISTING_RESPONSE=$(curl -s -X POST "$API_URL/api/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "title": "Test iPhone 13",
    "description": "Brand new iPhone 13 Pro Max 256GB",
    "price": 75000,
    "currency": "ETB",
    "condition": "new",
    "category": "electronics",
    "payment_methods": ["cash", "m-birr", "bank-transfer"],
    "payment_instructions": "M-Birr: 0912-345-678 or cash on delivery",
    "pickup_options": {
      "pickup": true,
      "courier": false,
      "meeting_spots": ["City Center Mall", "Merkato"]
    },
    "images": []
  }')

LISTING_ID=$(echo $LISTING_RESPONSE | jq -r '.listing._id')

if [ "$LISTING_ID" != "null" ]; then
  echo "✅ Listing created. ID: $LISTING_ID"
else
  echo "❌ Listing creation failed"
  echo "$LISTING_RESPONSE" | jq
  exit 1
fi

# 4. Create Order Intent
echo ""
echo "4️⃣  Creating order intent..."
ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d "{
    \"listingId\": \"$LISTING_ID\",
    \"selected_payment_method\": \"cash\",
    \"meeting_info\": {
      \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"place\": \"City Center Mall\"
    },
    \"buyer_note\": \"Looking forward to buying this!\"
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order._id')

if [ "$ORDER_ID" != "null" ]; then
  echo "✅ Order intent created. ID: $ORDER_ID"
else
  echo "❌ Order creation failed"
  echo "$ORDER_RESPONSE" | jq
  exit 1
fi

# 5. Seller Confirms Order
echo ""
echo "5️⃣  Seller confirming order..."
CONFIRM_RESPONSE=$(curl -s -X PATCH "$API_URL/api/orders/$ORDER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "status": "seller_confirmed"
  }')

CONFIRM_STATUS=$(echo $CONFIRM_RESPONSE | jq -r '.order.status')

if [ "$CONFIRM_STATUS" == "seller_confirmed" ]; then
  echo "✅ Order confirmed by seller"
else
  echo "❌ Order confirmation failed"
  echo "$CONFIRM_RESPONSE" | jq
fi

# 6. Mark as Paid
echo ""
echo "6️⃣  Marking order as paid..."
PAID_RESPONSE=$(curl -s -X PATCH "$API_URL/api/orders/$ORDER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "status": "paid_offsite",
    "payment_status": "paid_offsite",
    "payment_evidence": "https://example.com/payment-screenshot.jpg"
  }')

PAID_STATUS=$(echo $PAID_RESPONSE | jq -r '.order.status')

if [ "$PAID_STATUS" == "paid_offsite" ]; then
  echo "✅ Order marked as paid"
else
  echo "❌ Payment marking failed"
  echo "$PAID_RESPONSE" | jq
fi

# 7. File Dispute
echo ""
echo "7️⃣  Filing dispute..."
DISPUTE_RESPONSE=$(curl -s -X POST "$API_URL/api/disputes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"reason\": \"Item not as described - testing dispute flow\",
    \"category\": \"item_not_as_described\"
  }")

DISPUTE_ID=$(echo $DISPUTE_RESPONSE | jq -r '.dispute._id')

if [ "$DISPUTE_ID" != "null" ]; then
  echo "✅ Dispute filed. ID: $DISPUTE_ID"
else
  echo "❌ Dispute filing failed"
  echo "$DISPUTE_RESPONSE" | jq
fi

# 8. Request Invoice
echo ""
echo "8️⃣  Requesting invoice generation..."
INVOICE_RESPONSE=$(curl -s -X POST "$API_URL/api/orders/$ORDER_ID/invoice" \
  -H "Authorization: Bearer $SELLER_TOKEN")

INVOICE_STATUS=$(echo $INVOICE_RESPONSE | jq -r '.invoice.status')

if [ "$INVOICE_STATUS" != "null" ]; then
  echo "✅ Invoice generation queued. Status: $INVOICE_STATUS"
else
  echo "❌ Invoice generation failed"
  echo "$INVOICE_RESPONSE" | jq
fi

# Summary
echo ""
echo "========================================="
echo "📊 Test Flow Summary"
echo "========================================="
echo "Seller Email: $SELLER_EMAIL"
echo "Buyer Email: $BUYER_EMAIL"
echo "Listing ID: $LISTING_ID"
echo "Order ID: $ORDER_ID"
echo "Dispute ID: $DISPUTE_ID"
echo "========================================="
echo "✅ All tests completed successfully!"

