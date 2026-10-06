import { applyTeamEvent } from '../services/eventReducer';
import { teamSocket } from '../services/teamSocket';
import { useAgentStore } from '../stores/agentStore';
import { useEventStore } from '../stores/eventStore';
import { useSimulationStore } from '../stores/simulationStore';
import { useTaskStore } from '../stores/taskStore';
import { useUiStore } from '../stores/uiStore';
import { agentRegistry } from './agentRegistry';
import { createSeedAgents, createSeedTasks, SEED_SPRINT } from './mockData';
import { SimulationEngine } from './simulationEngine';

export const simulationEngine = new SimulationEngine((event) => teamSocket.send(event));

export function connectWorld(): () => void {
  const unsubscribeEvents = teamSocket.subscribe(applyTeamEvent);
  const unsubscribeStatus = teamSocket.onStatusChange(useUiStore.getState().setConnection);
  teamSocket.connect();
  if (!teamSocket.isLive) simulationEngine.start();

  return () => {
    simulationEngine.stop();
    teamSocket.disconnect();
    unsubscribeEvents();
    unsubscribeStatus();
  };
}

export function resetWorld(): void {
  simulationEngine.reset();
  agentRegistry.clear();
  useAgentStore.getState().reset(createSeedAgents());
  useTaskStore.getState().reset(createSeedTasks(), SEED_SPRINT);
  useEventStore.getState().reset();
  useUiStore.getState().resetCamera();
  useSimulationStore.getState().reset();
}
