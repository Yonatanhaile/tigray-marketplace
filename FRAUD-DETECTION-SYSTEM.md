# Referral Program - Fraud Detection System

## Overview
The referral program now includes a comprehensive fraud detection system that prevents users from abusing the referral system through multiple accounts, VPNs, or other fraudulent methods.

## How It Works

### 1. Device Fingerprinting (Frontend)

**Location:** `client/src/utils/deviceFingerprint.js`

When a user registers, the system collects:
- **Screen Information**: Resolution, color depth, available screen size
- **Browser Information**: User agent, language, platform, vendor, hardware concurrency
- **Timezone**: Timezone and offset
- **WebGL Info**: GPU vendor and renderer
- **Canvas Fingerprint**: Unique canvas rendering signature
- **Installed Fonts**: Detected system fonts
- **Audio Context**: Audio fingerprint

All this data is hashed into a unique device fingerprint that's nearly impossible to replicate without the exact same device and browser configuration.

### 2. Data Collection During Registration

**Location:** `client/src/pages/Register.jsx`

When a user registers with a referral code:
```javascript
- Device fingerprint (unique hash)
- Full device info object
- Automatically sent with registration data
```

### 3. Backend Processing

**Location:** `server/src/controllers/authController.js`

The backend captures:
- **IP Address**: Handles proxies, forwarded headers
- **Device Fingerprint**: From frontend
- **User Agent**: Browser identification
- **Registration timestamp**

All metadata is stored in the user's `registrationMetadata` field.

## Fraud Detection Checks

**Location:** `server/src/controllers/referralController.js`

### Check 1: Multiple Registrations from Same IP
- **Threshold**: Max 3 registrations per IP address
- **Flags if**: 3 or more registrations from same IP
- **Warning if**: 2+ registrations from same IP
- **Detects**: User creating multiple accounts from same location

### Check 2: Multiple Registrations from Same Device
- **Threshold**: Max 3 registrations per device fingerprint
- **Flags if**: 3 or more registrations from same device
- **Warning if**: 2+ registrations from same device
- **Detects**: User creating multiple accounts on same device

### Check 3: Rapid Registrations
- **Time Window**: 1 hour (3600000ms)
- **Threshold**: Max 5 registrations within 1 hour
- **Flags if**: 5+ registrations in 1 hour
- **Warning if**: 3+ registrations in 1 hour
- **Detects**: Automated account creation or mass registration

### Check 4: Same IP as Referrer
- **Checks**: New user's IP against referrer's registration IP
- **Flags if**: IPs match
- **Detects**: Self-referral (user referring themselves)

### Check 5: Same Device as Referrer
- **Checks**: New user's device fingerprint against referrer's
- **Flags if**: Device fingerprints match
- **Detects**: Self-referral from same device

### Check 6: Global Device Check
- **Threshold**: Device used across 5+ referral programs
- **Flags if**: Device fingerprint found in 5+ different referral accounts
- **Detects**: Systematic fraud across multiple accounts

### Check 7: Suspicious IP Patterns
- **Checks**: Private/local IP addresses
- **Warning if**: IP is 10.x.x.x, 192.168.x.x, or 127.0.0.1
- **Detects**: VPN, proxy, or development environment

## What Happens When Fraud is Detected

