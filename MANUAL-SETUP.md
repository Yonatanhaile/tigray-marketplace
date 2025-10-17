# Manual Setup Without Docker

Complete guide to run Tigray Marketplace locally without Docker.

## Prerequisites

- **Node.js 18+** - Download from https://nodejs.org/
- **MongoDB** - Local installation OR use MongoDB Atlas (cloud)
- **Redis** - Local installation OR use cloud Redis

## Option 1: Quick Setup (Using Cloud Services - Recommended)

This is the easiest option - uses cloud services so you don't need to install MongoDB and Redis locally.

### Step 1: Get MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com
2. Sign up for free account
3. Create a free M0 cluster:
   - Click "Build a Database"
   - Choose **FREE** tier
   - Select region closest to you
   - Click "Create"

4. Create database user:
   - Click "Database Access" → "Add New Database User"
   - Username: `tigray_user`
   - Password: Generate secure password (save it!)
   - Click "Add User"

5. Whitelist your IP:
   - Click "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (for testing)
   - Click "Confirm"

6. Get connection string:
   - Click "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your password
   - Should look like: `mongodb+srv://tigray_user:yourpassword@cluster0.xxxxx.mongodb.net/tigray_marketplace?retryWrites=true&w=majority`

### Step 2: Get Cloud Redis (Free)

**Option A: Redis Labs (Free 30MB)**

1. Go to https://redis.com/try-free/
2. Sign up for free account
3. Create database:
   - Click "New database"
   - Choose **Free** plan
   - Select region
   - Click "Activate"

4. Get connection string:
   - Click on your database
   - Copy "Public endpoint"
   - Format: `redis://default:password@endpoint:port`

**Option B: Upstash (Free 10K commands/day)**

1. Go to https://upstash.com/
2. Sign up with GitHub
3. Create database:
   - Click "Create Database"
   - Choose region
   - Click "Create"

4. Copy "Redis URL" from dashboard

**Option C: Skip Redis (Limited Functionality)**
You can run without Redis but invoices and background jobs won't work:
- Set `REDIS_URL=redis://localhost:6379` (it will try to connect but fail gracefully)
- Invoice generation will fail

### Step 3: Install Dependencies

Open PowerShell in your project directory:

```powershell
# Install root dependencies (if using workspaces)
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install worker dependencies
cd worker
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Step 4: Create Environment Files

Run the setup script:
```powershell
.\setup-local.ps1
```

Or create manually:

**server/.env**:
```env
NODE_ENV=development
PORT=3000

# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://tigray_user:yourpassword@cluster0.xxxxx.mongodb.net/tigray_marketplace?retryWrites=true&w=majority

# Cloud Redis URL
REDIS_URL=redis://default:yourpassword@redis-xxxxx.upstash.io:6379

JWT_SECRET=dev-jwt-secret-please-change-in-production-12345678
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Cloudinary credentials (REQUIRED)
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

USE_S3=false
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM=noreply@tigraymarket.com
OTP_DEV_MODE=true
```

**worker/.env**: (Same as server/.env)

**client/.env**:
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Step 5: Start Services

You need **3 separate terminal windows**:

**Terminal 1 - Start Backend:**
```powershell
cd server
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
✅ Bull queues initialized
🚀 Server running on port 3000
```

**Terminal 2 - Start Worker:**
```powershell
cd worker
npm run dev
```

You should see:
```
✅ MongoDB connected (Worker)
🚀 Worker started and listening for jobs...
```

**Terminal 3 - Start Frontend:**
```powershell
cd client
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 6: Open Application

Open your browser to: **http://localhost:5173**

You should see the Tigray Marketplace homepage! 🎉

---

## Option 2: Full Local Setup (MongoDB + Redis Installed Locally)

If you want everything running locally on your machine:

### Step 1: Install MongoDB Locally

**Windows:**
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run installer (choose "Complete" installation)
3. Install as Windows Service
4. MongoDB will start automatically

Default connection: `mongodb://localhost:27017`

