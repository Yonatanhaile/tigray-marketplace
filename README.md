# Tigray Marketplace - Production-Ready Regional Marketplace

A full-stack marketplace web application with intent-based offline transactions, real-time messaging, and PDF invoice generation.

## 🏗️ Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS (deployed on Vercel)
- **Backend**: Node.js + Express + Socket.io (deployed on Render)
- **Worker**: Bull + Puppeteer for PDF generation (deployed on Render)
- **Database**: MongoDB Atlas
- **Cache/Queue**: Redis (Render managed)
- **Real-time**: Socket.io with JWT authentication
- **Media**: Cloudinary (with S3 alternative)
- **Auth**: JWT-based authentication

## 📋 Features

- ✅ User registration & JWT authentication
- ✅ Phone OTP verification (dev mode with logged OTP)
- ✅ Role-based access control (Buyer/Seller/Courier/Admin)
- ✅ KYC approval workflow for sellers
- ✅ Listing creation with multi-image upload
- ✅ Intent-based order system (no payment processing)
- ✅ Real-time messaging via Socket.io
- ✅ Order status tracking & updates
- ✅ Payment evidence upload
- ✅ Dispute filing and resolution
- ✅ PDF invoice generation (Puppeteer)
- ✅ Admin panel for KYC & dispute management
- ✅ Rate limiting & security best practices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MongoDB Atlas account
- Cloudinary account (or AWS S3)
- Vercel account (for frontend)
- Render account (for backend + worker)

### Local Development with Docker Compose

1. **Clone the repository**

```bash
git clone <repo-url>
cd tigray-marketplace
```

2. **Set up environment variables**

Create `.env` files in `/server` and `/worker` directories:

```bash
# server/.env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://admin:password123@mongo:27017/tigray_marketplace?authSource=admin
REDIS_URL=redis://:redis123@redis:6379
JWT_SECRET=your-super-secret-jwt-key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
USE_S3=false
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM=noreply@tigraymarket.com
OTP_DEV_MODE=true
```

Create `/client/.env`:

```bash
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

3. **Start all services**

```bash
docker-compose up -d
```

This starts:
- MongoDB on `localhost:27017`
- Redis on `localhost:6379`
- Backend API on `localhost:3000`
- Worker (background jobs)
- Client (React) on `localhost:5173`

4. **Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

### Manual Setup (without Docker)

1. **Install dependencies**

```bash
npm run install:all
```

2. **Start MongoDB & Redis locally**

```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

3. **Start backend**

```bash
cd server
npm run dev
```

4. **Start worker**

```bash
cd worker
npm run dev
```

5. **Start frontend**

```bash
cd client
npm run dev
```

## 🌐 Production Deployment

### 1. MongoDB Atlas Setup

1. Create free cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IPs (or allow from anywhere for testing)
4. Copy connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/tigray_marketplace`

### 2. Cloudinary Setup

1. Create account at https://cloudinary.com
2. Get your `CLOUDINARY_URL` from dashboard
3. Format: `cloudinary://api_key:api_secret@cloud_name`

### 3. Deploy Backend & Worker to Render

**Option A: Using render.yaml (recommended)**

1. Connect GitHub repo to Render
2. Render will auto-detect `render.yaml`
3. Add environment variables in Render dashboard:
   - `MONGO_URI` (from MongoDB Atlas)
   - `CLOUDINARY_URL`
   - `FRONTEND_URL` (your Vercel URL)
   - `BACKEND_URL` (your Render Web Service URL)
   - `SMTP_*` credentials

**Option B: Manual setup**

1. Create **Web Service** for backend:
   - Runtime: Docker
   - Root Directory: `./server`
   - Docker Command: use `Dockerfile` in `server/`
   - Add environment variables

2. Create **Background Worker** for PDF generation:
   - Runtime: Docker
   - Root Directory: `./worker`
   - Docker Command: use `Dockerfile` in `worker/`
   - Add same environment variables

3. Create **Managed Redis**:
   - Plan: Starter (free)
   - Copy `REDIS_URL` and add to both services

### 4. Deploy Frontend to Vercel

1. Connect GitHub repo to Vercel
2. Configure build:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. Add environment variables:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://tigray-api.onrender.com`)
   - `VITE_SOCKET_URL`: Same as API URL

