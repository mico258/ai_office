import { beforeEach, describe, expect, it } from 'vitest';
import { createSeedAgents, createSeedTasks, SEED_SPRINT } from '../simulation/mockData';
import { useAgentStore } from '../stores/agentStore';
import { useEventStore } from '../stores/eventStore';
import { useSimulationStore } from '../stores/simulationStore';
import { useTaskStore } from '../stores/taskStore';
import { applyTeamEvent } from './eventReducer';

describe('applyTeamEvent', () => {
  beforeEach(() => {
    useAgentStore.getState().reset(createSeedAgents());
    useTaskStore.getState().reset(createSeedTasks(), SEED_SPRINT);
    useEventStore.getState().reset();
    useSimulationStore.setState({ simTime: 0, meeting: null });
  });

  it('adds a created task and records it in the feed', () => {
    const task = { ...Object.values(useTaskStore.getState().tasks)[0], id: 'T-900', title: 'New thing', status: 'TODO' as const };
    applyTeamEvent({ type: 'TASK_CREATED', payload: { task, createdBy: 'alex' } });
    expect(useTaskStore.getState().tasks['T-900']).toBeDefined();
    expect(useEventStore.getState().feed[0].text).toContain('Alex created "New thing"');
  });

  it('marks an agent as blocked and clears the reason when unblocked', () => {
    applyTeamEvent({
      type: 'AGENT_STATUS_CHANGED',
      payload: { agentId: 'daniel', status: 'BLOCKED', activity: 'Waiting for credentials' },
    });
    expect(useAgentStore.getState().agents.daniel.blockedReason).toBe('Waiting for credentials');
    applyTeamEvent({
      type: 'AGENT_STATUS_CHANGED',
      payload: { agentId: 'daniel', status: 'WORKING', activity: 'Implementing', blockedReason: null },
    });
    expect(useAgentStore.getState().agents.daniel.blockedReason).toBeNull();
  });

  it('tracks movement and arrival', () => {
    applyTeamEvent({
      type: 'AGENT_MOVED',
      payload: { agentId: 'sarah', area: 'MEETING_ROOM', target: [0, -5.3], arrived: false },
    });
    expect(useAgentStore.getState().agents.sarah.moving).toBe(true);
    applyTeamEvent({
      type: 'AGENT_MOVED',
      payload: { agentId: 'sarah', area: 'MEETING_ROOM', target: [0, -5.3], arrived: true },
    });
    expect(useAgentStore.getState().agents.sarah.moving).toBe(false);
    expect(useAgentStore.getState().agents.sarah.location).toBe('MEETING_ROOM');
  });

  it('shows a speech bubble for a message sender', () => {
    applyTeamEvent({
      type: 'AGENT_MESSAGE',
      payload: { fromId: 'daniel', toId: 'sarah', text: 'API ready', kind: 'HANDOFF' },
    });
    expect(useEventStore.getState().speech.daniel.text).toBe('API ready');
    expect(useEventStore.getState().messages).toHaveLength(1);
  });

  it('starts and ends a meeting', () => {
    const meeting = { id: 'MTG-1', kind: 'STANDUP' as const, topic: 'Daily sync', participantIds: ['alex', 'daniel'], startedAt: 0 };
    applyTeamEvent({ type: 'MEETING_STARTED', payload: { meeting } });
    expect(useSimulationStore.getState().meeting?.id).toBe('MTG-1');
    applyTeamEvent({ type: 'MEETING_ENDED', payload: { meetingId: 'MTG-1' } });
    expect(useSimulationStore.getState().meeting).toBeNull();
  });
});
