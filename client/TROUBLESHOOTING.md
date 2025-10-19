# Deployment Troubleshooting Guide

## Common Vercel Deployment Errors

### 1. "404 DEPLOYMENT_NOT_FOUND"

**Causes:**
- Missing `vercel.json` configuration file
- Incorrect build settings in Vercel dashboard
- Project not properly linked to GitHub repository

**Solutions:**

#### A. Verify vercel.json exists
Ensure `vercel.json` is in the `client/` directory with proper configuration:
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### B. Re-deploy from Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Select "Use existing Build Cache" → OFF
6. Click "Redeploy"

#### C. Check Build Settings
In Vercel Dashboard → Project Settings → Build & Development Settings:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Root Directory**: `client` (if in monorepo)

#### D. Environment Variables
Ensure these are set in Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://your-backend-url.onrender.com
```

#### E. Re-import Project
If all else fails:
1. Delete the project from Vercel dashboard
2. Re-import from GitHub:
   - Go to https://vercel.com/new
   - Select your repository
   - Configure project:
     - Root Directory: `client`
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add environment variables
   - Deploy

### 2. "ERR_CONNECTION_REFUSED" or Network Errors

**Cause:** Backend API is not responding or CORS issues

**Solutions:**
1. Verify backend is deployed and running on Render
2. Check VITE_API_URL environment variable
3. Verify CORS settings in backend allow your Vercel domain

### 3. Build Failures

**Cause:** Missing dependencies or build errors

**Solutions:**
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in package.json
3. Test build locally: `cd client && npm run build`
4. Check for TypeScript/ESLint errors

### 4. Blank Page After Deployment

**Causes:**
- Missing `vercel.json` rewrites
- JavaScript errors
- API connection issues

**Solutions:**
1. Check browser console for errors (F12)
2. Verify `vercel.json` has proper rewrites
3. Check API URL environment variable
4. Clear browser cache and reload

### 5. Routes Not Working (404 on Refresh)

**Cause:** Missing SPA rewrites configuration

**Solution:**
Ensure `vercel.json` includes:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Quick Fix Commands

### Force Redeploy
```bash
# Push empty commit to trigger deployment
git commit --allow-empty -m "Force redeploy"
git push origin main
```

### Test Build Locally
```bash
cd client
npm install
npm run build
npm run preview
```

### Clear Vercel Cache
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy without cache
vercel --prod --force
```

## Debugging Steps

1. **Check Deployment Status**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Review build logs
   - Check for errors

2. **Verify Environment Variables**
   - Go to Settings → Environment Variables
   - Ensure all required variables are set
   - Redeploy after adding variables

3. **Check Domain Configuration**
   - Go to Settings → Domains
   - Verify domain is properly configured
   - Check SSL certificate status

4. **Review Function Logs**
   - Go to Deployments → Select deployment
   - Click "Functions" tab
   - Check for runtime errors

5. **Test API Connectivity**
   - Open browser console
   - Run: `fetch('https://your-api-url.onrender.com/api/health')`
   - Check response

## Getting Help

If you continue to experience issues:

1. **Check Vercel Status**
   - https://www.vercel-status.com/

2. **Contact Developer**
   - Email: yonatanhaile06@gmail.com
   - Phone: +251 914 888 890

3. **Vercel Support**
   - https://vercel.com/support
   - Vercel Community: https://github.com/vercel/vercel/discussions

4. **GitHub Issues**
   - Check if similar issues exist in repository
   - Create new issue with deployment logs

## Prevention

- Always test builds locally before pushing
- Keep dependencies up to date
- Monitor deployment notifications
- Set up Vercel GitHub integration for automatic deployments
- Use environment variables for all configuration
- Test in preview deployments before production

## Useful Links

- Vercel Documentation: https://vercel.com/docs
- Vite Documentation: https://vitejs.dev/guide/
- Vercel CLI: https://vercel.com/docs/cli
- GitHub Integration: https://vercel.com/docs/git

