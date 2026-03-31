import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker — forces all tabs to reload when new version deployed
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          // New SW activated — force this tab to reload so new code runs
          window.location.reload();
        }
      });
    });
  });
}

// Error boundary to catch render crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, message: e.message }
  }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    console.error('[MC Error]', e.message, info.componentStack?.slice(0, 500))
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', fontFamily: 'monospace', fontSize: '12px' }}>
          <h2>App crashed:</h2>
          <p>{this.state.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
