// node:crypto's randomBytes(n).toString('hex'), for the browser-only build.
export function randomBytes(size) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return { toString: () => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}