### 1. Automatic Flagging
```javascript
{
  suspiciousActivity: {
    flagged: true,
    reasons: [
      "Too many registrations from IP: xxx.xxx.xxx.xxx (4 total)",
      "Registration IP matches referrer IP - possible self-referral"
    ],
    flaggedAt: "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Withdrawal Blocking
- User **CANNOT** request withdrawals while flagged
- Existing withdrawal requests remain pending
- Earnings are tracked but locked

### 3. Admin Notification
- Logs contain detailed fraud alerts
- Admin can review flagged accounts
- Admin can manually approve/reject after review

### 4. User Notification
- Red alert banner on Referral Dashboard
- Lists all fraud detection reasons
- Explains consequences and next steps
- Prompts to contact support if legitimate

## Admin Features

### View Flagged Accounts
Admins can query flagged referral accounts:
```javascript
// Find all flagged accounts
Referral.find({ 'suspiciousActivity.flagged': true })
```

### Manual Review
- Review fraud reasons
- Check IP/device patterns
- Verify user legitimacy
- Unflag false positives (manual database update)

### Withdrawal Management
- Reject withdrawals from flagged accounts
- Approve legitimate withdrawals after review
- Provide rejection reasons

## Logging

### Fraud Detection Logs
```
✅ No fraud detected for referral ABC12345
⚠️ WARNING - Suspicious patterns detected for referral ABC12345
🚨 FRAUD DETECTED for referral ABC12345
⚠️ ADMIN ALERT: Referral account 60a1b2c3d4e5f6g7h8i9j0k1 has been flagged
```

### Registration Logs
```
Running fraud detection for referral ABC12345
Checking IP: 123.456.789.012, Device: a1b2c3d4e5f6g7h8
IP 123.456.789.012 has 2 existing registrations
Device a1b2c3d4e5f6g7h8 has 1 existing registrations
Found 1 registrations in the last hour
```

## Testing Fraud Detection

### Scenario 1: Self-Referral
1. User A creates account
2. User A gets referral code ABC12345
3. User A tries to register again with same code
4. **Result**: ❌ Flagged (same IP and device)

### Scenario 2: Multiple Accounts from Same Location
1. User A refers User B (same WiFi)
2. User A refers User C (same WiFi)
3. User A refers User D (same WiFi - 4th from same IP)
4. **Result**: ❌ Flagged after 3rd registration

### Scenario 3: Automated Registration
1. Script creates 5 accounts in 10 minutes
2. All use same referral code
3. **Result**: ❌ Flagged for rapid registrations

### Scenario 4: Legitimate Referral
1. User A shares code with friend
2. Friend registers from different IP and device
3. **Result**: ✅ No fraud detected

## Constants

```javascript
WITHDRAWAL_THRESHOLD = 25        // Min referrals to withdraw
EARNINGS_PER_REFERRAL = 5        // 5 Birr per referral
MAX_REGISTRATIONS_PER_IP = 3     // Max from same IP
MAX_REGISTRATIONS_PER_DEVICE = 3 // Max from same device
SUSPICIOUS_TIME_WINDOW = 3600000 // 1 hour in milliseconds
```

## Security Features

### 1. Device Fingerprinting
- ✅ Nearly impossible to duplicate
- ✅ Persists across browser sessions
- ✅ Not affected by clearing cookies
- ✅ Combines multiple browser characteristics

### 2. IP Tracking
- ✅ Handles proxy/VPN detection
- ✅ Checks against referrer's IP
- ✅ Tracks across all referrals

### 3. Rate Limiting
- ✅ Prevents automated account creation
- ✅ Detects suspicious patterns
- ✅ Time-based analysis

### 4. Cross-Account Detection
- ✅ Checks device fingerprint globally
- ✅ Prevents same device across multiple programs
- ✅ Identifies systematic abuse

## Bypassing Attempts (Detected)

### ❌ Won't Work:
1. **Incognito Mode**: Device fingerprint remains same
2. **Clearing Cookies**: Fingerprint regenerates identically
3. **Different Browser**: Device fingerprint still similar
4. **VPN**: IP changes but device fingerprint doesn't
5. **Multiple Accounts**: Device and IP patterns detected
6. **Family Members Same WiFi**: After 3 registrations, flagged

### ✅ Legitimate Use Cases:
1. **Different People, Different Devices**: No issues
2. **Time-Spaced Referrals**: Spread over weeks = OK
3. **Different Locations**: Different IPs = OK
4. **Public WiFi Referrals**: Device fingerprint differs = OK

## Privacy Considerations

### What We Collect:
- ✅ Technical device information only
- ✅ No personal identifying information
- ✅ Used exclusively for fraud detection
- ✅ Not shared with third parties

### What We DON'T Collect:
- ❌ Browsing history
- ❌ Personal files
- ❌ Contacts
- ❌ Location beyond IP
- ❌ Personally identifiable information

## Future Enhancements

### Potential Additions:
1. Machine learning pattern detection
2. Behavioral analysis
3. Email verification requirement
4. Phone verification for referrers
5. Referral code expiration
6. Whitelist/blacklist IP ranges
7. Geographic restrictions
8. Time-based earnings (first week: 5 Birr, second week: 3 Birr, etc.)

## Troubleshooting

### False Positive: Legitimate User Flagged
**Issue**: Multiple family members used same WiFi
**Solution**: Admin manual review and unflag
**Prevention**: Users should spread referrals over time

### False Negative: Fraud Not Detected
**Issue**: Sophisticated attacker using VMs with different IPs
**Solution**: Enhanced device fingerprinting, require phone verification
**Monitoring**: Regular review of withdrawal patterns

## Files Modified

1. ✅ `client/src/utils/deviceFingerprint.js` - NEW
2. ✅ `client/src/pages/Register.jsx` - Device fingerprint collection
3. ✅ `server/src/controllers/authController.js` - IP and device capture
4. ✅ `server/src/controllers/referralController.js` - Enhanced fraud detection
5. ✅ `client/src/pages/ReferralDashboard.jsx` - Visual fraud alerts

## Summary

The fraud detection system is now **fully integrated** and provides:
- ✅ Device fingerprinting
- ✅ IP address tracking
- ✅ Multiple fraud detection checks
- ✅ Automatic flagging
- ✅ Withdrawal blocking
- ✅ Admin alerts
- ✅ User notifications
- ✅ Comprehensive logging

Users attempting to abuse the referral system will be automatically detected and blocked from withdrawing funds.

