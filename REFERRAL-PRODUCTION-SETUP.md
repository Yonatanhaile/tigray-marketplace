# Referral Program - Production Setup

## 🌍 Making Referral Links Work for Internet Users

### The Problem
When `CLIENT_URL=http://localhost:5173`, referral links look like:
```
http://localhost:5173/register?ref=C4B309B5
```

This only works on your local computer, not for users on the internet!

### The Solution
Set `CLIENT_URL` to your actual domain in production.

---

## ✅ FIXED: Your Current Setup

Your `server/.env` file now has:
```env
CLIENT_URL=https://yohatrade.com
```

### Your Referral Links Now Look Like:
```
https://yohatrade.com/register?ref=C4B309B5
```

✅ **This will work for anyone on the internet!**

---

## 🔄 Environment-Specific Setup

### Option 1: Single .env File (Recommended for Simple Deployments)

Use production URL in `.env`:
```env
CLIENT_URL=https://yohatrade.com
```

**Pros:** Simple, one configuration  
**Cons:** Need to change it when developing locally

### Option 2: Separate Environment Files (Recommended for Teams)

Create two files:

**`.env.development`** (for local development):
```env
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/tigray-marketplace
JWT_SECRET=dev-secret-key
NODE_ENV=development
```

**`.env.production`** (for deployed server):
```env
CLIENT_URL=https://yohatrade.com
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/tigray-marketplace
JWT_SECRET=super-secure-production-secret
NODE_ENV=production
```

Then use environment-specific commands:
```bash
# Development
npm run dev

# Production
NODE_ENV=production npm start
```

### Option 3: Dynamic CLIENT_URL (Best for Flexibility)

Update `server/src/controllers/referralController.js` to detect environment:

```javascript
// At the top of the file
const getClientUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CLIENT_URL || 'https://yohatrade.com';
  }
  return process.env.CLIENT_URL || 'http://localhost:5173';
};

// Then in the controllers, replace:
referralLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/register?ref=${referral.referralCode}`

// With:
referralLink: `${getClientUrl()}/register?ref=${referral.referralCode}`
```

---

## 🚀 Deployment Checklist

When deploying to production (Render, Vercel, etc.):

### 1. Set Environment Variables on Your Hosting Platform

**Render.com:**
- Dashboard → Your Service → Environment
- Add: `CLIENT_URL=https://yohatrade.com`

**Vercel:**
- Project Settings → Environment Variables
- Add: `CLIENT_URL=https://yohatrade.com`

**Railway:**
- Project → Variables
- Add: `CLIENT_URL=https://yohatrade.com`

**Heroku:**
```bash
heroku config:set CLIENT_URL=https://yohatrade.com
```

### 2. Update CORS Settings

Make sure `server/src/server.js` allows your domain:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tigray-marketplace-client.vercel.app',
  'https://yohatrade.com',        // ✅ Your domain
  'http://yohatrade.com',         // ✅ Without HTTPS too
  'https://www.yohatrade.com',    // ✅ With www
];
```

### 3. Restart Your Server

After changing environment variables, always restart:
```bash
# Development
npm run dev

