# 🚀 Render Deployment Guide

## Current Issue: "Failed to create listing"

### Root Cause
The Listing model's `status` enum was updated to include `'pending'`, but **Render needs time to redeploy** the backend with the new changes.

---

## ✅ Quick Fix Checklist

### Step 1: Wait for Render to Deploy (3-10 minutes)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Find your service**: `tigray-marketplace-api`
3. **Check Deploy Status**:
   - 🟡 **"Build in progress"** → Wait
   - 🟢 **"Live"** → Backend is updated ✅
   - 🔴 **"Deploy failed"** → Check logs (see troubleshooting below)

4. **Verify the latest commit**:
   - Should show: `"Fix: add pending status to Listing model enum"`
   - Commit hash: `6175818`

### Step 2: Verify Backend is Updated

**Method 1: Check Model Directly**
```bash
# Open Render Shell (Dashboard → tigray-marketplace-api → Shell)
cat src/models/Listing.js | grep -A 2 "enum:"
```

Should show:
```javascript
enum: ['draft', 'pending', 'active', 'sold', 'suspended', 'deleted'],
default: 'pending',
```

**Method 2: Test API Endpoint**
```bash
# Check health endpoint
curl https://tigray-marketplace-api.onrender.com/health
```

Should return: `{"status":"ok"}`

### Step 3: Test Listing Creation

1. **Login** to your website
2. **Navigate** to "Create Listing"
3. **Fill out the form** with ALL required fields:
   - ✅ Title
   - ✅ Description
   - ✅ Category & Subcategory
   - ✅ Region, Zone, Specific Address
   - ✅ Price
   - ✅ Condition
   - ✅ At least 1 image
   - ✅ At least 1 payment method (with instructions)
   - ✅ Pickup options

4. **Submit** and check for:
   - ✅ Success: "Listing created successfully! It will be reviewed by admin before going live."
   - ❌ Error: See troubleshooting below

---

## 🔍 Troubleshooting

### Issue 1: Still Getting "Failed to create listing"

**Possible Causes:**

#### A. Render hasn't finished deploying
- **Solution**: Wait 5-10 more minutes
- **Check**: Render dashboard shows "Live" status

#### B. Missing required fields
The backend requires ALL of these fields:

```javascript
{
  title: "string (max 200 chars)",
  description: "string (max 5000 chars)",
  price: 123 (number, min: 0),
  currency: "ETB",
  condition: "new|like-new|good|fair|poor|not-applicable",
  category: "string",
  subcategory: "string",
  location: {
    region: "string (required)",
    zone: "string (required)",
    specificAddress: "string (required, max 300 chars)"
  },
  images: [{url: "string", publicId: "string"}], // min 1
  payment_methods: ["string"], // min 1
  payment_instructions: {}, // object
  pickup_options: {
    pickup: false,
    courier: false,
    meeting_spots: []
  },
  highValue: false
}
```

**How to Debug:**
1. Open browser console (F12)
2. Look for: `"Listing data to send:"` log
3. Compare with required fields above
4. Check for missing or null values

#### C. Not registered as seller
**Error**: `"Only sellers can create listings"`

**Solution**:
1. Go to your profile settings
2. Check roles in localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('user')).roles
   ```
3. Should include `"seller"` or `"admin"`
4. If not, create a new account and check "I want to sell items"

#### D. Image upload failed
**Error**: `"Please upload at least one image"`

**Possible causes**:
- Image too large (max 8MB per image)
- Invalid format (only JPG, PNG, WebP)
- Cloudinary/S3 configuration issue

**Solution**:
1. Try smaller images (<2MB)
2. Use JPG or PNG format
3. Check Render logs for upload errors

#### E. Location validation failed
**Error**: `"Region is required"` or `"Zone/Sub-city is required"`

**Solution**:
1. Make sure to select region first
2. Then select zone (dropdown enables after region)
3. Fill in specific address

---

## 🐛 Backend Logs

### View Logs on Render

1. **Go to**: https://dashboard.render.com/
2. **Click**: `tigray-marketplace-api`
3. **Click**: "Logs" tab
4. **Look for**:
   - ✅ `"Server is running on port 3000"`
   - ✅ `"MongoDB connected"`
   - ❌ `"ValidationError"` → Check which field is failing
   - ❌ `"MongoError"` → Database connection issue

### Common Log Errors

#### Error: "status: `pending` is not a valid enum value"
- **Cause**: Old code still running (not deployed yet)
- **Solution**: Wait for Render to finish deploying

#### Error: "At least one payment method is required"
- **Cause**: `payment_methods` array is empty
- **Solution**: Frontend should send at least one method

#### Error: "Region is required" / "Zone/Sub-city is required"
- **Cause**: Location object is incomplete
- **Solution**: Check frontend sends all 3 location fields

---

## 📊 Database Check (MongoDB)

If you have access to MongoDB Atlas:

1. **Connect** to your cluster
2. **Find** the `listings` collection
3. **Check** if new documents have `status: "pending"`
4. **Verify** the schema allows `pending` status

---

## 🔄 Manual Redeploy

If automatic deployment didn't work:

1. **Go to**: https://dashboard.render.com/
2. **Select**: `tigray-marketplace-api`
3. **Click**: "Manual Deploy" → "Deploy latest commit"
4. **Wait**: 5-10 minutes for build to complete

---

## ⚡ Environment Variables Check

Make sure these are set in Render:

```
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://... (your MongoDB connection string)
JWT_SECRET=... (auto-generated)
CLOUDINARY_URL=cloudinary://... (if using Cloudinary)
FRONTEND_URL=https://tigray-marketplace-client.vercel.app
BACKEND_URL=https://tigray-marketplace-api.onrender.com
```

**To check**:
1. Render Dashboard → `tigray-marketplace-api`
2. "Environment" tab
3. Verify all variables are set (green checkmarks)

---

## 📞 Still Need Help?

### Collect This Information:

1. **Browser Console Error** (F12 → Console)
   - Full error message
   - Network tab → `/api/listings` response

2. **Render Backend Logs**
   - Last 50 lines from Logs tab
   - Any red error messages

3. **Your User Role**
   - Run in console: `JSON.parse(localStorage.getItem('user')).roles`

4. **Deploy Status**
   - Screenshot of Render dashboard showing deploy status
   - Latest commit hash shown

5. **Form Data**
   - What you entered in the form
   - Which fields were filled vs empty

### Contact Developer:
- **Email**: yonatanhaile06@gmail.com
- **Phone**: +251 914 888 890
- **Include**: All information from above

---

## ✅ Success Indicators

When it's working, you should see:

1. **Frontend**:
   - Toast: "Listing created successfully! It will be reviewed by admin before going live."
   - Redirects to Seller Dashboard
   - New listing appears with status badge "Pending Review"

2. **Backend Logs**:
   ```
   Listing created: [MongoDB ObjectId] by user [Your User ID]
   ```

3. **Database**:
   - New document in `listings` collection
   - `status: "pending"`
   - All fields populated correctly

---

## 🎯 Next Steps After Success

1. **Admin Approval**:
   - Login as admin (add `"admin"` to your user's roles in MongoDB)
   - Go to Admin Panel → Moderation tab
   - Approve your test listing

2. **Verify Public Visibility**:
   - Logout
   - Go to "Browse Listings"
   - Your listing should appear after approval

3. **Test Full Flow**:
   - Create listing → Pending
   - Admin approves → Active
   - Buyers can see it
   - Buyers can create intents
   - Messaging works

---

**Last Updated**: After commit `6175818`  
**Status**: Model fixed, waiting for Render deployment

