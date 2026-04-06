import './index.css'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AgentChatApp from './pages/AgentChatApp'

// Simple hash-based router
function Router() {
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === '#/agent-chat') {
    return <AgentChatApp />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Router />)
