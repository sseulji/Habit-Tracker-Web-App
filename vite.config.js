import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Habit-Tracker-Web-App/',
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
