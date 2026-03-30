import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for auto-updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
