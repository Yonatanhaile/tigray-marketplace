# Tigray Marketplace - Acceptance Checklist

## Deployment & Infrastructure

- [ ] **React frontend deployed to Vercel and loading**
  - URL: _____________
  - Test: Visit URL and verify homepage loads
  - Expected: Homepage with hero section, recent listings, and navigation

- [ ] **Express + Socket.io backend deployed to Render and accessible**
  - URL: _____________
  - Test: `curl https://your-api.onrender.com/health`
  - Expected: `{"status":"ok","timestamp":"...","uptime":...}`

- [ ] **Socket.io handshake works from production frontend to Render backend using JWT auth**
  - Test: Login on frontend, check browser console for "Socket connected"
  - Expected: Console shows `✅ Socket connected: <socket-id>`

## Core Features

- [ ] **Seller can create listing with payment methods & images upload to Cloudinary**
  - Test: Register as seller, navigate to "Create Listing", fill form, upload images
  - Expected: Listing created successfully, images visible on listing detail page

- [ ] **Buyer can create an order intent; order created in MongoDB; seller receives real-time notification via Socket.io**
  - Test: As buyer, click "Intent to Buy" on a listing, fill modal, submit
  - Expected: 
    - Order created (status: `requested`)
    - Buyer redirected to order detail page
    - Seller sees notification (check Socket.io console or toast)

- [ ] **Messaging persists and real-time delivery works between two users**
  - Test: Open order detail, click "Messages", send message from buyer account, check seller account
  - Expected: Message appears in real-time on both sides

- [ ] **Seller can mark `paid_offsite` and attach a payment screenshot URL; buyer sees it**
  - Test: As seller, update order status to `paid_offsite`, add payment evidence URL
  - Expected: Order updates to `paid_offsite`, evidence visible to buyer

- [ ] **Buyer can file a dispute with attachments; admin can resolve the dispute**
  - Test: As buyer, click "File Dispute" on order, submit reason
  - Expected: Dispute created, visible in admin panel
  - Test: As admin, navigate to disputes tab, resolve or reject
  - Expected: Dispute status updated

- [ ] **Seller can request invoice; worker generates PDF and returns a downloadable URL; `Invoice.generatedPdfUrl` exists**
  - Test: As seller, click "Request Invoice" on completed order
  - Expected:
    - Worker processes job (check worker logs)
    - PDF generated and uploaded to Cloudinary
    - `invoices` collection has record with `generatedPdfUrl`
    - Download link works

- [ ] **Admin can approve/reject KYC; badge shows on seller profile**
  - Test: As admin, navigate to KYC tab, approve a pending seller
  - Expected: 
    - Seller's `kyc.status` becomes `approved`
    - Seller gains "verified-seller" badge
    - Badge visible on listing pages

## Security & Quality

- [ ] **Security protections implemented**
  - Rate limits: Try 6 login attempts rapidly → expect 429 Too Many Requests
  - File size: Upload >8MB file → expect error
  - File type: Upload .exe file → expect error
  - Input validation: Submit listing without title → expect 400 error

- [ ] **Automated tests (Jest/Vitest) pass**
  - Test: `cd server && npm test`
  - Expected: All tests pass with >70% coverage

- [ ] **Docker Compose works for local dev with sockets**
  - Test: `docker-compose up -d`, visit `http://localhost:5173`
  - Expected: 
    - All services running (mongo, redis, server, worker, client)
    - Can register, login, create listing
    - Socket.io connects (check browser console)

## Additional Verification

- [ ] **Environment variables set correctly in Render**
  - Check: Render dashboard → each service has all required env vars
  - Required: `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `CLOUDINARY_URL`, `FRONTEND_URL`, `BACKEND_URL`

- [ ] **CORS configuration allows frontend origin**
  - Test: Make API request from Vercel frontend
  - Expected: No CORS errors in browser console

- [ ] **MongoDB Atlas IP whitelist configured**
  - Check: MongoDB Atlas → Network Access
  - Expected: Render IP ranges or "Allow from anywhere" (for testing)

- [ ] **Redis managed service on Render connected**
  - Check: Worker logs for "Bull queues initialized"
  - Test: Request invoice and verify worker processes job

- [ ] **Cloudinary credentials valid**
  - Test: Upload image on listing creation
  - Expected: Image uploaded successfully to Cloudinary

- [ ] **Health check endpoint working**
  - Test: `curl https://your-api.onrender.com/health`
  - Expected: 200 OK with JSON response

## User Experience

- [ ] **Mobile responsive UI works on phone**
  - Test: Visit frontend on mobile device
  - Expected: UI adapts correctly to small screen

- [ ] **Safety disclaimers visible**
  - Check: Listing detail page shows payment disclaimer
  - Check: Intent modal warns "platform does NOT process payments"
  - Check: Footer shows TOS snippet

- [ ] **Real-time notifications appear**
  - Test: Create order intent, check seller account for toast notification
  - Expected: Toast notification appears with order info

## Test Data Verification

Use `scripts/test-flows.sh` to verify:

```bash
API_URL=https://your-api.onrender.com ./scripts/test-flows.sh
```

Expected: All 8 steps complete successfully

## Sign-Off

**Tester Name:** _____________

**Date:** _____________

**Signature:** _____________

**Notes:**