**Start MongoDB manually:**
```powershell
# If not running as service
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

### Step 2: Install Redis Locally

**Windows:**

Redis doesn't officially support Windows, but you can use:

**Option A: WSL2 (Recommended)**
1. Install WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
2. In WSL2 terminal:
```bash
sudo apt-get update
sudo apt-get install redis-server
redis-server --daemonize yes
```

**Option B: Memurai (Redis for Windows)**
1. Download from: https://www.memurai.com/get-memurai
2. Install and start service
3. Default: `localhost:6379`

**Option C: Use Docker just for Redis**
```powershell
docker run -d -p 6379:6379 redis:7-alpine redis-server --requirepass redis123
```

### Step 3: Configure Environment

**server/.env**:
```env
NODE_ENV=development
PORT=3000

# Local MongoDB
MONGO_URI=mongodb://localhost:27017/tigray_marketplace

# Local Redis
REDIS_URL=redis://localhost:6379

# Or if using password
# REDIS_URL=redis://:redis123@localhost:6379

JWT_SECRET=dev-jwt-secret-please-change-in-production-12345678
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
USE_S3=false
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM=noreply@tigraymarket.com
OTP_DEV_MODE=true
```

Copy same content to **worker/.env**

**client/.env**: (same as Option 1)

### Step 4: Install Dependencies

```powershell
cd server
npm install
cd ../worker
npm install
cd ../client
npm install
cd ..
```

### Step 5: Start Services

Same as Option 1 - use 3 terminals for server, worker, and client.

---

## Verify Everything is Working

### 1. Check Backend Health

Open: http://localhost:3000/health

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "environment": "development"
}
```

### 2. Check Frontend

Open: http://localhost:5173

Should see Tigray Marketplace homepage.

### 3. Check Socket.io Connection

1. Open browser console (F12)
2. Go to http://localhost:5173
3. Register/login
4. You should see: `✅ Socket connected: <socket-id>`

### 4. Check Database Connection

In server terminal, you should see:
```
✅ MongoDB connected successfully
```

### 5. Check Redis Connection

In server terminal, you should see:
```
✅ Bull queues initialized
```

If Redis fails, you'll see an error but server will still start.

---

## Testing the Application

### Quick Test Flow:

1. **Register Seller:**
   - Go to http://localhost:5173/register
   - Fill form, check "I want to sell items"
   - Submit

2. **Create Listing:**
   - Click "+ Create Listing"
   - Upload image (requires Cloudinary!)
   - Fill details
   - Submit

3. **Register Buyer:**
   - Open incognito window
   - Register with different email
   - Don't check seller option

4. **Create Order Intent:**
   - Browse listings
   - Click "Intent to Buy"
   - Fill form, submit

5. **Check Real-Time:**
   - Go back to seller window
   - Should see notification!

6. **Test Messaging:**
   - Go to order detail
   - Click "Messages"
   - Send message from buyer
   - Check seller window for instant delivery

---

## Troubleshooting

### Server won't start

**Error: Cannot connect to MongoDB**
```
Solution: 
- Check MongoDB is running
- Verify MONGO_URI is correct
- For Atlas, check IP whitelist
- For local, try: net start MongoDB (Windows)
```

**Error: Cannot connect to Redis**
```
Solution:
- Check Redis is running
- For local: redis-cli ping (should return PONG)
- For cloud: verify connection string
- Server will start without Redis but invoices won't work
```

**Error: Port 3000 already in use**
```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <process_id> /F

# Or change port in server/.env
PORT=3001
```

### Client won't start

**Error: Port 5173 already in use**
```
Solution: Client will auto-pick next available port (5174, etc.)
Or kill the process using port 5173
```

**Error: Module not found**
```powershell
# Delete node_modules and reinstall
cd client
Remove-Item -Recurse -Force node_modules
npm install
```

### Images won't upload

**Error: Cloudinary upload failed**
```
Solution:
1. Verify CLOUDINARY_URL format: cloudinary://key:secret@cloudname
2. No spaces or quotes
3. Test credentials in Cloudinary dashboard
4. Check server logs for specific error
```

### Worker not processing jobs

