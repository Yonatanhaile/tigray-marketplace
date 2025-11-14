# Referral Program Implementation - Complete Guide

## 🎉 Implementation Complete!

A comprehensive referral/affiliate program has been successfully implemented with fraud detection and withdrawal management.

---

## 📋 Features Implemented

### ✅ Core Features
1. **💰 Earn 5 Birr per Referral** - Users earn 5 Birr for every person who registers through their unique referral link
2. **🔗 Unique Referral Links** - Each user gets a unique referral code and shareable link
3. **💳 Payment Method Setup** - Users can set up Telebirr, M-Pesa, or Bank Transfer for withdrawals
4. **📊 Real-time Dashboard** - Track referrals, earnings, and withdrawal history
5. **💸 Withdrawal System** - Request withdrawals after reaching 25 registered users
6. **👮 Admin Approval** - All withdrawal requests require admin review and approval
7. **🛡️ Fraud Detection** - Automatic detection of suspicious referral patterns

---

## 🔒 Fraud Detection Features

The system includes multiple layers of fraud detection:

1. **IP Address Tracking** - Maximum 3 registrations per IP address
2. **Device Fingerprinting** - Maximum 3 registrations per device
3. **Time-Based Detection** - Flags rapid registrations (5+ in 1 hour)
4. **Self-Referral Prevention** - Detects if registration IP matches referrer's IP
5. **Account Flagging** - Suspicious accounts are flagged and withdrawals are blocked

---

## 📁 Files Created/Modified

### Backend Files

#### New Files Created:
- `server/src/models/Referral.js` - Referral model with withdrawal tracking
- `server/src/controllers/referralController.js` - Controller with all referral logic
- `server/src/routes/referrals.js` - API routes for referral program

#### Modified Files:
- `server/src/models/User.js` - Added referral tracking fields
- `server/src/models/index.js` - Exported Referral model
- `server/src/controllers/authController.js` - Added referral tracking during registration
- `server/src/server.js` - Added referral routes

### Frontend Files

#### New Files Created:
- `client/src/pages/ReferralDashboard.jsx` - Complete referral dashboard UI

#### Modified Files:
- `client/src/App.jsx` - Added referral dashboard route
- `client/src/components/Layout.jsx` - Added "Make Money" button to navbar
- `client/src/pages/Register.jsx` - Capture referral code from URL
- `client/src/i18n/locales/en.json` - English translations
- `client/src/i18n/locales/ti.json` - Tigrinya translations
- `client/src/i18n/locales/am.json` - Amharic translations
- `client/src/i18n/locales/om.json` - Oromo translations

---

## 🚀 How to Use

### For Users:

1. **Access Referral Dashboard**
   - Click "💰 Make Money" button in the navbar (available when logged in)

2. **Set Up Payment Method**
   - Choose Telebirr, M-Pesa, or Bank Transfer
   - Enter payment details

3. **Share Referral Link**
   - Copy your unique referral link
   - Share with friends and family
   - Track registrations in real-time

4. **Request Withdrawal**
   - Reach 25 registered users
   - Click "Request Withdrawal" button
   - Wait for admin approval

5. **Track Progress**
   - View total referrals
   - See available balance
   - Check withdrawal history

### For Admins:

Admin endpoints are available at:
- `GET /api/referrals/admin/withdrawals` - View all withdrawal requests
- `PATCH /api/referrals/admin/withdrawals/:referralId/:withdrawalId` - Process withdrawals

