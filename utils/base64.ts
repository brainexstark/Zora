// ============================================================
// BASE64 -> ArrayBuffer helper for Supabase storage uploads
// ============================================================

/** Decode a base64 string into an ArrayBuffer for upload(). */
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean.charAt(i));
    const b = chars.indexOf(clean.charAt(i + 1));
    const c = chars.indexOf(clean.charAt(i + 2));
    const d = chars.indexOf(clean.charAt(i + 3));
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    output += String.fromCharCode((n >> 16) & 0xff);
    if (clean.charAt(i + 2) !== "=") output += String.fromCharCode((n >> 8) & 0xff);
    if (clean.charAt(i + 3) !== "=") output += String.fromCharCode(n & 0xff);
  }
  const len = output.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = output.charCodeAt(i);
  return bytes.buffer;
}
