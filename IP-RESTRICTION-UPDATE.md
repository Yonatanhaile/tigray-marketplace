# IP Registration Restriction Update

## Summary
Updated the registration system to allow **only ONE user account per IP address** (previously allowed 2).

## Changes Made

### 1. Email/Password Registration (`register` function)
**File**: `server/src/controllers/authController.js`

- ✅ Changed `MAX_USERS_PER_IP` from `2` to `1`
- ✅ Updated error message to reflect "one account per network"
- ✅ Updated success log message

### 2. OTP-Based Registration (`verifyOTPHandler` function)
**File**: `server/src/controllers/authController.js`

- ✅ Added IP address capture and validation
- ✅ Added IP-based registration check (same 1 account limit)
- ✅ Added registration metadata tracking for OTP registrations
- ✅ Added proper error handling and logging

## How It Works

### Registration Flow
1. When a user tries to register, the system captures their IP address
2. The system checks how many accounts are already registered from that IP
3. If an account already exists from that IP, registration is **BLOCKED**
4. Error message: *"An account has already been registered from this network. Only one account per network is allowed."*

### IP Address Capture
The system captures IP addresses from multiple sources (to handle proxies/load balancers):
```javascript
const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                 req.headers['x-real-ip'] || 
                 req.ip || 
                 req.connection.remoteAddress || 
                 'unknown';
```

### Development Exception
- Local IP addresses (127.0.0.1, localhost, 192.168.x.x, etc.) are **exempt** from this restriction
- This allows developers to test multiple accounts locally

## Registration Methods Protected

✅ **Email/Password Registration** - Protected  
✅ **OTP/Phone Registration** - Protected  

Both registration methods now enforce the one-account-per-IP rule.

## Error Response

When a user tries to register from an IP that already has an account:

```json
{
  "error": true,
  "message": "An account has already been registered from this network. Only one account per network is allowed.",
  "code": "IP_LIMIT_EXCEEDED"
}
```

## Logging

The system logs all registration attempts:
- ✅ Successful registrations with IP address
- ❌ Blocked registrations with details (IP, email/phone, reason)
- ⚠️ Development IP bypasses

## Testing

### To Test This Change:
1. Register a new account from a specific IP
2. Try to register another account from the same IP
3. You should receive the "IP_LIMIT_EXCEEDED" error

### Local Testing:
- Multiple registrations from localhost will still work (for development)

## Database

The IP address is stored in the user document:
```javascript
user.registrationMetadata = {
  ipAddress: "xxx.xxx.xxx.xxx",
  deviceFingerprint: "...",
  userAgent: "...",
  registeredAt: Date
}
```

## Security Benefits

1. **Prevents Multiple Accounts**: Users can't create multiple accounts from the same location
2. **Reduces Fraud**: Limits referral fraud and abuse
3. **Audit Trail**: All registrations are logged with IP addresses
4. **Consistent Enforcement**: Both email and OTP registration methods are protected

## Notes

- This restriction is based on **network IP address**, not device
- Users behind the same router/network will be limited to one account total
- VPN users will be limited per VPN IP address
- The existing Ethiopia-only registration check still applies

---

**Status**: ✅ Implemented and Active  
**Date**: November 22, 2025

