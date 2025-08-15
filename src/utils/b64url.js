import pako from "pako";

export const toB64Url = (bytes) => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const fromB64Url = (b64u) => {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  let idx = 0;
  for (const ch of binary) { bytes[idx++] = ch.charCodeAt(0); }
  return bytes;
};

export const b64uEncodeObject = (obj) => {
  try {
    const json = JSON.stringify(obj);
    const input = new TextEncoder().encode(json);
    const deflated = pako.deflate(input, { level: 9 });
    return toB64Url(deflated);
  } catch (e) {
    const s = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(s)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
};