import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for auto-updates
// Disabled during debugging — unregister any existing SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then((r) => r?.unregister());
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
