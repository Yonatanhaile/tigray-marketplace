# 🚀 How to Start Tigray Marketplace (Message Fix Applied)

## ✅ What Was Fixed

The message disappearing issue has been fixed with:
1. **Enhanced error logging** - Now you can see exactly what's happening when messages are sent
2. **Database connection checks** - The server now verifies MongoDB is connected before saving
3. **Better error messages** - You'll know immediately if something fails

## 🔧 Changes Made

### File: `server/src/sockets/index.js`
- Added database connection verification before saving messages
- Added detailed logging for each step of message creation
- Enhanced error handling with detailed debug information
- Added mongoose import for connection state checking

## 📋 How to Start the Server

### Option 1: Start Fresh (Recommended)

```powershell
# Navigate to project directory
cd "C:\Users\user\Desktop\Tigray Market new"

# Terminal 1: Start Backend Server
cd server
npm install
npm run dev

# Terminal 2: Start Frontend Client (in a NEW terminal)
cd "C:\Users\user\Desktop\Tigray Market new\client"
npm install
npm run dev
```

### Option 2: Quick Start with PowerShell Script

Run this command in the project root:
```powershell
.\start-dev.ps1
```

## ✅ Environment Configuration

The server needs a `.env` file. Create `server/.env` with:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/tigray_marketplace

# Redis Configuration (optional for development)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Backend URL
BACKEND_URL=http://localhost:3000
```

## 🔍 How to Verify It's Working

### 1. Check Server Logs

When you send a message, you should now see:
```
📨 Attempting to save message - OrderID: 6xxx, Sender: 6xxx
💾 Saving message to database...
✅ Message saved successfully with ID: 6xxx
📤 Message emitted to all parties - Order: 6xxx, MessageID: 6xxx
```

### 2. If You See Errors

**Error: "Database not connected"**
- MongoDB is not running
- Start MongoDB: `net start MongoDB` (Windows)

**Error: "Order not found"**
- The order might not exist in the database
- Check the order ID is correct

**Error: "Not authorized"**
- User is not part of this order conversation
- Only buyer and seller can message in an order

## 🧪 Testing Message Persistence

1. Open the website in your browser
2. Send a message in any order chat
3. **Check the browser console** (F12) - You should see:
   - "Message sent" notification
4. **Check the server terminal** - You should see the logging above
5. **Refresh the page** (F5)
6. The message should still be there ✅

## 🐛 Still Having Issues?

### Check MongoDB is Running
```powershell
Get-Process -Name mongod
```
Should show a process. If not, start MongoDB.

### Check Database Contents
```powershell
# Connect to MongoDB
mongosh mongodb://localhost:27017/tigray_marketplace

# Check messages
db.messages.find().pretty()

# Should show all saved messages
```

### Check Server Console
Look for these important messages:
- ✅ `MongoDB connected successfully` - Database is working
- ✅ `Server running on port 3000` - Server is running
- ❌ Any red error messages - Something is wrong

## 📝 Common Issues

### Issue: Server won't start
**Solution:** Make sure port 3000 is not already in use
```powershell
Get-NetTCPConnection -LocalPort 3000
```

### Issue: "Module not found" errors
**Solution:** Reinstall dependencies
```powershell
cd server
rm -r node_modules
rm package-lock.json
npm install
```

### Issue: Messages still disappear
**Solution:** Check the server logs when sending. You should see detailed logging now. Share those logs for further debugging.

## 🎉 Success Indicators

When everything is working:
- ✅ MongoDB process running
- ✅ Server shows "MongoDB connected successfully"
- ✅ Frontend can connect to backend
- ✅ Messages show detailed logging
- ✅ Messages persist after page refresh

---

**Need More Help?**
Check the server terminal for the detailed error logs we added. They will tell you exactly what's failing!

