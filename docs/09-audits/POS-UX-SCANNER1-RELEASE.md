# SMARTDUKA-POS-UX-SCANNER1 — Implementation & release gate

**Status:** Draft PR #6. **No production merge/deploy.**  
**Baseline:** `04dce18b27deadbe81a038bc9ff944af62d3951c`  
**Preview:** `https://smartduka-ffajgirrr-dtbbuilds-projects.vercel.app` (non-production)

## Source-confirmed findings

1. `QRCodeService.generateProductQRCode` encodes JSON `{"type":"product","id":"<MongoObjectId>","name":"..."}`; `handleBarcodeScanned` treated it as a literal barcode and could never find the referenced product. Order, payment, and loyalty QRs must never be added to checkout.
2. Android Chrome/Brave follow the `html5-qrcode` mobile default. Its initialization used `Html5Qrcode.getCameras()` **before** `start()`, potentially opening multiple camera streams/permission requests; `useCameraPermission` changes were dependencies of the cleanup effect, potentially closing the camera during startup.
3. Fixed narrow `qrbox` and unsupported `focusMode` constraints can worsen scanning on smaller/Chromium cameras. "✓ Optimized" displayed even when startup failed.
4. Floating scan/history circles overlapped the product grid on mobile. Receipt-history search autofocus opened the virtual keyboard at modal entry. Receipt-history used hardcoded KSh even for an AUD merchant.

## Implemented

- `lib/pos-scan-payload.ts`: strict interpretation of inventory barcode/QR versus SmartDuka product QR ID. Rejects malformed JSON, non-product QR types, URLs, control chars and oversized inputs. Does not follow links or allow product IDs from other tenants; the existing JWT shop-scoped `GET /inventory/products/:id` authorizes every remote product resolution.
- POS lookup handles product QR by product ID; ordinary EAN-13/EAN-8/UPC/Code128 remains on existing barcode lookup/cache path.
- Android Chromium (including Brave's Chrome-compatible user agent) defaults to ZXing's directly owned single media stream; Firefox, Safari and WebView paths stay on HTML5. Both decoders have a user-requested alternate-engine option after camera errors, plus hardware/manual fallback.
- HTML5 starts camera only on user gesture without pre-enumeration, avoids strict focus settings, scans the full frame for 1D barcodes and QR, and cancels stale session starts on close. Browser permission-state updates no longer reset the stream.
- Scanner feedback differentiates camera starting/scanning, code captured/checking inventory, unavailable, permission error and recovery. No "added to cart" success until POS lookup and `handleAddToCart` authorize the cart update.
- Sticky POS header has explicit touch-friendly Scan and Receipts actions; mobile floating circles removed. Sticky mobile cart CTA shows item count, shop total and "Review cart" (it opens cart, not immediate payment).
- Receipt modal opens with its heading focused (not keyboard), supports manual search, and accepts the configured shop currency formatter.

## Test matrix

Automated:
- `pos-scan-payload.spec.ts`: barcode text formats; actual product QR JSON; rejects order/payment/loyalty/URL/malformed and oversized payloads.
- `scanner-engine.spec.ts`: Android Chromium priority, Firefox/Safari fallback, manual engine switching.
- Required GitHub CI web Jest, lint, API tests, API/web builds; check exact final PR head before declaring release GO.
- Vercel preview build: READY on `4aa3198`.

**Physical camera checks still required, not claimed as PASS:**
1. Android Chrome: grant permission → camera live → EAN-13 and QR detected → correct product added once.
2. Android Brave: test Shields on/off while respecting merchant/browser privacy settings; manual fallback if denied.
3. Android Firefox: verify existing HTML5 decoder remains functional for EAN/QR.
4. Deny camera permission, use manual, reopen modal, switch engine, retry and close quickly during initialization; verify no stuck streams or focus lock.
5. Product not found, cross-shop product QR, malformed QR and payment/receipt QR: no cart addition; intelligible error.
6. Android soft keyboard: opening Receipts History does **not** automatically show keyboard; tapping search does.
7. Verify no product-grid overlay at 320, 360, 390, 430 CSS px, and cart still reaches checkout safely.
8. Desktop USB/Bluetooth wedge scanner, manual code entry, rapid duplicate scans, tab/keyboard focus.
9. Camera hardware unavailable/network timeout: manual/hardware options still work; no false success.

## Financial and release safety

No payment initiation, settlement, order mutation contract, database migration, merchant secret or subscription change. No payment QR is interpreted as inventory. M-Pesa controls remain untouched and **must remain paused** with an empty canary allowlist.

**Release verdict:** Implementation ready for review; live device testing and exact hosted CI required before production authorization. Do not merge this draft PR automatically.
