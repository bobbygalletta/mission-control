import { useState, useCallback } from 'react';
import type { Agent } from './types';
import { Header } from './components/Header';
import { AgentGrid } from './components/AgentGrid';
import { MessageModal } from './components/MessageModal';
import { Toast } from './components/Toast';
import { useAgentStatus } from './hooks/useAgentStatus';
import { sendMessage } from './lib/gateway';

export default function App() {
  const { agentStates, connectionState, initialized } = useAgentStatus(3000);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  const handleSend = useCallback(async (message: string) => {
    await sendMessage(message);
    setToast('Message sent via Telegram!');
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#08080e' }}>
      {/* Subtle radial gradient overlay for depth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(129,140,248,0.12) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header connectionState={connectionState} />
        <AgentGrid
          agentStates={agentStates}
          initialized={initialized}
          onAgentClick={handleAgentClick}
        />
      </div>

      <MessageModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onSend={handleSend}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