**Redis not connected:**
```
Solution:
1. Verify REDIS_URL in worker/.env
2. Check Redis is running
3. Look at worker terminal for connection errors
4. Restart worker after fixing Redis connection
```

**Puppeteer error on Windows:**
```
Solution:
1. Puppeteer should install Chromium automatically
2. If fails, try: cd worker && npm install puppeteer --force
3. Or set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

### Socket.io not connecting

**In browser console: WebSocket connection failed**
```
Solution:
1. Verify server is running on port 3000
2. Check VITE_SOCKET_URL=http://localhost:3000 in client/.env
3. Check browser console for specific error
4. Try: Ctrl+Shift+R to hard refresh
```

---

## Running Tests

### Unit Tests:
```powershell
cd server
npm test
```

### API Flow Test:
```powershell
# Make sure server is running first
.\scripts\test-flows.sh

# On Windows, use Git Bash or manually test with curl/Postman
```

---

## Development Workflow

### Making Code Changes:

**Backend changes** - Server auto-restarts (nodemon):
1. Edit files in `server/src/`
2. Save
3. Check terminal for restart message
4. Test changes

**Frontend changes** - Vite HMR:
1. Edit files in `client/src/`
2. Save
3. Browser updates instantly
4. No reload needed

**Worker changes** - Manual restart:
1. Edit files in `worker/src/`
2. Save
3. Stop worker (Ctrl+C)
4. Restart: `npm run dev`

### Adding Dependencies:

```powershell
# Backend
cd server
npm install <package-name>

# Worker
cd worker
npm install <package-name>

# Frontend
cd client
npm install <package-name>
```

---

## Stopping Services

Press **Ctrl+C** in each terminal window to stop:
1. Stop client (Terminal 3)
2. Stop worker (Terminal 2)
3. Stop server (Terminal 1)

---

## Database Management

### Using MongoDB Compass (GUI):

1. Download: https://www.mongodb.com/try/download/compass
2. Connect:
   - For local: `mongodb://localhost:27017`
   - For Atlas: Use your connection string
3. Browse collections: users, listings, orders, etc.
4. Manually update data for testing

### Using MongoDB Shell:

```powershell
# For local MongoDB
mongosh

# For Atlas
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/tigray_marketplace" --username tigray_user

# View databases
show dbs

# Use database
use tigray_marketplace

# View collections
show collections

# Query users
db.users.find().pretty()

# Update user to admin
db.users.updateOne(
  { email: "your-email@test.com" },
  { $set: { roles: ["admin", "seller", "buyer"] } }
)
```

---

## Performance Tips

### Speed up development:

1. **Only run what you need:**
   - Testing frontend only? Don't start worker
   - Testing API only? Don't start client

2. **Use cloud services:**
   - Cloud MongoDB/Redis = no local installation
   - Faster startup times

3. **Enable caching:**
   - npm packages cached automatically
   - Browser caches static assets

---

## Comparison: Docker vs Manual

| Aspect | Docker | Manual |
|--------|--------|--------|
| Setup Time | Longer first time | Faster after installs |
| Dependencies | Bundled | Manual install |
| Isolation | Complete | Shared system |
| Port Conflicts | Rare | More common |
| Memory Usage | Higher | Lower |
| Consistency | Guaranteed | Depends on system |
| Good For | Testing/Production | Development |

---

## Need Help?

- **MongoDB issues**: https://docs.mongodb.com/
- **Redis issues**: https://redis.io/docs/
- **Node.js issues**: https://nodejs.org/docs/
- **Vite issues**: https://vitejs.dev/guide/

Check logs in each terminal for specific errors!

---

## Quick Reference

### Required Services:
- ✅ Backend (server) - port 3000
- ✅ Frontend (client) - port 5173
- ✅ MongoDB - port 27017 or cloud
- ✅ Redis - port 6379 or cloud

### Optional Services:
- Worker - only needed for PDF invoices

### Startup Order:
1. MongoDB (if local)
2. Redis (if local)
3. Backend server
4. Worker (optional)
5. Frontend client

---

**You're ready to develop!** 🚀

Open http://localhost:5173 and start building!

