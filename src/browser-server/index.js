// Browser-only build (GitHub Pages): the real server code — server/routes.js, service.js, planner.js,
// jobs.js — runs inside the page. vite.config.js swaps server/db.js and server/notify.js for the
// browser stand-ins in this folder, and 'express' / 'node:crypto' for tiny shims.
import { api } from '../../server/routes.js';
import { tick } from '../../server/jobs.js';
import { persist } from './db.js';

const SESSION = 'habit-tracker-session';

const readSession = () => {
  try {
    return window.localStorage.getItem(SESSION);
  } catch {
    return null;
  }
};

function writeSession(setCookie) {
  const token = /sid=([^;]*)/.exec(setCookie)?.[1];
  try {
    if (token) window.localStorage.setItem(SESSION, token);
    else window.localStorage.removeItem(SESSION);
  } catch {
    // storage unavailable: the session lasts until the page closes
  }
}

let queue = Promise.resolve();

// One request at a time, like a single-threaded server.
export function handle(method, url, body) {
  const run = async () => {
    const [path, query = ''] = url.split('?');
    const token = readSession();
    const req = {
      method,
      path,
      url,
      params: {},
      query: Object.fromEntries(new URLSearchParams(query)),
      body: body === undefined ? undefined : JSON.parse(JSON.stringify(body)),
      headers: { cookie: token ? `sid=${token}` : '' },
    };
    const res = {
      statusCode: 200,
      headers: {},
      body: undefined,
      finished: false,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; this.finished = true; return this; },
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    };

    await api.handle(req, res);
    if (res.headers['set-cookie']) writeSession(res.headers['set-cookie']);
    persist();
    if (!res.finished) return { status: 404, data: { error: 'Not found' } };
    return { status: res.statusCode, data: res.body };
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

// Morning plan, start reminders and recaps run while the app is open.
function runJobs() {
  queue = queue.then(() => tick()).then(persist).catch(error => console.error('Jobs failed:', error));
}
runJobs();
setInterval(runJobs, 30_000);
