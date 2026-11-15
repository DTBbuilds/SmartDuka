/**
 * A QR symbol can contain a product identifier, an ordinary barcode, or a URL.
 * Only SmartDuka product QR payloads and plain inventory codes are accepted
 * by the POS. Never follow arbitrary URLs or treat receipt/payment QR data as
 * inventory products.
 */
export type POSScanPayload =
  | { kind: 'product-id'; value: string }
  | { kind: 'barcode'; value: string }
  | { kind: 'unsupported'; reason: string };

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function parsePOSScanPayload(raw: string): POSScanPayload {
  const value = raw.trim();
  if (!value) return { kind: 'unsupported', reason: 'No code was read. Please scan again.' };
  if (value.length > 2048 || /[\x00-\x08\x0e-\x1f]/.test(value)) {
    return { kind: 'unsupported', reason: 'This code is not a supported product identifier.' };
  }
  if (value.startsWith('{')) {
    try {
      const object: unknown = JSON.parse(value);
      if (!object || typeof object !== 'object' || Array.isArray(object)) {
        return { kind: 'unsupported', reason: 'This QR code is not a product code.' };
      }
      const data = object as Record<string, unknown>;
      if (data.type === 'product' && typeof data.id === 'string' && OBJECT_ID.test(data.id)) {
        return { kind: 'product-id', value: data.id };
      }
      return { kind: 'unsupported', reason: 'This QR code is not a SmartDuka product code.' };
    } catch {
      return { kind: 'unsupported', reason: 'The QR code contains invalid product data.' };
    }
  }
  if (/^(?:https?:\/\/|javascript:|data:|BEGIN:VCARD)/i.test(value)) {
    return { kind: 'unsupported', reason: 'Links, payment codes and contact QR codes cannot be added as products.' };
  }
  if (value.length > 128 || /[\r\n]/.test(value)) {
    return { kind: 'unsupported', reason: 'The code is too long to be a product barcode.' };
  }
  return { kind: 'barcode', value };
}
