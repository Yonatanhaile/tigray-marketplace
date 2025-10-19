# Create Listing Troubleshooting Guide

## Issue: "Failed to create listing"

### Step 1: Check Backend Server Status

#### A. Verify Backend is Running
1. Open your Render dashboard: https://dashboard.render.com/
2. Find your backend service (tigray-marketplace-server)
3. Check status: Should be "Live" (green)
4. Check logs for any errors

#### B. Test Backend API Directly
Open a new browser tab and try:
```
https://tigray-marketplace-server.onrender.com/api/listings
```

**Expected Response**: JSON with listings or empty array
**If Error 404**: Backend is not deployed or URL is wrong
**If Connection Failed**: Backend server is down

### Step 2: Check Environment Variables

#### On Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify `VITE_API_URL` is set to:
   ```
   https://tigray-marketplace-server.onrender.com
   ```
5. If missing or wrong, add/update it
6. **Important**: Redeploy after changing env vars

### Step 3: Check Browser Console

1. Open your deployed site
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Try creating a listing
5. Look for errors

#### Common Errors:

**"Network Error"**
- Backend is down or unreachable
- CORS issue
- Wrong API URL

**"401 Unauthorized"**
- You're not logged in
- Token expired
- Session issue

**"403 Forbidden"**
- Your account doesn't have seller role
- Check: Registration → "I want to sell items" was checked

**"500 Internal Server Error"**
- Backend crashed
- Database connection failed
- Check backend logs on Render

### Step 4: Check Your Account Role

#### Verify You're a Seller:
1. Open browser console (F12)
2. Type: `localStorage.getItem('user')`
3. Press Enter
4. Look for `"roles":["buyer","seller"]` or `["seller"]`
5. If you only see `["buyer"]`, you need to register as a seller

#### Re-register as Seller:
1. Logout
2. Register again
3. **✓ Check "I want to sell items"**
4. Complete registration
5. Try creating listing again

### Step 5: Check Image Upload

Images are uploaded to Cloudinary before creating the listing.

#### Test Image Upload:
1. Open browser console (F12)
2. Click "Choose Files" in Create Listing form
3. Select an image
4. Watch console for errors

#### Common Image Upload Errors:

**"Failed to generate upload signature"**
- Backend can't connect to Cloudinary
- Missing Cloudinary credentials
- Check backend logs

**"File size exceeds 8MB"**
- Your image is too large
- Resize or compress image
- Try a different image

**"File type not allowed"**
- Only JPG, PNG, WebP allowed
- Convert your image
- Try a different format

### Step 6: Test with Minimal Data

Try creating a listing with bare minimum:

1. **Title**: "Test Item"
2. **Description**: "Test description"
3. **Category**: Select any
4. **Subcategory**: Select any (will appear after category)
5. **Location**:
   - Region: "Addis Ababa"
   - Zone: "Arada"
   - Address: "Test address"
6. **Price**: 100
7. **Condition**: Keep default "Good"
8. **Payment Method**: Check "Cash" only
9. **Payment Instructions**: Will auto-fill for cash
10. **Image**: Upload one small image (< 1MB)
11. Click "Create Listing"

### Step 7: Check Network Tab

1. Press F12 → Go to "Network" tab
2. Try creating a listing
3. Look for the POST request to `/api/listings`
4. Click on it to see details

#### Check Request:
- **URL**: Should be `https://your-backend.onrender.com/api/listings`
- **Method**: POST
- **Status**: Should be 201 (success) or 4xx/5xx (error)
- **Headers**: Should have `Authorization: Bearer <token>`
- **Payload**: Should show your listing data

#### Check Response:
- Click "Response" tab
- If error, read the error message
- Copy error and check solutions below

### Common Error Messages & Solutions

#### "Only sellers can create listings"
**Problem**: Your account doesn't have seller role
**Solution**: 
1. Logout
2. Register again with "I want to sell items" checked

#### "At least one payment method is required"
**Problem**: Form didn't capture payment methods
**Solution**:
1. Make sure to check at least one payment method checkbox
2. Fill in the payment instructions that appear

#### "Region is required" / "Zone is required"
**Problem**: Location not filled
**Solution**:
1. Select a Region first
2. Then Zone dropdown will populate
3. Fill in Specific Address

#### "Title is required" / "Description is required"
**Problem**: Form validation failed
**Solution**: Fill all required fields marked with *

#### "Failed to generate upload signature"
**Problem**: Backend can't access Cloudinary
**Solution**: Contact admin - backend needs Cloudinary configuration

#### "Network Error"
**Problem**: Can't reach backend
**Solution**:
1. Check backend is running on Render
2. Check VITE_API_URL in Vercel env vars
3. Try again in a few minutes (Render free tier sleeps)

### Step 8: Backend Wake-Up (Render Free Tier)

If using Render free tier, backend sleeps after 15 minutes of inactivity.

#### Wake up backend:
1. Visit: `https://tigray-marketplace-server.onrender.com/api/listings`
2. Wait 30-60 seconds for it to wake up
3. You'll see it loading
4. Once it responds, try creating listing again

### Step 9: Check Required Environment Variables

#### Backend Must Have:
```env
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-key>
CLOUDINARY_API_SECRET=<your-cloudinary-secret>
```

#### Frontend Must Have:
```env
VITE_API_URL=https://tigray-marketplace-server.onrender.com
```

### Step 10: Test Locally

If still failing, test locally:

```bash
# Terminal 1 - Start Backend
cd server
npm install
npm run dev

# Terminal 2 - Start Frontend
cd client
npm install
# Create .env.local file with:
# VITE_API_URL=http://localhost:3000
npm run dev
```

Visit: http://localhost:5173
Try creating a listing

If it works locally but not in production:
- Environment variable issue
- Backend deployment issue
- CORS configuration issue

### Getting Detailed Error Info

Add this to browser console:
```javascript
// Enable verbose logging
localStorage.setItem('DEBUG', '*');

// Check current user
console.log('User:', JSON.parse(localStorage.getItem('user')));

// Check token
console.log('Token:', localStorage.getItem('token'));

// Try manual API call
fetch('https://tigray-marketplace-server.onrender.com/api/listings', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Still Not Working?

#### Collect This Information:

1. **Browser Console Errors** (F12 → Console)
   - Copy all red errors
   
2. **Network Request** (F12 → Network → /api/listings)
   - Request URL
   - Request Headers
   - Request Payload
   - Response Status
   - Response Body

3. **Your Account Info**
   ```javascript
   console.log({
     user: JSON.parse(localStorage.getItem('user')),
     hasToken: !!localStorage.getItem('token')
   });
   ```

4. **Backend Logs** (from Render dashboard)
   - Any errors when you try to create listing

5. **What You Did**
   - Exact steps you took
   - What fields you filled
   - When the error appeared

#### Contact Developer:
- **Email**: yonatanhaile06@gmail.com
- **Phone**: +251 914 888 890
- **Include**: All information from above

### Quick Checklist

Before contacting support, verify:

- [ ] Backend is Live on Render
- [ ] VITE_API_URL is set in Vercel
- [ ] You're logged in (token exists)
- [ ] Your account has seller role
- [ ] All required fields are filled
- [ ] At least one payment method selected
- [ ] At least one image uploaded (< 8MB)
- [ ] Image is JPG, PNG, or WebP
- [ ] Browser console shows the error
- [ ] Network tab shows the API request

---

**Last Updated**: October 19, 2025

