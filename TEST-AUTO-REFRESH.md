# 🧪 Testing the Auto-Refresh System

## Quick Test Steps

### Method 1: Local Testing (Recommended)

1. **First Build**
   ```powershell
   cd client
   npm run build
   npm run preview
   ```

2. **Open Browser**
   - Navigate to `http://localhost:5173`
   - Open DevTools Console (F12)
   - Look for log: `📌 Initial version set: [number]`

3. **Make a Change**
   - Edit any file in `client/src` (e.g., change a text in Home.jsx)
   - Keep the browser window open

4. **Second Build**
   - In a new terminal:
   ```powershell
   cd client
   npm run build
   ```

5. **Copy New Build**
   - Copy the new `dist` folder contents over the old one
   - Or restart preview: `npm run preview`

6. **Watch the Magic!**
   - Within 30 seconds (or when you focus the tab), you'll see:
     - Toast: "New update detected! Refreshing in 3 seconds..."
     - Console: `🔄 New version detected!`
     - Page automatically hard refreshes
     - Your changes appear!

### Method 2: Production Deployment Test

1. **Deploy Current Version**
   ```powershell
   cd client
   npm run build
   # Deploy the dist folder
   ```

2. **Visit Production Site**
   - Open your deployed site
   - Keep the browser tab open
   - Note the version in console

3. **Make Changes & Redeploy**
   - Make a visible change (change homepage text)
   - Build again: `npm run build`
   - Deploy the new dist folder

4. **Observe Auto-Refresh**
   - Return to the open browser tab
   - Within 30 seconds, you'll see the update notification
   - Page refreshes automatically
   - New changes are visible!

## What to Look For

### ✅ Success Indicators

**In Browser Console:**
```
📌 Initial version set: 1763695182901
👀 Page visible, checking for updates...
🔄 New version detected!
   Current: 1763695182901
   Server: 1763695289456
🔄 Performing hard refresh to apply updates...
```

**On Screen:**
- Toast notification appears (top-right)
- Banner at bottom (if toast dismissed)
- Automatic refresh after 3 seconds
- Changes are visible after refresh

### ❌ Troubleshooting

**Issue: "Version check: version.json not found"**
- Solution: Make sure you ran `npm run build` and the dist folder has version.json

**Issue: No update detected**
- Solution: Check if version.json was updated (should have new timestamp)
- Clear browser cache completely
- Try in incognito mode

**Issue: Page doesn't refresh**
- Solution: Check browser console for errors
- Make sure you're testing with the built version (not dev server)
- Verify version.json is accessible at `/version.json`

## Testing Different Scenarios

### Scenario 1: User Has Tab Open
✅ Auto-refresh works - checks every 30 seconds

### Scenario 2: User Switches Tabs
✅ Auto-refresh works - checks when tab becomes visible

### Scenario 3: User Minimizes Browser
✅ Auto-refresh works - checks when window regains focus

### Scenario 4: User on Mobile
✅ Auto-refresh works - checks when app comes to foreground

### Scenario 5: User is Offline
✅ Graceful handling - checks resume when back online

## Performance Verification

### Check Network Activity

1. Open DevTools > Network tab
2. Filter for `version.json`
3. Should see requests every ~30 seconds
4. Each request should be fresh (no cache)
5. Response should be very small (~50 bytes)

### Verify No Performance Impact

- Page should load normally
- No lag or stuttering
- version.json requests are lightweight
- No impact on user experience

## Expected Behavior Timeline

```
Time 0:00  - User opens site
Time 0:02  - First version check (initial)
Time 0:30  - Regular check #1
Time 1:00  - Regular check #2
Time 1:30  - Regular check #3
...
[You deploy update]
Time X:00  - Next check detects new version
Time X:03  - Auto hard refresh completes
User sees updated site! 🎉
```

## Verify Hard Refresh

To confirm it's a true hard refresh:

1. Before update, add a console.log in main.jsx
2. Note the log in console
3. Deploy update with different log message
4. Watch auto-refresh
5. New log message should appear (confirms hard refresh)

## Production Checklist

Before going live, verify:

- [ ] Build creates version.json in dist/
- [ ] version.json is accessible at /version.json
- [ ] CDN/hosting doesn't cache version.json
- [ ] Console shows version checks every 30s
- [ ] Updates are detected within 30s-1min
- [ ] Hard refresh clears all caches
- [ ] Toast notification appears
- [ ] Works on mobile devices
- [ ] Works with service worker
- [ ] No errors in console

## Real-World Usage

### For Your Users

Users don't need to do anything! The system:
- ✅ Detects updates automatically
- ✅ Shows friendly notification
- ✅ Refreshes automatically
- ✅ No technical knowledge needed
- ✅ Works on all devices

### For You (Developer)

Your workflow:
1. Make changes
2. Run `npm run build`
3. Deploy dist folder
4. All users get updated automatically within 30-60 seconds
5. No support tickets about "please refresh your browser"

## Success! 🎉

If you see the console logs and the automatic refresh, you're all set! Users will now always have the latest version without manual intervention.

**Key Achievement**: No more users stuck on old cached versions! 🚀

