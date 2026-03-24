import type { Agent, AgentState } from '../types';
import { AGENTS } from '../types';
import { AgentCard } from './AgentCard';
import { SkeletonCard } from './SkeletonCard';

interface AgentGridProps {
  agentStates: Record<string, AgentState>;
  initialized: boolean;
  onAgentClick: (agent: Agent) => void;
}

export const AgentGrid = ({ agentStates, initialized, onAgentClick }: AgentGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {AGENTS.map((agent) => {
        if (!initialized) {
          return <SkeletonCard key={agent.id} />;
        }
        return (
          <AgentCard
            key={agent.id}
            agent={agent}
            state={agentStates[agent.id] ?? { status: 'offline', lastActive: null, session: null }}
            onClick={onAgentClick}
          />
        );
      })}
    </div>
  );
};
