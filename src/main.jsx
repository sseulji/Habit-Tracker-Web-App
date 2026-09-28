import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support and push notifications. In development the worker only handles push
// (?dev=1 turns its cache off) so the dev server's hot reload is never served stale.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js${import.meta.env.DEV ? '?dev=1' : ''}`
    navigator.serviceWorker.register(url).catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
