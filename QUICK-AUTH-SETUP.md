# ⚡ Quick Authentication Setup

## 🚀 5-Minute Setup Guide

### 1️⃣ Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Google+ API
3. OAuth consent screen → External → Fill details
4. Create Credentials → OAuth Client ID → Web application
5. Add redirect URI: `http://localhost:3000/api/oauth/google/callback`
6. Copy Client ID and Client Secret

### 2️⃣ Email Setup (Choose One)

**Gmail (Quick):**
- Enable 2FA → [Create App Password](https://myaccount.google.com/apppasswords)

**SendGrid (Production):**
- Sign up → Create API Key

**Skip (Testing):**
- OTPs will show in console

### 3️⃣ Environment Variables

**Create `server/.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback
SESSION_SECRET=any-random-string-here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Tigray Market" <noreply@tigraymarket.com>

CLIENT_URL=http://localhost:5173
OTP_EXPIRY_MINUTES=10
```

**Create `client/.env`:**
```env
VITE_API_URL=http://localhost:3000
```

### 4️⃣ Start & Test

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2  
cd client
npm run dev
```

Visit `http://localhost:5173/register` and test:
- ✅ Google OAuth button
- ✅ Email OTP verification

---

## 📋 What Changed?

### New Features:
- ✅ Google OAuth (one-click signup/login)
- ✅ Email OTP verification (6-digit code)
- ✅ No more fake email registrations

### New Files:
- `server/src/services/emailOtp.js`
- `server/src/config/passport.js`
- `server/src/routes/oauth.js`
- `client/src/pages/OAuthCallback.jsx`

### Modified:
- User model (added `emailVerified`, `googleId`, `authProvider`)
- Register page (2-step with OTP)
- Login page (Google button)
- Auth controller (OTP endpoints)

---

## 🐛 Quick Troubleshooting

**Google OAuth not working?**
→ Check redirect URI matches exactly in Google Console

**Emails not sending?**
→ Use Gmail App Password, not regular password

**OTP expired?**
→ Default is 10 minutes, check `OTP_EXPIRY_MINUTES`

**CORS error?**
→ Verify `CLIENT_URL` in server `.env`

---

## 📚 Full Documentation

- **Setup Guide:** `AUTH-SETUP-GUIDE.md`
- **Implementation Details:** `AUTHENTICATION-IMPLEMENTATION-SUMMARY.md`

---

**Ready to Go!** 🎉

