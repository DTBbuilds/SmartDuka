# Camera Feed Black Screen - Diagnostic & Fix 🔧

**Date**: November 8, 2025  
**Time**: 09:22 - 09:30 AM UTC+03:00  
**Issue**: Camera on but feed area showing black/dark, no live video  
**Status**: ✅ FIXES APPLIED  

---

## 🎯 PROBLEM ANALYSIS

### Symptoms
- ✅ Camera permission granted
- ✅ Camera is on (can hear/feel it)
- ❌ Video feed shows black/dark screen
- ❌ No live video visible
- ❌ Cannot scan barcodes

### Root Causes (Possible)
1. **Video stream not connected properly** - srcObject not set correctly
2. **Video element not playing** - play() promise not resolved
3. **Video element not rendering** - CSS or DOM issue
4. **Stream not active** - camera tracks not running
5. **Browser autoplay policy** - video not allowed to autoplay
6. **Timing issue** - video element not ready when stream connected

---

## 🔧 FIXES APPLIED

### Fix 1: Improved Video Stream Connection
```typescript
// Before
videoRef.current.srcObject = stream;
videoRef.current.onloadedmetadata = async () => {
  await videoRef.current?.play();
};

// After
videoRef.current.srcObject = stream;
// Ensure video plays immediately
videoRef.current.play().then(() => {
  console.log("✅ Scanner bar video playing");
  setCameraActive(true);
}).catch((playError) => {
  console.error("Video play error:", playError);
  // Retry with delay
  setTimeout(() => {
    videoRef.current?.play();
  }, 100);
});
```

**Changes**:
- ✅ Removed `onloadedmetadata` (unreliable)
- ✅ Direct `play()` call with promise handling
- ✅ Retry mechanism with 100ms delay
- ✅ Better error handling

### Fix 2: Enhanced Video Element Attributes
```typescript
// Before
<video
  ref={videoRef}
  className="w-full h-full object-cover"
  playsInline
  autoPlay
  muted
  style={{ display: "block" }}
/>

// After
<video
  ref={videoRef}
  className="w-full h-full object-cover"
  playsInline
  autoPlay
  muted
  crossOrigin="anonymous"
  style={{ 
    display: "block",
    width: "100%",
    height: "100%",
    backgroundColor: "#000"
  }}
/>
```

**Changes**:
- ✅ Added `crossOrigin="anonymous"` (CORS support)
- ✅ Explicit width: 100%
- ✅ Explicit height: 100%
- ✅ Explicit backgroundColor: #000

### Fix 3: Comprehensive Debug Logging
```typescript
console.log("🎬 Scanner bar initializing...");
console.log("📷 Requesting camera access...");
console.log("✅ Camera stream obtained:", stream);
console.log("📹 Video tracks:", stream.getVideoTracks());
console.log("🎥 Video element exists, connecting stream...");
console.log("📹 Camera stream connected to video element");
console.log("🎬 Video element properties:", {...});
console.log("✅ Scanner bar video playing");
console.log("🎬 Video element properties after play:", {...});
console.log("❌ Video play error:", playError);
console.log("🛑 Cleaning up camera...");
```

**Benefits**:
- ✅ Track initialization progress
- ✅ Identify where it fails
- ✅ Monitor video properties
- ✅ Verify stream connection
- ✅ Verify playback status

---

## 🧪 DIAGNOSTIC STEPS

### Step 1: Check Browser Console
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for these logs:
   - 🎬 Scanner bar initializing...
   - 📷 Requesting camera access...
   - ✅ Camera stream obtained
   - 📹 Video tracks: [...]
   - 🎥 Video element exists
   - 📹 Camera stream connected
   - ✅ Scanner bar video playing
```

### Step 2: Identify Where It Fails
```
If you see:
- 🎬 initializing → Component mounted ✅
- 📷 Requesting → getUserMedia called ✅
- ✅ Stream obtained → Camera permission granted ✅
- 📹 Video tracks → Stream has video ✅
- 🎥 Video element exists → DOM element found ✅
- 📹 Connected → srcObject set ✅
- ✅ Playing → play() succeeded ✅

