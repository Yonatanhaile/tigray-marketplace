# 🚀 Referral Program - Quick Start Guide

## Getting Started in 3 Steps

### 1️⃣ Add Environment Variable

Add to your `.env` file in the server directory:

```bash
CLIENT_URL=http://localhost:5173
# Or your production URL: https://your-frontend-url.com
```

### 2️⃣ Restart Your Server

```bash
# Stop your server if running (Ctrl+C)
# Then restart:
npm run dev
```

### 3️⃣ Test the Feature

1. **Login to your application**
2. **Click "💰 Make Money"** in the navigation bar
3. **Set up your payment method**
4. **Copy your referral link**
5. **Share it with friends!**

---

## 📋 User Journey

### Step 1: Access Dashboard
- Login to your account
- Click **"💰 Make Money"** in navbar

### Step 2: Setup Payment
- Choose payment method (Telebirr, M-Pesa, or Bank Transfer)
- Enter payment details
- Click "Update Payment Method"

### Step 3: Share Link
- Copy your unique referral link
- Share via WhatsApp, Telegram, Facebook, etc.
- Each person who registers = 5 Birr

### Step 4: Track Progress
- Watch your referral count grow
- See your available balance increase
- View detailed referral history

### Step 5: Request Withdrawal
- Reach 25 registered users
- Click "Request Withdrawal"
- Wait for admin approval
- Get paid!

---

## 🔑 Key Points

### Earnings
- **5 Birr** per registered user
- **125 Birr** per 25 referrals (minimum withdrawal)
- Unlimited earning potential

### Withdrawal
- **Minimum**: 25 registered users
- **Amount**: 125 Birr (25 × 5)
- **Process**: Request → Admin Review → Payment
- **Multiple**: Can withdraw every 25 referrals

### Fraud Detection
The system automatically detects:
- Multiple registrations from same IP (max 3)
- Multiple registrations from same device (max 3)
- Rapid registrations (5+ per hour)
- Self-referrals (same IP as referrer)

**Flagged accounts cannot withdraw until reviewed by admin.**

---

## 💡 Tips for Success

### 1. Share Strategically
- Post in social media groups
- Share in WhatsApp/Telegram chats
- Tell friends and family in person
- Add to your email signature

### 2. Be Transparent
- Explain what the platform is
- Mention the benefits of joining
- Tell them it's free to register
- Share your success story

### 3. Track Progress
- Check dashboard daily
- Monitor which links work best
- Celebrate milestones (10, 20, 25 referrals)

### 4. Stay Legitimate
- Don't create fake accounts
- Don't use VPNs to bypass detection
- Share genuinely with real people
- Quality over quantity

---

## 🎯 Quick Reference

### Available Languages
- English (en)
- Tigrinya (ti) - ትግርኛ
- Amharic (am) - አማርኛ
- Oromo (om) - Afaan Oromoo

### Payment Methods
- Telebirr
- M-Pesa
- Bank Transfer

### Withdrawal Status
- **Pending**: Waiting for admin review
- **Approved**: Admin approved, payment processing
- **Paid**: Money sent to your account
- **Rejected**: Not approved (see reason)

### Dashboard Stats
- **Total Referrals**: All-time registered users
- **Available**: Not yet withdrawn
- **Available Balance**: Money you can withdraw
- **Total Withdrawn**: Lifetime earnings

---

## ❓ FAQ

### How long does withdrawal take?
Admin reviews withdrawals regularly. Once approved and paid, you'll receive the money according to your payment method (usually 1-3 business days).

### Can I change my payment method?
Yes! Update anytime in the referral dashboard.

### What if my account is flagged?
Contact admin with explanation. Legitimate cases will be reviewed and unflagged.

### Do referred users need to do anything?
No! They just need to register. They get a great marketplace, you get paid.

### Can I refer business customers?
Yes! Anyone who registers counts, whether buyer, seller, or both.

### Is there a limit to how much I can earn?
No limit! The more people you refer, the more you earn.

### What happens to my balance if withdrawal is rejected?
The referrals return to your available pool. You can request withdrawal again.

---

## 🔗 Important URLs

### User Dashboard
```
/referral-dashboard
```

### Registration with Referral
```
/register?ref=YOUR_REFERRAL_CODE
```

### API Endpoints
```
GET    /api/referrals/stats
POST   /api/referrals/withdraw
PATCH  /api/referrals/payment-method
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify you're logged in
3. Check that payment method is set
4. Review the full implementation guide: `REFERRAL-PROGRAM-IMPLEMENTATION.md`

---

## 🎉 Start Earning Now!

1. ✅ Feature is live
2. ✅ Click "💰 Make Money"
3. ✅ Set up payment
4. ✅ Share your link
5. ✅ Watch earnings grow!

**Good luck and happy referring! 🚀**

