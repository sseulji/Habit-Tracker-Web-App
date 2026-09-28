import { defineConfig, normalizePath } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// Normalized (forward slashes) so a swapped module and a direct import of it are the same module.
const local = (path) => normalizePath(fileURLToPath(new URL(path, import.meta.url)))

// `vite build --mode pages` (GitHub Pages) has no server, so the server code runs in the page:
// its database, push and Node-only imports are swapped for the browser stand-ins.
function browserServer() {
  const swaps = {
    'express': local('./src/browser-server/express.js'),
    'node:crypto': local('./src/browser-server/crypto.js'),
  }
  const serverSwaps = {
    './db.js': local('./src/browser-server/db.js'),
    './notify.js': local('./src/browser-server/notify.js'),
  }
  return {
    name: 'browser-server',
    enforce: 'pre',
    resolveId(source, importer) {
      if (swaps[source]) return swaps[source]
      const fromServer = importer && importer.replace(/\\/g, '/').includes('/server/')
      if (fromServer && serverSwaps[source]) return serverSwaps[source]
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode === 'pages' && browserServer()].filter(Boolean),
  base: '/Habit-Tracker-Web-App/',
  build: mode === 'pages' ? { target: 'es2022' } : undefined,
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
}))
