# 🐛 Error Debugging Guide - "Oops! Something went wrong"

## Current Status

The error boundary is now configured to **ALWAYS show error details** (not just in development mode).

### How to See What's Causing the Error

1. **When you see "Oops! Something went wrong" page**:
   - Look for the **"Error Details"** box (red background)
   - It will show:
     - Error Message
     - Full Stack Trace
     - Component Stack (which component failed)

2. **Check Browser Console** (F12):
   - Look for: `❌ ERROR CAUGHT BY BOUNDARY:`
   - This will have complete error information

---

## Common Causes & Fixes

### 1. Missing Environment Variables

**Error**: `Cannot read property 'VITE_API_URL' of undefined`

**Fix**: Set Vercel environment variables:
```
VITE_API_URL=https://tigray-marketplace-api.onrender.com
VITE_SOCKET_URL=https://tigray-marketplace-api.onrender.com
```

### 2. API Connection Failures

**Error**: `Network Error` or `Failed to fetch`

**Possible Causes**:
- Backend is down (Render sleeping)
- CORS issues
- Wrong API URL

**Fix**:
1. Check if backend is running: https://tigray-marketplace-api.onrender.com/health
2. Wait 1-2 minutes for Render to wake up
3. Check Render dashboard for deploy status

### 3. Invalid Data Format

**Error**: `Cannot read property 'map' of undefined`

**Cause**: API returned unexpected data format

**Fix**:
- Check API response in Network tab
- Ensure backend is returning correct format
- Add null checks in components

### 4. Authentication Issues

**Error**: `User is not authenticated` or `Token expired`

**Fix**:
1. Logout and login again
2. Clear localStorage: `localStorage.clear()`
3. Check token in localStorage: `localStorage.getItem('token')`

### 5. Socket.IO Connection Errors

**Error**: `Socket connection timeout`

**Cause**: Wrong VITE_SOCKET_URL or backend not ready

**Fix**:
- Set VITE_SOCKET_URL in Vercel
- Check backend logs for Socket.IO initialization
- Ensure backend is running

### 6. CSS/Tailwind Class Errors

**Error**: `Unknown class` or rendering issues

**Cause**: Using non-existent Tailwind classes

**Fix**:
- Check `client/src/index.css` for custom classes
- Ensure all custom animations are defined
- Use only valid Tailwind classes

---

## Step-by-Step Debugging

### Step 1: Identify the Error

1. Go to the page showing "Oops! Something went wrong"
2. Read the **Error Message** in the red box
3. Note the **Component Stack** (which component failed)
4. Open Browser Console (F12) and find the detailed error log

### Step 2: Check Common Issues

```javascript
// Run these in browser console:

// 1. Check if user is logged in
console.log('User:', localStorage.getItem('user'));

// 2. Check if token exists
console.log('Token:', localStorage.getItem('token'));

// 3. Check API URL
console.log('API URL:', import.meta.env.VITE_API_URL);

// 4. Check Socket URL
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);

// 5. Test API connection
fetch('https://tigray-marketplace-api.onrender.com/health')
  .then(r => r.json())
  .then(data => console.log('API Health:', data))
  .catch(err => console.error('API Error:', err));
```

### Step 3: Check Network Requests

1. Open DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Look for failed requests (red)
5. Click on failed request
6. Check:
   - Status code (500, 404, 403, etc.)
   - Response body
   - Request headers

### Step 4: Check Backend Status

1. Go to https://dashboard.render.com/
2. Find `tigray-marketplace-api`
3. Check:
   - Status: Should be "Live" (green)
   - Logs: Look for errors
   - Last deploy: Should be recent

### Step 5: Clear Cache & Try Again

```bash
# In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## Error Patterns & Solutions

### Pattern 1: "Cannot read property 'X' of undefined"

**Means**: Trying to access a property of something that doesn't exist

**Example**:
```javascript
// Error: Cannot read property 'name' of undefined
user.name  // user is undefined

// Fix: Add optional chaining
user?.name

// Or null check
if (user && user.name) {
  // use user.name
}
```

### Pattern 2: "X is not a function"

**Means**: Trying to call something that's not a function

**Example**:
```javascript
// Error: listingsAPI.getAll is not a function
// Cause: API module not imported correctly

// Fix: Check import
import { listingsAPI } from '../services/api';
```

### Pattern 3: "Failed to compile"

**Means**: Syntax error in code

**Fix**:
- Check the file mentioned in error
- Look for missing brackets, quotes, commas
- Check for typos in JSX

### Pattern 4: "Hydration mismatch"

**Means**: Server-rendered HTML doesn't match client

**Fix**:
- Usually harmless in dev mode
- Ensure no dynamic content in initial render
- Check for server/client time mismatches

---

## Quick Fixes

### Fix 1: Reset Everything

```javascript
// Run in console:
localStorage.clear();
sessionStorage.clear();
window.location.href = '/';
```

### Fix 2: Force Logout

```javascript
// Run in console:
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.href = '/login';
```

### Fix 3: Test API Manually

```bash
# In terminal or browser:
curl https://tigray-marketplace-api.onrender.com/health

# Should return:
# {"status":"ok"}
```

### Fix 4: Check Vercel Build Logs

1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to "Deployments"
4. Click latest deployment
5. Check "Build Logs" for errors

### Fix 5: Redeploy Everything

**Frontend (Vercel)**:
1. Go to Deployments
2. Click ⋮ on latest
3. Click "Redeploy"

**Backend (Render)**:
1. Go to Render Dashboard
2. Click "Manual Deploy"
3. Wait 5-10 minutes

---

## Preventing Future Errors

### 1. Add Null Checks

```javascript
// Bad
const name = user.name;

// Good
const name = user?.name || 'Guest';
```

### 2. Handle API Errors

```javascript
// Bad
const data = await api.getData();

// Good
try {
  const data = await api.getData();
  // use data
} catch (error) {
  console.error('Failed to fetch data:', error);
  toast.error('Failed to load data');
}
```

### 3. Validate Data

```javascript
// Bad
data.items.map(item => ...)

// Good
if (Array.isArray(data?.items)) {
  data.items.map(item => ...)
}
```

### 4. Use Loading States

```javascript
if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!data) return <div>No data</div>;

// Now safe to use data
return <div>{data.content}</div>;
```

---

## Getting Help

### Information to Provide:

1. **Error Message** (from red box)
2. **Browser Console Logs** (copy all red errors)
3. **Network Tab** (screenshot of failed requests)
4. **Steps to Reproduce**:
   - What page were you on?
   - What did you click?
   - What were you trying to do?
5. **User Role**: Buyer, Seller, or Admin?
6. **Browser**: Chrome, Firefox, Safari, etc.
7. **Device**: Desktop, Mobile, Tablet?

### Contact:
- **Email**: yonatanhaile06@gmail.com
- **Phone**: +251 914 888 890

---

## Most Likely Causes (In Order)

1. ✅ **Backend is sleeping** - Wait 1-2 minutes and refresh
2. ✅ **Missing env vars** - Set VITE_API_URL and VITE_SOCKET_URL in Vercel
3. ✅ **Token expired** - Logout and login again
4. ✅ **CORS issues** - Check backend CORS configuration
5. ✅ **Invalid data format** - Check API responses in Network tab

---

**Last Updated**: After UI modernization  
**Status**: Error boundary now shows full error details  
**Priority**: Check error details box when you see the error page

