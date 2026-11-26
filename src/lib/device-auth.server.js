/**
 * Device credential helpers. Only a SHA-256 hash of each ESP32 API key is stored;
 * the key itself is shown once at registration and never persisted.
 */
const encoder = new TextEncoder();

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export function randomToken(prefix, bytes = 24) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return `${prefix}_${toHex(buf)}`;
}

export function randomDeviceId() {
  const buf = crypto.getRandomValues(new Uint8Array(3));
  return `AQ-ESP32-${toHex(buf).toUpperCase()}`;
}

export async function sha256Hex(value) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(String(value))));
}

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(String(message))));
}

/** Length-independent comparison so a wrong key never leaks timing information. */
export function timingSafeEqual(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
