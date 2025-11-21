# 🔄 Auto Hard Refresh System

## Overview

This marketplace now features an **automatic hard refresh system** that detects website updates and automatically refreshes the page for all users - no manual intervention needed!

## How It Works

### 1. **Build Version Generation**
- Every time you build the app (`npm run build`), a unique version number is generated based on the current timestamp
- This version is embedded in the app and saved to `version.json`

### 2. **Continuous Version Checking**
The app checks for updates in multiple ways:

- **Every 30 seconds** - Regular background checks
- **When tab gains focus** - When user switches back to the tab
- **When page becomes visible** - When user returns from another app
- **Initial load** - 2 seconds after the app starts

### 3. **Automatic Hard Refresh**
When a new version is detected:
1. User sees a friendly toast notification: "New update detected! Refreshing in 3 seconds..."
2. After 3 seconds, the system performs a **hard refresh**:
   - Clears all browser caches
   - Unregisters service workers
   - Forces complete page reload (bypassing all caches)
3. User gets the latest version automatically!

## Technical Implementation

### Files Modified

1. **`client/vite.config.js`**
   - Added version generation plugin
   - Injects `__APP_VERSION__` at build time
   - Creates `version.json` file

2. **`client/src/components/UpdateNotification.jsx`**
   - Checks version.json every 30 seconds
   - Monitors page visibility and focus
   - Performs hard refresh when update detected
   - Shows user-friendly notifications

3. **`client/public/sw.js`**
   - Updated service worker with better cache control
   - Never caches `version.json` (always fetches fresh)
   - Network-first strategy for HTML, JS, and CSS
   - Proper cache invalidation

4. **`client/public/version.json`**
   - Development placeholder file
   - Gets replaced with actual version during build

## Features

### ✅ Advantages

1. **Zero User Action Required**
   - Users don't need to know about hard refresh (Ctrl+Shift+R)
   - Works for all users automatically
   - No technical knowledge needed

2. **Fast Update Detection**
   - Checks every 30 seconds
   - Additional checks on focus/visibility
   - Quick rollout of fixes and features

3. **User-Friendly Experience**
   - 3-second warning before refresh
   - Toast notifications
   - Graceful update process

4. **True Hard Refresh**
   - Clears all caches
   - Removes service worker
   - Guarantees fresh content

5. **Development Friendly**
   - Works in development mode
   - No interference with hot reload
   - Easy to test and debug

## Usage

### For Developers

#### Building for Production
```bash
cd client
npm run build
```

This automatically:
- Generates a unique version number
- Creates `dist/version.json`
- Enables auto-refresh for users

#### Testing Locally
1. Build the app: `npm run build`
2. Serve the build: `npm run preview`
3. Open in browser
4. Make changes and rebuild
5. Watch the auto-refresh happen!

### For Users

**Nothing required!** The system works automatically:
- Keep the website open
- When an update is deployed, you'll see a notification
- Page refreshes automatically after 3 seconds
- Continue using the updated site

## Configuration

### Adjusting Check Frequency

In `client/src/components/UpdateNotification.jsx`:

```javascript
// Change from 30 seconds to desired interval
const checkInterval = setInterval(checkForNewVersion, 30 * 1000);
```

### Adjusting Refresh Delay

```javascript
// Change from 3 seconds to desired delay
setTimeout(() => {
  performHardRefresh();
}, 3000);
```

### Disable Auto-Refresh (not recommended)

Comment out the auto-refresh in `UpdateNotification.jsx`:

```javascript
// setTimeout(() => {
//   performHardRefresh();
// }, 3000);
```

## Monitoring & Debugging

### Console Logs

The system provides detailed console logs:

```
📌 Initial version set: 1700000000000
👀 Page visible, checking for updates...
🔄 New version detected!
   Current: 1700000000000
   Server: 1700000001000
🔄 Performing hard refresh to apply updates...
```

### Check Current Version

Open browser console and run:
```javascript
fetch('/version.json').then(r => r.json()).then(console.log)
```

### Verify Auto-Refresh is Active

1. Open DevTools Console
2. Look for: `📌 Initial version set: [timestamp]`
3. Should see periodic: `Version check:` messages

## Troubleshooting

### Updates Not Detected

**Problem**: Users not seeing updates after deployment

**Solutions**:
1. Check if `version.json` exists in deployed build
2. Verify CDN/hosting doesn't cache `version.json`
3. Check browser console for errors
4. Ensure build process completed successfully

### Too Frequent Refreshes

**Problem**: Page refreshing unnecessarily

**Solutions**:
1. Increase check interval (default 30s)
2. Check if version.json is being properly cached
3. Verify build generates consistent version numbers

### Service Worker Issues

**Problem**: Service worker blocking updates

**Solutions**:
1. Hard refresh clears service worker
2. Check Application > Service Workers in DevTools
3. Manually unregister if needed
4. Clear all site data and reload

## Best Practices

### Deployment

1. **Build First**: Always run `npm run build` before deploying
2. **Verify version.json**: Check it exists in `dist/` folder
3. **No Cache for version.json**: Configure CDN/server to never cache it
4. **Test in Staging**: Verify auto-refresh works before production

### User Experience

1. **Deploy During Low Traffic**: Minimize disruption
2. **Monitor After Deploy**: Check if users are updating
3. **Keep Delay Reasonable**: 3 seconds gives users time to save work
4. **Communicate**: Let users know about the auto-refresh feature

### Development

1. **Don't Modify version.json**: It's auto-generated
2. **Test Both Dev & Prod**: Different behaviors
3. **Check Console Logs**: Detailed debugging info available
4. **Test Visibility/Focus**: Ensure all triggers work

## CDN Configuration

### Cloudflare
```
# Don't cache version.json
/version.json
  Cache-Control: no-cache, no-store, must-revalidate
```

### Nginx
```nginx
location /version.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

### Apache
```apache
<Files "version.json">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</Files>
```

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify `version.json` is accessible
3. Test in incognito mode (fresh state)
4. Clear all browser data and retry
5. Check server/CDN configuration

## Version History

- **v3.0.0** - Auto hard refresh system implemented
- **v2.2.0** - Basic service worker updates
- **v1.0.0** - Initial marketplace launch

---

**Note**: This system ensures all users always have the latest version of your marketplace without requiring technical knowledge or manual intervention!

