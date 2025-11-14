# 🚀 How to Start the Server Correctly

## ⚠️ Important: Use the Correct Directory!

The error `npm error Missing script: "dev"` happens because you're running the command from the **wrong directory**.

---

## ✅ Correct Way to Start Server

### Step 1: Navigate to Server Directory

```powershell
cd server
```

### Step 2: Start the Server

```powershell
npm run dev
```

---

## 📝 Complete Command Sequence

From the project root (`Tigray Market new`):

```powershell
# Navigate to server directory
cd server

# Start development server
npm run dev
```

You should see:
```
🔧 Starting server with environment:
   CLIENT_URL: https://yohatrade.com
   NODE_ENV: production
   PORT: 5000

✅ Environment loaded successfully!
   Referral links will use: https://yohatrade.com

✅ MongoDB connected successfully
🚀 Server running on port 5000 in production mode
```

---

## ⚠️ Common Mistakes

### ❌ WRONG - Running from Root Directory
```powershell
PS C:\Users\user\Desktop\Tigray Market new> npm run dev
npm error Missing script: "dev"  ❌
```

### ✅ CORRECT - Running from Server Directory
```powershell
PS C:\Users\user\Desktop\Tigray Market new> cd server
PS C:\Users\user\Desktop\Tigray Market new\server> npm run dev
🔧 Starting server...  ✅
```

---

## 🧪 Verify Environment Before Starting

If you want to check if your `.env` is configured correctly BEFORE starting:

```powershell
cd server
npm run start:verify
```

This will:
1. Show your environment variables
2. Verify CLIENT_URL is set correctly
3. Start the server

---

## 🔄 Different Start Commands

### Development (with auto-restart on file changes)
```powershell
cd server
npm run dev
```

### Production (no auto-restart)
```powershell
cd server
npm start
```

### Verify Environment First
```powershell
cd server
npm run start:verify
```

---

## 🛑 Stop the Server

Press `Ctrl + C` in the terminal where the server is running.

---

## 🔍 Verify Referral Links Are Fixed

After starting the server, check that CLIENT_URL is correct:

Look for this in the server output:
```
✅ Environment loaded successfully!
   Referral links will use: https://yohatrade.com
```

If you see:
```
⚠️  WARNING: CLIENT_URL contains "localhost"
```

Then your `.env` file still has `localhost` and needs to be updated to:
```env
CLIENT_URL=https://yohatrade.com
```

---

## 📋 Quick Checklist

Before starting the server, make sure:

- [ ] You're in the `server` directory
- [ ] `.env` file exists in `server` directory
- [ ] `CLIENT_URL=https://yohatrade.com` is in `.env`
- [ ] MongoDB is running (if using local MongoDB)
- [ ] No other Node process is using port 5000

---

## 🐛 Troubleshooting

### Issue: "npm error Missing script: 'dev'"

**Cause:** You're in the wrong directory  
**Solution:** 
```powershell
cd server
npm run dev
```

### Issue: Port 5000 is already in use

**Cause:** Another Node process is running  
**Solution:**
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Then start again
cd server
npm run dev
```

### Issue: Cannot connect to MongoDB

**Cause:** MongoDB is not running  
**Solution:**
- Start MongoDB service
- Or update `.env` with MongoDB Atlas connection string

### Issue: Referral links still show localhost

**Cause:** Old server process still running with old CLIENT_URL  
**Solution:**
1. Stop ALL Node processes:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```
2. Verify `.env` has `CLIENT_URL=https://yohatrade.com`
3. Start server:
   ```powershell
   cd server
   npm run dev
   ```
4. Clear browser cache (Ctrl + Shift + R)

---

## ✅ Expected Output

When server starts successfully:

```
🔧 Starting server with environment:
   CLIENT_URL: https://yohatrade.com
   NODE_ENV: production
   PORT: 5000

✅ Environment loaded successfully!
   Referral links will use: https://yohatrade.com

✅ MongoDB connected successfully
🚀 Server running on port 5000 in production mode
🔌 Socket.IO initialized
```

Now your referral links will be:
```
https://yohatrade.com/register?ref=YOUR_CODE
```

NOT:
```
http://localhost:5173/register?ref=YOUR_CODE
```

---

## 🎯 Summary

1. **Always run `npm run dev` from the `server` directory**
2. **Verify CLIENT_URL shows `https://yohatrade.com` on startup**
3. **Stop old Node processes before restarting**
4. **Clear browser cache after server restart**

---

## 🚀 Quick Start

```powershell
# From project root
cd server
npm run dev

# Wait for this message:
# ✅ Referral links will use: https://yohatrade.com

# Then open your app and check referral dashboard
```

That's it! 🎉

