# Render Configuration Fixes for yohatrade.com

## Issues Fixed ✅

### 1. CORS Configuration (Fixed in Code - Pushed to GitHub)
- Added `https://yohatrade.com` and `http://yohatrade.com` to allowed origins
- This fix will deploy automatically to Render via GitHub

---

## Issues to Fix in Render Dashboard 🔧

### 2. Update FRONTEND_URL Environment Variable

**On Render Dashboard:**

1. Go to your **tigray-marketplace-api** service
2. Click **Environment** tab
3. Find `FRONTEND_URL` variable
4. Update the value to: `https://yohatrade.com`
5. Click **Save Changes** button

**Important:** This will trigger a redeploy of your backend service.

---

### 3. Fix Redis Connection Issue (Choose One Option)

The error `getaddrinfo ENOTFOUND red-d3p8euvdiees73cl2gjg` indicates Redis connection problems.

#### **Option A: Check if Redis Service Exists (Recommended if you need invoices)**

1. In Render Dashboard, go to **Dashboard** > **Services**
2. Look for a Redis service named **tigray-redis**
3. **If it EXISTS:**
   - Check if it's running (should show "Available")
   - Click on it and verify the connection string
   - If it's suspended, upgrade to a paid plan or restart it
   
4. **If it DOESN'T EXIST:**
   - Click **New +** > **Redis**
   - Name: `tigray-redis`
   - Plan: Choose "Free" or "Starter" (Free has limitations)
   - Click **Create Redis**
   - After creation, your services should auto-connect to it

#### **Option B: Disable Redis (Temporary - Invoices Won't Work)**

If you don't need PDF invoice generation right now:

1. **Suspend the Worker Service:**
   - Go to **tigray-marketplace-worker** service
   - Click **Suspend Service**
   - This will stop the Redis errors but disable invoice generation

2. **Update Backend to Handle Missing Redis:**
   - The backend is already configured to handle Redis gracefully
   - Just ensure `REDIS_URL` env var is set to `redis://localhost:6379` if Redis service doesn't exist

---

### 4. Verify All Environment Variables

Ensure these are set correctly in **tigray-marketplace-api**:

```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yohatrade.com
BACKEND_URL=https://your-render-backend-url.onrender.com
MONGO_URI=mongodb+srv://...
CLOUDINARY_URL=cloudinary://...
JWT_SECRET=[auto-generated]
REDIS_URL=[auto-linked from tigray-redis service]
```

---

### 5. Update Vercel Environment Variables for Frontend

Since your frontend is deployed on Vercel and connected to your custom domain `yohatrade.com`, you need to configure the API URLs:

**On Vercel Dashboard:**

1. Go to your project: **tigray-marketplace-client** (or whatever your project name is)
2. Click **Settings** tab
3. Click **Environment Variables** in the sidebar
4. Add/Update these variables:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `VITE_API_URL` | `https://your-render-backend-url.onrender.com` | Production |
   | `VITE_SOCKET_URL` | `https://your-render-backend-url.onrender.com` | Production |

   **Replace `your-render-backend-url.onrender.com` with your actual Render backend URL**

5. Click **Save**
6. Go to **Deployments** tab
7. Click **Redeploy** on the latest deployment to apply the new environment variables

**Important:** Without these variables, your frontend at `yohatrade.com` won't be able to connect to your backend!

---

## After Making Changes

1. **Wait for Auto-Deploy**: Render will automatically redeploy after the GitHub push
2. **Manual Redeploy** (if needed): Click "Manual Deploy" > "Deploy latest commit"
3. **Check Logs**: Go to **Logs** tab and verify:
   - ✅ No more "CORS blocked origin: https://yohatrade.com" warnings
   - ✅ Redis connection successful OR Redis errors gone if you suspended worker
   - ✅ Server starts successfully

---

## Expected Logs After Fix

You should see logs like:
```
✅ MongoDB connected successfully
✅ Bull queues initialized successfully
🚀 Server running on port 3000 in production mode
📡 Socket.io enabled with CORS origin: [Function: origin]
```

**No more:**
```
[warn]: CORS blocked origin: https://yohatrade.com
[error]: Invoice queue error: getaddrinfo ENOTFOUND red-d3p8euvdiees73cl2gjg
```

---

## Testing Your Site

1. Visit https://yohatrade.com
2. Try to:
   - View listings ✅
   - Login/Register ✅
   - Create listings ✅
   - Socket.io connections work ✅
   - No CORS errors in browser console ✅

---

## Additional Notes

### About the Listing Validation Error
The error you saw:
```
Listing validation failed: location.specificAddress is required, 
location.zone: Zone/Sub-city is required, location.region: Region is required
```

This is **NOT** a server error - it's a validation error when someone tries to create/update a listing without proper location fields. This is working as intended. The user creating the listing needs to fill in all required location fields.

### Redis/Invoice Queue
- If you keep Redis: PDF invoices will be generated for completed orders
- If you disable Redis: Everything works except PDF invoice generation
- For production, I recommend keeping Redis (use Starter plan at $10/month on Render)

---

## Troubleshooting

If CORS errors persist after deployment:
1. Check Render logs to confirm the new code is deployed
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private browsing mode
4. Check that FRONTEND_URL is set to `https://yohatrade.com` (not the old Vercel URL)

If Redis errors persist:
1. Verify `tigray-redis` service exists and is running
2. Check if the `REDIS_URL` environment variable is properly linked
3. Consider Option B (suspend worker) if you don't need invoices immediately

