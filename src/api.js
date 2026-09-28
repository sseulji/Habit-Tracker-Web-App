// Tiny JSON client for the app's own server (/api, same origin; the session is an HttpOnly cookie).
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The GitHub Pages build has no server: the same server code runs inside the page instead.
export const isBrowserOnly = import.meta.env.VITE_BACKEND === 'browser';

async function request(method, path, body) {
  if (isBrowserOnly) {
    const { handle } = await import('./browser-server/index.js');
    const { status, data } = await handle(method, path, body);
    if (status >= 400) throw new ApiError(status, data?.error || `Request failed (${status})`);
    return data;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
