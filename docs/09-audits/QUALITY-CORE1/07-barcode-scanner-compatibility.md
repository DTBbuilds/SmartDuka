# QUALITY-CORE1 — Barcode Scanner Compatibility Results (P1-E)

## Architecture (audited)

```
POS page
 ├─ useBarcodeScanner (hardware wedge: rapid-key buffer, Enter-terminated,
 │    1s duplicate debounce, manual addManualBarcode API)
 └─ BarcodeScannerUnified (browser detection → implementation pick)
      ├─ BarcodeScannerHtml5 (html5-qrcode) — mobile default
      ├─ BarcodeScannerZXing (@zxing/browser) — desktop default
      └─ native Capacitor path (lib/capacitor/camera.ts, ML Kit plugin)
```

## Checklist results

| Requirement | Status | Evidence |
| --- | --- | --- |
| Browser feature detection | ✅ | `browser-detection.ts`: getUserMedia/secure-context/WebView/in-app-browser detection → `recommendedScanner` |
| Library fallback | ✅ | zxing ↔ html5-qrcode auto-selection; native ML Kit on Android APK |
| Symbologies | ✅ | EAN-13/8, UPC-A/E, CODE-128/39/93, QR, DataMatrix (html5 config) |
| Camera permissions + denial recovery | ✅ | `useCameraPermission` + per-state messaging + "Retry Camera" + manual/hardware fallback buttons |
| Rear-camera selection | ✅ | label-based back/rear/environment pick, last-camera heuristic, Switch control |
| Torch / low-light | ✅ | capability-probed torch toggle (video-track constraint) |
| Duplicate suppression | ✅ | 2s scanner debounce + POS-level `BARCODE_DEBOUNCE_MS` + concurrent-processing guard |
| Product lookup | ✅ | IndexedDB cache → loaded list (EAN-13 leading-zero variants) → API exact match |
| Unknown barcode | ✅ | explicit "Product not found" toast with the barcode value |
| Cart addition | ✅ | stock-aware add with out-of-stock guard |
| Offline operation | ✅ | cache-first lookup works without network |
| Camera stream cleanup | ✅ | `cleanupScanner()` stop+clear on close/success/mode-switch |
| Scanner reopening | ✅ | full state reset on close; init guard prevents double-init |
| Orientation changes | ⚠️ | no explicit handler; html5-qrcode adapts video sizing — acceptable, monitor on devices |
| **Manual entry fallback** | ✅ (improved) | Both scanner variants ship a manual mode; **fixed:** when detection reports `manual-only` (no camera API / insecure context), the unified scanner now opens **directly in manual mode** instead of erroring first |

## Fix shipped

`barcode-scanner-unified.tsx` + `barcode-scanner-html5.tsx`: `startInManualMode` prop; `recommendedScanner === 'manual-only'` opens manual entry first (camera tab remains for retry).

## Real-device verification — NOT PERFORMED (limitation)

No physical Android/iOS device is available in this environment. The task explicitly forbids claiming compatibility from desktop emulation. **Recommended device pass before release:**

1. Android Chrome (rear camera, torch, EAN-13 + QR, permission deny → manual entry)
2. Android Firefox (camera pick, duplicate suppression)
3. iPhone Safari (user-gesture start, permission recovery)
4. Installed PWA (Capacitor webview path)
5. Offline airplane-mode scan of a cached product
6. Orientation change mid-scan + scanner reopen