# Production (on your server)
pm2 restart app
# or
npm start
```

---

## 🧪 Testing Your Referral Links

### Test in Production:

1. **Login to your deployed site** (https://yohatrade.com)
2. **Navigate to "💰 Make Money"**
3. **Copy your referral link** - should show:
   ```
   https://yohatrade.com/register?ref=YOUR_CODE
   ```
4. **Open in incognito/private window**
5. **Should navigate to your website's registration page**
6. **Complete registration**
7. **Check your dashboard** - should show 1 referral!

### Verify the Link Format:

✅ **CORRECT:**
```
https://yohatrade.com/register?ref=C4B309B5
```

❌ **WRONG (localhost):**
```
http://localhost:5173/register?ref=C4B309B5
```

❌ **WRONG (missing domain):**
```
/register?ref=C4B309B5
```

---

## 📱 Sharing Your Referral Link

Now that your link uses the correct domain, you can share it:

### Via Social Media:
- **WhatsApp:** Copy and paste directly
- **Telegram:** Post in groups/channels
- **Facebook:** Share as post or in groups
- **Twitter/X:** Tweet with your link
- **Instagram:** Add to bio or stories

### Via Messaging:
```
Hey! Join YohaTrade marketplace - buy and sell easily!
Register here: https://yohatrade.com/register?ref=YOUR_CODE
```

### Via QR Code:
Generate a QR code for your link:
- Go to https://qr-code-generator.com
- Enter your referral link
- Download QR code
- Share image on social media

---

## 🔒 Security Notes

### SSL/HTTPS Required
Make sure your domain uses HTTPS (secure connection):
- ✅ `https://yohatrade.com`
- ❌ `http://yohatrade.com`

Most hosting providers (Vercel, Netlify, Render) provide free SSL certificates automatically.

### Referral Code Format
Your referral codes are:
- **8 characters long** (e.g., `C4B309B5`)
- **Unique per user** (generated from user ID hash)
- **Case-sensitive**
- **URL-safe** (no special characters)

---

## 🐛 Troubleshooting

### Issue: Referral links still show localhost

**Solution:**
1. Update `CLIENT_URL` in your deployment environment variables
2. Restart your server
3. Clear any caching (CDN, browser cache)
4. Get a fresh referral link from the dashboard

### Issue: 404 Error when clicking referral link

**Possible causes:**
- Frontend not deployed
- Frontend route `/register` doesn't exist
- CORS issue blocking the request

**Solution:**
- Verify frontend is deployed and accessible at `https://yohatrade.com/register`
- Check browser console for CORS errors
- Update CORS settings in `server/src/server.js`

### Issue: Referral not being tracked

**Possible causes:**
- User already registered before
- Referral code invalid
- Backend not receiving referralCode parameter

**Solution:**
- Check browser network tab (F12) during registration
- Verify `referralCode` is in the registration request body
- Check server logs for any errors

---

## 📊 Current Configuration

Your server is now configured with:

```env
CLIENT_URL=https://yohatrade.com
```

### What This Means:

✅ All referral links will use `https://yohatrade.com`  
✅ Links will work for anyone on the internet  
✅ You can share links on social media  
✅ QR codes will work properly  
✅ Mobile users can register via your link  

### Next Steps:

1. **Restart your server** to apply the changes
2. **Test your referral link** - should show `yohatrade.com`
3. **Share with real users** and watch your referrals grow!

---

## 🎯 Production Deployment Example

### Render.com:

1. **Environment Variables:**
   ```
   CLIENT_URL=https://yohatrade.com
   NODE_ENV=production
   MONGO_URI=mongodb+srv://...your-atlas-uri
   JWT_SECRET=your-secure-secret
   ```

2. **Deploy Command:**
   ```bash
   npm install && npm start
   ```

3. **Start Command:**
   ```bash
   node src/server.js
   ```

### Vercel (Frontend):

1. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.com
   ```

2. **Build Command:**
   ```bash
   npm run build
   ```

3. **Output Directory:**
   ```
   dist
   ```

---

## ✅ Verification Checklist

- [ ] `CLIENT_URL` set to `https://yohatrade.com` in production
- [ ] Server restarted after environment variable change
- [ ] CORS settings include `yohatrade.com`
- [ ] Frontend deployed and accessible
- [ ] SSL certificate active (HTTPS working)
- [ ] Referral link shows correct domain
- [ ] Test registration with referral link works
- [ ] Referral is tracked in dashboard

---

## 🎉 You're All Set!

Your referral program is now configured for production use with the correct domain! Users anywhere in the world can now click your referral links and register on **yohatrade.com**.

**Start sharing your link and earn 5 Birr per referral! 💰**

