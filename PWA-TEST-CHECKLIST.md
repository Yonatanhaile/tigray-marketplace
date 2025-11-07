# PWA Installation - Test Checklist

## ✅ Pre-Deployment Checks

### Files Verified:
- [x] `client/public/site.webmanifest` - Created ✅
- [x] `client/public/sw.js` - Created ✅
- [x] `client/dist/site.webmanifest` - Updated ✅
- [x] `client/dist/sw.js` - Updated to v2.2.0 ✅
- [x] `client/src/components/InstallPrompt.jsx` - Enhanced ✅
- [x] `client/src/main.jsx` - Cache version updated ✅
- [x] No linter errors ✅

## 📱 Testing Steps

### Step 1: Development Testing
```bash
cd client
npm run dev
```
- [ ] App loads without errors
- [ ] Console shows: "✅ Service Worker registered successfully"
- [ ] No manifest errors in console
- [ ] Dev tools > Application > Manifest shows correct info

### Step 2: Android Testing (Chrome)
- [ ] Open app on Android phone (Chrome browser)
- [ ] Wait 3 seconds
- [ ] Install prompt appears at bottom
- [ ] Console shows: "📱 beforeinstallprompt event fired"
- [ ] Click "Install Now" button
- [ ] Console shows: "✅ App successfully installed"
- [ ] App icon appears on home screen
- [ ] Open from home screen
- [ ] Opens in standalone mode (no browser UI)
- [ ] Reopen - install prompt does NOT show again
- [ ] Console shows: "Is Standalone: true"

### Step 3: iOS Testing (Safari)
- [ ] Open app on iPhone (Safari browser)
- [ ] Wait 3 seconds
- [ ] Install prompt appears with instructions
- [ ] Follow step-by-step guide:
  - [ ] Tap Share button (bottom of screen)
  - [ ] Scroll down
  - [ ] Tap "Add to Home Screen"
  - [ ] Tap "Add" (top right)
- [ ] App icon appears on home screen
- [ ] Open from home screen
- [ ] Opens in standalone mode (no Safari UI)
- [ ] Reopen - install prompt does NOT show again

### Step 4: iOS Testing (Non-Safari browsers)
- [ ] Open app on iPhone (Chrome/Firefox/Edge)
- [ ] Wait 3 seconds
- [ ] Prompt shows with Safari instructions
- [ ] Message explains to use Safari for installation

### Step 5: Desktop Testing
- [ ] Open app on desktop Chrome/Edge
- [ ] Install prompt should NOT show (desktop only)
- [ ] Can manually install via browser menu if desired

### Step 6: Debug Commands Testing
Open browser console and test:

```javascript
// Test 1: Check PWA status
window.checkPWAStatus()
```
- [ ] Shows all detection information
- [ ] Values are correct

```javascript
// Test 2: Reset prompt
window.resetPWAPrompt()
// Refresh page
```
- [ ] localStorage cleared
- [ ] Prompt shows again after refresh

### Step 7: Installation Detection Testing
After installing:

```javascript
// Should return true
localStorage.getItem('appInstalled')

// Should return true when opened from home screen
window.matchMedia('(display-mode: standalone)').matches

// iOS only - should return true
window.navigator.standalone
```
- [ ] All detection methods return correct values

### Step 8: Persistence Testing
- [ ] Install app
- [ ] Close and reopen from home screen
- [ ] Install prompt does NOT show
- [ ] Clear browser cache
- [ ] Reopen from home screen
- [ ] Still detected as installed (standalone mode)

### Step 9: Dismissal Testing
- [ ] Fresh browser/incognito mode
- [ ] Wait for prompt (3 seconds)
- [ ] Click X to dismiss
- [ ] Refresh page
- [ ] Prompt does NOT show (7-day cooldown active)
- [ ] Run `window.resetPWAPrompt()` and refresh
- [ ] Prompt shows again

### Step 10: Console Logging Testing
Check for these messages:

**On page load:**
```
✅ Service Worker registered successfully
```

**When prompt appears (Android):**
```
📱 beforeinstallprompt event fired
```

**When installing:**
```
📱 Showing install prompt...
📊 Install prompt outcome: accepted
✅ App successfully installed
```

**When dismissing:**
```
👋 User dismissed install prompt
```

**When in standalone:**
```
✅ App is now in standalone mode
```

## 🐛 Issue Troubleshooting

### Issue: Prompt not showing
**Debug:**
```javascript
window.checkPWAStatus()
```
**Check:**
- Is Mobile: should be true
- Is Standalone: should be false
- Show Install Prompt: should be true

**Solutions:**
- Make sure you're on mobile device
- Run `window.resetPWAPrompt()` if previously dismissed
- Check console for errors
- Verify manifest loads (Network tab)

### Issue: Installation not detected
**Debug:**
```javascript
window.matchMedia('(display-mode: standalone)').matches
```
**Check:**
- Should return `true` when opened from home screen
- Should return `false` when opened in browser

**Solutions:**
- Make sure opening from home screen icon, not browser
- Clear localStorage and try again
- Check if service worker registered

### Issue: iOS not working
**Check:**
- Using Safari? (Required for iOS PWA)
- Following all 3 steps?
- iOS 11.3 or later?

### Issue: Android not working
**Check:**
- Chrome up to date?
- Using HTTPS? (or localhost)
- Service worker registered?
- Console shows beforeinstallprompt event?

## 📊 Success Metrics

After all tests pass:
- ✅ Install prompt shows on mobile devices
- ✅ Installation completes successfully
- ✅ App opens in standalone mode
- ✅ Installation is detected and persisted
- ✅ Prompt doesn't show after installation
- ✅ Debug commands work correctly
- ✅ No console errors
- ✅ Works on both iOS and Android

## 🚀 Deployment Checklist

Before deploying to production:
- [ ] All tests passed locally
- [ ] Build succeeds without errors: `npm run build`
- [ ] Manifest file in dist folder
- [ ] Service worker in dist folder
- [ ] HTTPS enabled on production domain
- [ ] Test on production URL before announcing

## 📝 Post-Deployment Verification

After deploying:
- [ ] Visit production URL on mobile device
- [ ] Install prompt appears
- [ ] Installation works
- [ ] App functions in standalone mode
- [ ] Check Google Lighthouse PWA score

## 🎯 Expected Lighthouse Scores

Run Lighthouse audit (Chrome DevTools):
- [ ] PWA - Should be 100% or close
- [ ] Manifest file detected
- [ ] Service worker detected
- [ ] Icons present
- [ ] Theme color set
- [ ] Installable

---

**Tester:** _______________
**Date:** _______________
**Platform:** ☐ Android ☐ iOS ☐ Both
**Result:** ☐ Passed ☐ Failed ☐ Needs Review

**Notes:**
_____________________________
_____________________________
_____________________________

