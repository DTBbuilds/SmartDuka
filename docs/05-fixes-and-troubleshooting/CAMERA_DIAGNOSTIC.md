# Camera Scanner Diagnostic Guide 🔍

**Issue**: Camera opens but video feed and green box not visible

---

## 🎯 What I Added

### 1. ✅ Debug Indicators
Now you'll see a gray box showing:
```
Camera Active: ✅ YES or ❌ NO
Manual Mode: ✅ YES or ❌ NO  
Video Element: ✅ EXISTS or ❌ MISSING
Video Source: ✅ CONNECTED or ❌ NOT SET
```

### 2. ✅ Console Logging
Check browser console (F12) for:
```
🔍 Scanner State: { cameraActive, showManualMode, isOpen, hasVideo, hasSrcObject }
✅ Video playing, setting camera active
```

### 3. ✅ Explicit Video Play
Added `videoRef.current.play()` to ensure video starts

---

## 🔍 Diagnosis Steps

### Step 1: Check Debug Indicators

When you click "Scan" button, you should see:

**✅ GOOD (Working)**:
```
Camera Active: ✅ YES
Manual Mode: ❌ NO
Video Element: ✅ EXISTS
Video Source: ✅ CONNECTED
```
→ Video should display

**❌ BAD (Not Working)**:
```
Camera Active: ❌ NO
Manual Mode: ✅ YES
```
→ Camera didn't initialize

**❌ BAD (Partial)**:
```
Camera Active: ✅ YES
Manual Mode: ✅ YES
```
→ Manual mode is blocking camera view

---

## 🚀 Quick Fixes

### Fix 1: Clear Everything
```bash
# Stop dev server (Ctrl+C)

# Clear all caches
rm -rf apps/web/.next
rm -rf apps/web/.turbo
rm -rf apps/web/node_modules

# Reinstall
pnpm install

# Start dev server
pnpm dev
```

### Fix 2: Check Browser
```
1. Close ALL DevTools (F12)
2. Close ALL browser tabs
3. Restart browser
4. Open new tab
5. Go to http://localhost:3000
6. Hard refresh (Ctrl+Shift+R)
7. Click "Scan" button
```

### Fix 3: Check Permissions
```
1. Click lock icon in address bar
2. Camera permissions → Allow
3. Reload page
4. Try again
```

### Fix 4: Try Different Browser
```
- Chrome
- Firefox
- Safari
- Edge
```

---

## 📊 What the Debug Info Tells You

### Scenario 1: Camera Active NO, Manual Mode YES
**Problem**: Camera initialization failed  
**Solution**: Check permissions, try different browser  

### Scenario 2: Camera Active YES, Manual Mode YES
**Problem**: Manual mode is enabled, blocking camera view  
**Solution**: Click "Use Camera" button  

### Scenario 3: Camera Active YES, Manual Mode NO, but no video
**Problem**: Video element not rendering  
**Solution**: Check console for errors, clear cache  

### Scenario 4: Video Element MISSING
**Problem**: React not rendering video element  
**Solution**: Clear cache, restart dev server  

### Scenario 5: Video Source NOT SET
**Problem**: getUserMedia not setting srcObject  
**Solution**: Check browser permissions, try different browser  

---

## 🧪 Test Checklist

After changes:
- [ ] Stop dev server
- [ ] Clear .next folder
- [ ] Clear .turbo folder
- [ ] Run `pnpm install`
- [ ] Start dev server
- [ ] Close DevTools
- [ ] Hard refresh
- [ ] Click "Scan" button
- [ ] Check debug indicators
- [ ] Check console logs
- [ ] Verify video displays
- [ ] Verify green box visible

---

## 📸 What You Should See

### 1. Dialog Opens
```
┌───────────────────────────────────┐
│ 📷 Scan Barcode              ✕   │
│ Point camera at barcode to scan   │
└───────────────────────────────────┘
```

### 2. Debug Info Shows
```
┌───────────────────────────────────┐
│ Camera Active: ✅ YES             │
│ Manual Mode: ❌ NO                │
│ Video Element: ✅ EXISTS          │
│ Video Source: ✅ CONNECTED        │
└───────────────────────────────────┘
```

### 3. Video Feed Displays
```
┌───────────────────────────────────┐
│  [Live Camera Video Feed]         │
│     ┌─────────────┐               │
│     │ Green Box   │               │
│     │ (Scan Zone) │               │
│     └─────────────┘               │
│  ✓ Camera Ready - Point at        │
│    barcode                        │
└───────────────────────────────────┘
```

---

## 🔧 Advanced Debugging

### Check Browser Console
```javascript
// Look for these messages:
✅ Video playing, setting camera active
🔍 Scanner State: { ... }

// Look for errors:
❌ Camera initialization failed
❌ Video play error
```

### Check Network Tab
```
1. Open DevTools (F12)
2. Go to Network tab
3. Look for failed requests
4. Check for CORS errors
```

### Check Application Tab
```
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Reload page
```

---

## 💡 Common Issues & Solutions

### Issue: "Camera Active: NO"
**Cause**: Camera permission denied or not available  
**Solution**: 
- Check browser permissions
- Try different browser
- Check if camera is in use by another app

### Issue: "Manual Mode: YES" when it should be NO
**Cause**: Error occurred during camera initialization  
**Solution**:
- Check console for error message
- Check camera permissions
- Try different browser

### Issue: "Video Element: MISSING"
**Cause**: React not rendering video element  
**Solution**:
- Clear cache
- Restart dev server
- Check for React errors in console

### Issue: "Video Source: NOT SET"
**Cause**: getUserMedia failed or srcObject not assigned  
**Solution**:
- Check camera permissions
- Check if camera is available
- Try different browser

---

## 🎯 Next Steps

1. **Click "Scan" button**
2. **Look at debug indicators**
3. **Take screenshot of what you see**
4. **Check browser console (F12)**
5. **Share what the debug info shows**

---

## 📞 Report Format

When reporting issues, include:

```
Debug Info:
- Camera Active: [YES/NO]
- Manual Mode: [YES/NO]
- Video Element: [EXISTS/MISSING]
- Video Source: [CONNECTED/NOT SET]

Browser:
- Name: [Chrome/Firefox/Safari]
- Version: [...]

Console Errors:
- [paste any errors here]

What I See:
- [describe what you see]
```

---

**Status**: ✅ DEBUG MODE ENABLED  
**Next**: Check debug indicators and report findings