4. Deploy!

### 5. Update CORS & URLs

After deployment, update in Render dashboard:
- `FRONTEND_URL` = your Vercel URL
- `BACKEND_URL` = your Render Web Service URL

## 📚 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/otp/send
POST /api/auth/otp/verify
GET  /api/auth/profile (authenticated)
```

### Listings Endpoints

```http
GET    /api/listings
GET    /api/listings/:id
POST   /api/listings (seller)
PATCH  /api/listings/:id (seller)
DELETE /api/listings/:id (seller)
```

### Orders Endpoints

```http
POST  /api/orders (create intent)
GET   /api/orders/my-orders
GET   /api/orders/:id
PATCH /api/orders/:id (update status, payment evidence)
POST  /api/orders/:id/invoice (request PDF)
GET   /api/orders/:id/invoice
```

### Messages Endpoints

```http
POST /api/messages (REST fallback)
GET  /api/orders/:id/messages
GET  /api/messages/unread-count
```

### Disputes Endpoints

```http
POST /api/disputes
GET  /api/disputes/:id
GET  /api/disputes/my-disputes
POST /api/disputes/:id/comments
```

### Admin Endpoints

```http
GET   /api/admin/stats
GET   /api/admin/orders
GET   /api/admin/disputes
PATCH /api/admin/disputes/:id
GET   /api/admin/users
PATCH /api/admin/kyc/:userId
PATCH /api/admin/users/:userId/status
```

### Upload Endpoints

```http
POST /api/uploads/sign (get Cloudinary/S3 signature)
POST /api/uploads/validate
```

## 🔌 Socket.io Events

### Client → Server

- `auth`: `{ token }` - Authenticate socket
- `join_order`: `{ orderId }` - Join order room
- `create_order_intent`: `{ listingId, meeting_info, payment_method, note }`
- `new_message`: `{ orderId, toUserId, text, attachments }`
- `mark_order_status`: `{ orderId, status }` (seller)
- `generate_invoice`: `{ orderId }`
- `mark_message_read`: `{ messageId }`

### Server → Client

- `auth_success`: `{ userId }` - Authentication successful
- `auth_error`: Authentication failed
- `order_update`: `{ orderId, status, payment_status }` - Order status changed
- `new_message`: `{ message }` - New message received
- `notification`: `{ type, payload }` - General notification
- `invoice_ready`: `{ orderId, pdfUrl }` - Invoice PDF generated
- `message_read`: `{ messageId, readAt }` - Message read confirmation

## 🔐 Security Features

- JWT authentication with 1h expiration
- Password hashing with bcrypt (12 rounds)
- Rate limiting on auth endpoints (5 attempts per 15 min)
- OTP rate limiting (3 attempts per minute)
- Input validation & sanitization
- MongoDB injection prevention
- CORS configuration
- Helmet.js security headers
- File upload validation (type & size)
- Socket.io authentication via JWT

## 🧪 Testing

### Run Backend Tests

```bash
cd server
npm test
```

### Test Coverage

```bash
npm test -- --coverage
```

### Manual Testing Scripts

See `scripts/test-flows.sh` for curl-based end-to-end tests.

## 📦 Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks (useAuth, useSocket)
│   │   ├── services/      # API & Socket services
│   │   └── App.jsx        # Main app component
│   ├── Dockerfile.dev
│   └── package.json
│
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── models/       # Mongoose models
│   │   ├── services/     # Business logic (OTP, email, upload)
│   │   ├── sockets/      # Socket.io handlers
│   │   ├── queues/       # Bull queue setup
│   │   ├── middleware/   # Auth, RBAC, validation
│   │   └── server.js     # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── worker/               # Background worker
│   ├── src/
│   │   ├── jobs/        # Job processors (PDF generation)
│   │   ├── services/    # Cloudinary, S3, logger
│   │   └── worker.js    # Worker entry point
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml    # Local dev orchestration
├── render.yaml          # Render deployment config
└── README.md            # This file
```

## 🎯 Acceptance Checklist

