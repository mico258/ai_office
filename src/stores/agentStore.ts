import { create } from 'zustand';
import type { ActivityLogEntry, Agent, AgentStats } from '../types/agent';
import { createSeedAgents } from '../simulation/mockData';

const MAX_LOG_ENTRIES = 8;

interface AgentState {
  agents: Record<string, Agent>;
  order: string[];
  patchAgent: (id: string, patch: Partial<Agent>) => void;
  appendLog: (id: string, entry: ActivityLogEntry) => void;
  bumpStat: (id: string, key: keyof AgentStats) => void;
  reset: (agents: Agent[]) => void;
}

function index(agents: Agent[]): Pick<AgentState, 'agents' | 'order'> {
  return {
    agents: Object.fromEntries(agents.map((agent) => [agent.id, agent])),
    order: agents.map((agent) => agent.id),
  };
}

export const useAgentStore = create<AgentState>((set) => ({
  ...index(createSeedAgents()),
  patchAgent: (id, patch) =>
    set((state) => {
      const current = state.agents[id];
      if (!current) return state;
      return { agents: { ...state.agents, [id]: { ...current, ...patch } } };
    }),
  appendLog: (id, entry) =>
    set((state) => {
      const current = state.agents[id];
      if (!current) return state;
      const log = [entry, ...current.log].slice(0, MAX_LOG_ENTRIES);
      return { agents: { ...state.agents, [id]: { ...current, log } } };
    }),
  bumpStat: (id, key) =>
    set((state) => {
      const current = state.agents[id];
      if (!current) return state;
      const stats = { ...current.stats, [key]: current.stats[key] + 1 };
      return { agents: { ...state.agents, [id]: { ...current, stats } } };
    }),
  reset: (agents) => set(index(agents)),
}));
