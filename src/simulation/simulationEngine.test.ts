import { beforeEach, describe, expect, it } from 'vitest';
import { applyTeamEvent } from '../services/eventReducer';
import { teamSocket } from '../services/teamSocket';
import { useAgentStore } from '../stores/agentStore';
import { useEventStore } from '../stores/eventStore';
import { useSimulationStore } from '../stores/simulationStore';
import { computeSprintStats, useTaskStore } from '../stores/taskStore';
import { agentRegistry } from './agentRegistry';
import { createSeedAgents, createSeedTasks, SEED_SPRINT } from './mockData';
import { SimulationEngine } from './simulationEngine';

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runEngine(seed: number, ticks: number, dt = 0.5): SimulationEngine {
  const engine = new SimulationEngine((event) => teamSocket.send(event), seededRandom(seed));
  for (let i = 0; i < ticks; i += 1) engine.tick(dt);
  return engine;
}

describe('SimulationEngine', () => {
  beforeEach(() => {
    agentRegistry.clear();
    useAgentStore.getState().reset(createSeedAgents());
    useTaskStore.getState().reset(createSeedTasks(), SEED_SPRINT);
    useEventStore.getState().reset();
    useSimulationStore.setState({ simTime: 0, meeting: null, running: true, speed: 1 });
    teamSocket.subscribe(applyTeamEvent);
    teamSocket.connect();
  });

  it('assigns the initial tasks to the owner of each stage', () => {
    runEngine(1, 2);
    const { agents } = useAgentStore.getState();
    expect(agents.daniel.currentTaskId).not.toBeNull();
    expect(agents.sarah.currentTaskId).not.toBeNull();
    expect(agents.jessica.currentTaskId).not.toBeNull();
    expect(agents.lisa.currentTaskId).not.toBeNull();
    expect(agents.alex.currentTaskId).not.toBeNull();
  });

  it('completes work and moves tasks through the pipeline', () => {
    const before = computeSprintStats(useTaskStore.getState().tasks, SEED_SPRINT.number).done;
    runEngine(7, 1200);
    const state = useTaskStore.getState();
    const doneNow = Object.values(state.tasks).filter((task) => task.status === 'DONE').length;
    expect(doneNow).toBeGreaterThan(before);
    expect(useEventStore.getState().feed.length).toBeGreaterThan(10);
  });

  it('never leaves an agent blocked forever', () => {
    const engine = new SimulationEngine((event) => teamSocket.send(event), seededRandom(3));
    let consecutiveBlockedTicks = 0;
    for (let i = 0; i < 4000; i += 1) {
      engine.tick(0.5);
      const anyBlocked = Object.values(useAgentStore.getState().agents).some((agent) => agent.status === 'BLOCKED');
      consecutiveBlockedTicks = anyBlocked ? consecutiveBlockedTicks + 1 : 0;
      expect(consecutiveBlockedTicks).toBeLessThan(200);
    }
  });

  it('runs a meeting and sends every participant back to the desk', () => {
    const engine = new SimulationEngine((event) => teamSocket.send(event), seededRandom(11));
    let sawMeeting = false;
    for (let i = 0; i < 600; i += 1) {
      engine.tick(0.5);
      if (useSimulationStore.getState().meeting) sawMeeting = true;
    }
    expect(sawMeeting).toBe(true);
    const meetingNow = useSimulationStore.getState().meeting;
    if (!meetingNow) {
      const statuses = Object.values(useAgentStore.getState().agents).map((agent) => agent.status);
      expect(statuses).not.toContain('IN_MEETING');
    }
  });

  it('rolls into the next sprint once every sprint task is done', () => {
    runEngine(5, 12000);
    expect(useTaskStore.getState().sprint.number).toBeGreaterThan(SEED_SPRINT.number);
  });
});