**Actions available:**
- `approve` - Approve withdrawal for processing
- `paid` - Mark as paid (updates user's total earnings)
- `reject` - Reject withdrawal (releases referrals back to available pool)

---

## 📡 API Endpoints

### User Endpoints (Authenticated)

```
GET    /api/referrals/program          - Get or create referral program
GET    /api/referrals/stats            - Get detailed referral statistics
PATCH  /api/referrals/payment-method   - Update payment method
POST   /api/referrals/withdraw         - Request withdrawal
```

### Admin Endpoints (Require Admin Role)

```
GET    /api/referrals/admin/withdrawals                        - Get all withdrawals
PATCH  /api/referrals/admin/withdrawals/:referralId/:withdrawalId  - Process withdrawal
```

---

## 💾 Database Schema

### Referral Model Fields:

```javascript
{
  userId: ObjectId,              // User who owns this referral program
  referralCode: String,          // Unique 8-character code
  paymentMethod: {
    type: String,                // 'bank_transfer', 'telebirr', 'mpesa'
    details: String              // Payment details
  },
  referredUsers: [{
    userId: ObjectId,            // Referred user
    registeredAt: Date,
    ipAddress: String,           // For fraud detection
    deviceFingerprint: String,   // For fraud detection
    includeInWithdrawal: ObjectId // Withdrawal this was included in
  }],
  withdrawalRequests: [{
    amount: Number,              // 5 Birr × referralCount
    referralCount: Number,       // How many referrals (multiple of 25)
    status: String,              // 'pending', 'approved', 'paid', 'rejected'
    requestedAt: Date,
    processedAt: Date,
    processedBy: ObjectId,       // Admin who processed
    paymentProof: String,        // URL to payment proof
    rejectionReason: String,
    paymentMethodSnapshot: {...} // Payment method at time of request
  }],
  totalEarnings: Number,         // Total paid out
  totalWithdrawn: Number,        // Total withdrawn
  availableBalance: Number,      // Current available balance
  suspiciousActivity: {
    flagged: Boolean,
    reasons: [String],
    flaggedAt: Date
  }
}
```

### User Model - New Fields:

```javascript
{
  referredBy: String,           // Referral code that referred this user
  registrationMetadata: {
    ipAddress: String,
    deviceFingerprint: String,
    userAgent: String,
    registeredAt: Date
  }
}
```

---

## 🔧 Configuration

### Constants (in `referralController.js`):

```javascript
const WITHDRAWAL_THRESHOLD = 25;      // Minimum referrals for withdrawal
const EARNINGS_PER_REFERRAL = 5;     // 5 Birr per referral
const MAX_REGISTRATIONS_PER_IP = 3;   // Fraud detection limit
const MAX_REGISTRATIONS_PER_DEVICE = 3; // Fraud detection limit
const SUSPICIOUS_TIME_WINDOW = 3600000; // 1 hour in milliseconds
```

### Environment Variables Required:

```bash
CLIENT_URL=https://your-frontend-url.com  # For generating referral links
```

---

## 🎨 UI/UX Features

### Dashboard Sections:

1. **Stats Cards**
   - Total Referrals (all-time)
   - Available Referrals (not yet withdrawn)
   - Available Balance (in Birr)
   - Total Withdrawn (lifetime)

2. **Withdrawal Section**
   - Shows withdrawable amount
   - Request withdrawal button
   - Progress indicator
   - Disabled if below threshold

3. **Referral Link**
   - Unique shareable link
   - One-click copy functionality
   - Instructions for sharing

4. **Payment Method Setup**
   - Multiple payment options
   - Form validation
   - Secure storage

5. **Withdrawal History**
   - All past withdrawal requests
   - Status badges (Pending, Approved, Paid, Rejected)
   - Timestamps and amounts

6. **Referral List**
   - All referred users
   - Registration dates
   - Status (Available or Withdrawn)

7. **How It Works Guide**
   - Step-by-step instructions
   - Clear explanation of the process

### Mobile Responsive
- Fully responsive design
- Mobile menu includes "Make Money" link
- Touch-friendly interface

---

## 🌍 Multi-Language Support

Translations added for all 4 languages:
- **English (en)** ✅
- **Tigrinya (ti)** ✅
- **Amharic (am)** ✅
- **Oromo (om)** ✅

---

## 🔐 Security Measures

1. **Authentication Required** - All endpoints require JWT authentication
2. **Admin Authorization** - Withdrawal processing requires admin role
3. **Input Validation** - All inputs are validated
4. **Rate Limiting** - API rate limiting is in place
5. **Fraud Detection** - Multiple fraud detection mechanisms
6. **Payment Method Snapshot** - Payment details are saved at withdrawal request time
7. **IP & Device Tracking** - Anonymous tracking for fraud prevention

---

## 📈 Admin Workflow

### Handling Withdrawal Requests:

1. **View Pending Requests**
   ```bash
   GET /api/referrals/admin/withdrawals?status=pending
   ```

2. **Approve Withdrawal**
   ```bash
   PATCH /api/referrals/admin/withdrawals/:referralId/:withdrawalId
   Body: { "action": "approve" }
   ```

3. **Mark as Paid**
   ```bash
   PATCH /api/referrals/admin/withdrawals/:referralId/:withdrawalId
   Body: { 
     "action": "paid",
     "paymentProof": "https://proof-url.com/receipt.pdf"
   }
   ```

4. **Reject if Suspicious**
   ```bash
   PATCH /api/referrals/admin/withdrawals/:referralId/:withdrawalId
   Body: { 
     "action": "reject",
     "rejectionReason": "Suspicious activity detected"
   }
   ```

---

## 🧪 Testing the Feature

### Test Flow:

1. **Register a new user** (User A)
2. **Navigate to Referral Dashboard** (💰 Make Money button)
3. **Copy referral link**
4. **Open incognito/private window**
5. **Register another user** (User B) using the referral link
6. **Go back to User A's dashboard** - should see 1 referral
7. **Repeat 24 more times** to reach 25 referrals
8. **Set up payment method**
9. **Request withdrawal**
10. **Check admin panel** for withdrawal requests

### Fraud Detection Testing:

1. Try registering multiple users from same IP - should be flagged after 3
2. Try rapid registrations - should be flagged after 5 in 1 hour
3. Check `suspiciousActivity.flagged` field in database

---

## 📊 Business Logic

### Withdrawal Calculation:

```javascript
// Example: User has 67 referrals
const totalReferrals = 67;
const withdrawableCount = Math.floor(67 / 25) * 25; // = 50
const withdrawableAmount = 50 * 5; // = 250 Birr
const remainingReferrals = 67 - 50; // = 17 (need 8 more for next withdrawal)
```

### Multiple Withdrawals:

Users can make multiple withdrawal requests:
- First withdrawal: 25 referrals = 125 Birr
- Second withdrawal: 25 more referrals = 125 Birr
- Third withdrawal: 25 more referrals = 125 Birr
- And so on...

---

## 🐛 Troubleshooting

### Common Issues:

1. **Referral not tracked**
   - Check if referral code is valid
   - Verify registration includes referralCode in request body
   - Check server logs for errors

2. **Cannot withdraw**
   - Verify user has 25+ available referrals
   - Check if payment method is set up
   - Verify account is not flagged

3. **Account flagged**
   - Review `suspiciousActivity.reasons` in database
   - Admin can manually unflag in database if legitimate

4. **Frontend not showing dashboard**
   - Verify user is authenticated
   - Check that route is added to App.jsx
   - Check browser console for errors

---

## 🔄 Future Enhancements (Optional)

1. **Email Notifications**
   - Notify users when withdrawal is approved/paid
   - Send reminders when close to 25 referrals

2. **Referral Tiers**
   - Higher earnings for more referrals (e.g., 10 Birr after 100 referrals)

3. **Social Sharing**
   - Share directly to WhatsApp, Telegram, Facebook
   - Generate share images with QR codes

4. **Leaderboard**
   - Show top referrers
   - Monthly competitions

5. **Analytics**
   - Conversion rates
   - Referral source tracking
   - Geographic distribution

---

## 📝 Notes

- The system is fully functional and ready for production
- All translations are complete for 4 languages
- Fraud detection is active and will flag suspicious accounts
- Admin approval is required for all withdrawals
- The feature is mobile-responsive and accessible

---

## ✅ Checklist

- [x] Backend models created
- [x] API endpoints implemented
- [x] Fraud detection logic added
- [x] Frontend dashboard created
- [x] Navigation updated
- [x] Registration updated to capture referrals
- [x] All translations added (4 languages)
- [x] Admin endpoints created
- [x] Security measures implemented
- [x] No linting errors
- [x] Mobile responsive design
- [x] Documentation complete

---

## 🎯 Summary

The referral program is **fully implemented and ready to use**! Users can now:
- Share their referral links
- Earn 5 Birr per registered user
- Request withdrawals after 25 referrals
- Track their earnings in real-time

Admins can:
- Review withdrawal requests
- Approve/reject withdrawals
- Monitor for fraud
- Process payments

The system includes comprehensive fraud detection to prevent abuse while providing a seamless experience for legitimate users.

**Status: ✅ COMPLETE & PRODUCTION READY**

