# Quick Start Guide - Local Development

Follow these steps to run Tigray Marketplace locally:

## Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository if needed)
- A Cloudinary account (free tier: https://cloudinary.com)

## Step 1: Setup Environment Files

Run the setup script (or create files manually):

### On Linux/Mac:
```bash
chmod +x setup-local.sh
./setup-local.sh
```

### On Windows (PowerShell):
```powershell
# Run the manual setup below
```

### Manual Setup:

Create `server/.env`:
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://admin:password123@localhost:27017/tigray_marketplace?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=dev-jwt-secret-please-change-in-production-12345678
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# ⚠️ REQUIRED: Add your Cloudinary credentials
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

USE_S3=false
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM=noreply@tigraymarket.com
OTP_DEV_MODE=true
```

Create `worker/.env`:
```env
# Copy the same content from server/.env
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Step 2: Get Cloudinary Credentials

1. Go to https://cloudinary.com
2. Sign up for free account (no credit card required)
3. Go to Dashboard: https://cloudinary.com/console
4. Find your credentials:
   - **Cloud name**
   - **API Key**
   - **API Secret**
5. Format as: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
6. Update `CLOUDINARY_URL` in `server/.env` and `worker/.env`

Example:
```env
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz123456@your_cloud_name
```

## Step 3: Start Services

```bash
# Start all services in background
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

Expected output:
```
✅ mongo      - Running on port 27017
✅ redis      - Running on port 6379
✅ server     - Running on port 3000
✅ worker     - Running
✅ client     - Running on port 5173
```

## Step 4: Wait for Services to Start

Give it about 30-60 seconds for all services to fully start, especially:
- MongoDB initialization
- NPM package installation (first time)

## Step 5: Access the Application

Open in your browser:
- **Frontend**: http://localhost:5173
- **Backend Health Check**: http://localhost:3000/health

You should see the Tigray Marketplace homepage!

## Step 6: Create Test Accounts

### Register as Seller:
1. Click "Sign Up"
2. Fill in details
3. Check "I want to sell items"
4. Submit

### Register as Buyer:
1. Open incognito/private window
2. Click "Sign Up"
3. Fill in different details
4. Don't check seller option
5. Submit

### Create Admin (Optional):

Use MongoDB Compass or connect to database:

```bash
# Connect to MongoDB
docker exec -it tigray-mongo mongosh -u admin -p password123 --authenticationDatabase admin

# Switch to database
use tigray_marketplace

# Find your user and update roles
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { roles: ["admin", "seller", "buyer"] } }
)
```

## Step 7: Test Core Features

### As Seller:
1. Create a listing (upload image - Cloudinary must be configured!)
2. Add payment methods and instructions
3. Submit listing

### As Buyer:
1. Browse listings
2. Click on a listing
3. Click "Intent to Buy"
4. Fill in meeting details and payment method
5. Submit order intent

### Check Real-Time:
1. Keep both browser windows open (seller + buyer)
2. When buyer creates order, seller should see notification
3. Check browser console for Socket.io connection: `✅ Socket connected`

### Test Messaging:
1. Go to order detail page
2. Click "Messages"
3. Send message from buyer
4. Check seller window for real-time delivery

### Test Invoice Generation:
1. As seller, mark order as "paid_offsite"
2. Click "Request Invoice"
3. Check worker logs: `docker-compose logs worker`
4. Wait for PDF generation (~5-10 seconds)
5. Invoice URL should appear

## Troubleshooting

### Services won't start:
```bash
# Stop all services
docker-compose down

# Remove volumes and start fresh
docker-compose down -v
docker-compose up -d
```

### Can't access frontend:
- Check if port 5173 is available
- Check Docker logs: `docker-compose logs client`
- Try: `docker-compose restart client`

### Socket.io not connecting:
- Check browser console for errors
- Verify `VITE_SOCKET_URL` in `client/.env`
- Check server logs: `docker-compose logs server`

### Images won't upload:
- Verify Cloudinary credentials are correct
- Test URL format: `cloudinary://key:secret@cloudname`
- Check server logs for upload errors

### MongoDB connection failed:
```bash
# Restart MongoDB
docker-compose restart mongo

# Check MongoDB logs
docker-compose logs mongo

# Wait 10 seconds and restart server
sleep 10
docker-compose restart server
```

### OTP not showing:
- OTP is logged to server console in dev mode
- Check server logs: `docker-compose logs server | grep OTP`
- Look for: `🔐 OTP for +251... : 123456`

### Worker not processing jobs:
```bash
# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Check Redis connection
docker-compose logs redis
```

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f worker
docker-compose logs -f client

# Restart a service
docker-compose restart server

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild services (after code changes)
docker-compose up -d --build

# Check service status
docker-compose ps

# Execute commands in container
docker-compose exec server npm test
docker-compose exec server node --version
```

## Running Without Docker

If you prefer not to use Docker:

### 1. Install Dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
cd ../worker && npm install
cd ..
```

### 2. Start MongoDB and Redis:
- Install MongoDB locally
- Install Redis locally
- Update connection strings in `.env` files

### 3. Start Services:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Worker
cd worker
npm run dev

# Terminal 3 - Frontend
cd client
npm run dev
```

## Next Steps

Once everything is running:

1. **Test the acceptance checklist**: `scripts/acceptance-checklist.md`
2. **Run automated tests**: `cd server && npm test`
3. **Run API flow test**: `./scripts/test-flows.sh`
4. **Explore admin panel**: Update user roles in MongoDB
5. **Test dispute flow**: File a dispute as buyer
6. **Generate invoices**: Test PDF generation

## Getting Help

- Check `README.md` for detailed documentation
- See `docs/DEPLOYMENT.md` for production deployment
- Review `docs/SOCKET_CONTRACT.md` for Socket.io events
- Check Docker logs for errors

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | (register new user) |
| Backend API | http://localhost:3000 | (JWT token) |
| MongoDB | localhost:27017 | admin / password123 |
| Redis | localhost:6379 | password: redis123 |

Happy testing! 🚀

