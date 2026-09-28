// API + (in production) the built web app, on one origin so the session cookie and push work.
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { api } from './routes.js';
import { startJobs } from './jobs.js';

const PORT = Number(process.env.PORT || 8787);
const BASE = '/Habit-Tracker-Web-App';
const dist = fileURLToPath(new URL('../dist', import.meta.url));

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);

if (existsSync(dist)) {
  app.use(BASE, express.static(dist, { index: false }));
  app.get(`${BASE}/{*path}`, (req, res) => res.sendFile(`${dist}/index.html`));
  app.get('/', (req, res) => res.redirect(`${BASE}/`));
}

app.listen(PORT, () => {
  console.log(`Habit Tracker API on http://localhost:${PORT}${existsSync(dist) ? ` (app at ${BASE}/)` : ''}`);
  startJobs();
});