If you DON'T see one of these, that's the issue!
```

### Step 3: Check Video Element Properties
```
In console, run:
const video = document.querySelector('video');
console.log({
  readyState: video.readyState,      // 0=HAVE_NOTHING, 4=HAVE_ENOUGH_DATA
  networkState: video.networkState,  // 0=NETWORK_EMPTY, 3=NETWORK_LOADING, 4=NETWORK_IDLE
  paused: video.paused,              // Should be false (playing)
  srcObject: !!video.srcObject,      // Should be true
  currentTime: video.currentTime,    // Should be > 0
  duration: video.duration,          // Should be Infinity
});
```

### Step 4: Check Camera Tracks
```
In console, run:
const video = document.querySelector('video');
const stream = video.srcObject;
if (stream) {
  console.log('Video tracks:', stream.getVideoTracks());
  console.log('Audio tracks:', stream.getAudioTracks());
  stream.getVideoTracks().forEach(track => {
    console.log({
      label: track.label,
      enabled: track.enabled,
      readyState: track.readyState,
    });
  });
}
```

---

## 🔍 COMMON ISSUES & SOLUTIONS

### Issue 1: "Video play error: NotAllowedError"
```
Cause: Browser autoplay policy
Solution:
1. Ensure video has muted attribute ✅ (already added)
2. Ensure playsInline attribute ✅ (already added)
3. Try manual click to start
4. Check browser autoplay settings
```

### Issue 2: "readyState = 0 (HAVE_NOTHING)"
```
Cause: Video element not ready
Solution:
1. Wait for loadedmetadata event
2. Wait for canplay event
3. Ensure srcObject is set before play()
4. Add delay before play()
```

### Issue 3: "networkState = 0 (NETWORK_EMPTY)"
```
Cause: No source connected
Solution:
1. Verify srcObject is set
2. Verify stream has video tracks
3. Check camera permissions
4. Try different camera (if multiple)
```

### Issue 4: "Video tracks: []"
```
Cause: Camera stream has no video tracks
Solution:
1. Check camera permissions
2. Try different camera
3. Restart browser
4. Restart computer
```

### Issue 5: "Video element not found"
```
Cause: DOM element not rendered
Solution:
1. Check if component is mounted
2. Check if !showManualMode is true
3. Check CSS display property
4. Check z-index
```

---

## 🚀 TESTING THE FIX

### Step 1: Open POS Page
```
1. Go to http://localhost:3000/pos
2. Open DevTools (F12)
3. Go to Console tab
```

### Step 2: Check Console Logs
```
You should see:
🎬 Scanner bar initializing...
📷 Requesting camera access...
✅ Camera stream obtained: MediaStream {...}
📹 Video tracks: [MediaStreamTrack {...}]
🎥 Video element exists, connecting stream...
📹 Camera stream connected to video element
🎬 Video element properties: {
  readyState: 0,
  networkState: 0,
  paused: true,
  srcObject: true
}
✅ Scanner bar video playing
🎬 Video element properties after play: {
  readyState: 4,
  networkState: 4,
  paused: false,
  currentTime: 0.xxx
}
```

### Step 3: Verify Video Display
```
1. Camera feed should show live video
2. Green box should be visible
3. Status should show "✓ Ready - Point at barcode"
4. Green dot should be pulsing
```

### Step 4: Test Scanning
```
1. Point camera at barcode
2. Barcode should be detected
3. Item should be added to cart
4. Success beep should play
5. Message should show "✓ Scanned: Product Name"
```

---

## 📋 TROUBLESHOOTING CHECKLIST

### Camera Permission
- [ ] Browser shows camera permission prompt
- [ ] You click "Allow"
- [ ] Permission is granted
- [ ] Camera light turns on

### Console Logs
- [ ] 🎬 initializing log appears
- [ ] 📷 Requesting log appears
- [ ] ✅ Stream obtained log appears
- [ ] 📹 Video tracks log appears
- [ ] 🎥 Video element exists log appears
- [ ] 📹 Connected log appears
- [ ] ✅ Playing log appears

### Video Element
- [ ] Video element is visible
- [ ] Video element has correct size (280×100px)
- [ ] Video element has black background
- [ ] Video element is not hidden (display: block)

### Stream Properties
- [ ] readyState = 4 (HAVE_ENOUGH_DATA)
- [ ] networkState = 4 (NETWORK_IDLE)
- [ ] paused = false (playing)
- [ ] srcObject = true (stream connected)
- [ ] currentTime > 0 (video is playing)

### Camera Tracks
- [ ] Video tracks: 1 (one video track)
- [ ] Track enabled: true
- [ ] Track readyState: live
- [ ] Track label: shows camera name

---

## 🎯 IF STILL BLACK SCREEN

### Try These Steps:
1. **Hard Refresh**: Ctrl+Shift+R (clear cache)
2. **Close DevTools**: F12 (sometimes helps)
3. **Restart Browser**: Close and reopen
4. **Check Camera**: Test in another app (Zoom, Google Meet)
5. **Check Permissions**: Settings → Camera → Allow SmartDuka
6. **Restart Computer**: Full system restart
7. **Try Different Browser**: Chrome, Firefox, Safari, Edge
8. **Try Different Camera**: If multiple cameras available

### If Still Not Working:
1. **Enable Manual Entry**: Click "✏️ Manual Entry"
2. **Type Barcode Manually**: Enter barcode numbers
3. **Press Enter**: Item should be added to cart
4. **Use Manual Mode**: Until camera issue is resolved

---

## 📝 FILES MODIFIED

### `apps/web/src/components/pos-scanner-bar.tsx`

**Changes**:
1. ✅ Improved video stream connection logic
2. ✅ Added comprehensive debug logging
3. ✅ Enhanced video element attributes
4. ✅ Added retry mechanism for play()
5. ✅ Better error handling

**Lines Changed**: ~50 lines

---

## ✅ SUMMARY

**Fixes Applied**:
- ✅ Improved video stream connection
- ✅ Enhanced video element attributes
- ✅ Added comprehensive debug logging
- ✅ Added retry mechanism
- ✅ Better error handling

**Expected Result**:
- ✅ Live video feed displays
- ✅ Green box visible
- ✅ Status shows "Ready"
- ✅ Can scan barcodes
- ✅ Items added to cart

**If Still Black Screen**:
1. Check console logs (see diagnostic steps above)
2. Identify where it fails
3. Try troubleshooting steps
4. Use manual entry as fallback

**Status**: ✅ FIXES APPLIED  
**Next**: Test and check console logs  
**Support**: Check diagnostic steps above