- [x] React frontend deployed to Vercel
- [x] Express + Socket.io backend deployed to Render
- [x] Socket.io handshake works with JWT auth
- [x] Seller can create listing with images (Cloudinary)
- [x] Buyer can create order intent
- [x] Real-time Socket.io notifications work
- [x] Messaging persists and real-time delivery works
- [x] Seller can mark `paid_offsite` with evidence
- [x] Buyer can file dispute with attachments
- [x] Worker generates PDF invoices via Puppeteer
- [x] Admin can approve/reject KYC
- [x] Security: rate limiting, validation, sanitization
- [x] Docker Compose works for local dev
- [x] Automated tests implemented

## 🔄 Background Jobs

The worker processes:

1. **Invoice Generation**
   - Triggered via API or Socket.io
   - Renders HTML template with order data
   - Generates PDF using Puppeteer
   - Uploads to Cloudinary/S3
   - Updates database with PDF URL
   - Emits `invoice_ready` event

2. **Retry Logic**
   - Max 3 attempts
   - Exponential backoff (5s initial delay)

## 📱 OTP Flow (Development)

In development mode (`OTP_DEV_MODE=true`):
- OTP is logged to server console
- 6-digit code valid for 5 minutes
- Max 3 verification attempts

**Production Setup:**
Replace with Twilio or similar SMS service in `server/src/services/otp.js`:

```javascript
const sendSMS = async (phone, message) => {
  const client = require('twilio')(accountSid, authToken);
  await client.messages.create({
    body: message,
    from: twilioPhoneNumber,
    to: phone,
  });
};
```

## 💳 Payment Flow

**Important:** This platform does NOT process payments.

1. Buyer views listing with payment methods & instructions
2. Buyer creates "intent to buy" order
3. Seller confirms intent
4. Buyer and seller arrange meeting
5. Payment happens offline (cash, mobile money, bank transfer)
6. Buyer/Seller uploads payment evidence
7. Seller marks order as `paid_offsite`
8. Optional: Generate invoice for records

## 🐛 Troubleshooting

### Docker Issues

**MongoDB connection failed:**
```bash
docker-compose down -v
docker-compose up -d mongo redis
# Wait 10 seconds
docker-compose up -d server worker client
```

**Port already in use:**
```bash
# Stop containers
docker-compose down

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Socket.io Not Connecting

1. Check `VITE_SOCKET_URL` matches backend URL
2. Verify JWT token in localStorage
3. Check browser console for errors
4. Verify backend logs show socket connection

### PDF Generation Fails

1. Check Puppeteer executable path in worker
2. Ensure Chromium is installed (Docker handles this)
3. Check Redis connection in worker logs
4. Verify Cloudinary credentials

### Vercel Deployment Issues

1. Ensure Root Directory is set to `client`
2. Verify environment variables are set
3. Check build logs for errors
4. Test locally with `npm run build && npm run preview`

## 🔧 Environment Variables Reference

### Backend (server/)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Port for API server (default: 3000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection URL |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiration (default: `1h`) |
| `CLOUDINARY_URL` | Yes* | Cloudinary config (if not using S3) |
| `USE_S3` | No | `true` to use S3 instead of Cloudinary |
| `AWS_S3_BUCKET` | No | S3 bucket name |
| `AWS_REGION` | No | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | No | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key |
| `CLOUDFRONT_URL` | No | CloudFront distribution URL |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `BACKEND_URL` | Yes | Backend URL |
| `SMTP_HOST` | Yes | SMTP server host |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `SMTP_FROM` | No | From email address |
| `OTP_DEV_MODE` | No | `true` to log OTP to console |

### Worker (worker/)

Same as backend, plus:

| Variable | Required | Description |
|----------|----------|-------------|
| `PUPPETEER_EXECUTABLE_PATH` | No | Path to Chromium (auto in Docker) |

### Client (client/)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_SOCKET_URL` | Yes | Socket.io server URL (usually same as API) |

## 📞 Support & Contact

For issues, questions, or contributions:
- GitHub Issues: [Create an issue]
- Documentation: See `/docs` folder
- Email: support@tigraymarket.com

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with React, Express, Socket.io, MongoDB
- PDF generation powered by Puppeteer
- Media storage via Cloudinary
- Deployed on Vercel & Render

---

**Remember:** This platform facilitates connections but does NOT process payments. All transactions are the responsibility of buyers and sellers.

