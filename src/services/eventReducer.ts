import type { TeamEvent } from '../types/events';
import { formatClock, MEETING_LABELS } from '../types/team';
import { useAgentStore } from '../stores/agentStore';
import { useEventStore } from '../stores/eventStore';
import { useSimulationStore } from '../stores/simulationStore';
import { useTaskStore } from '../stores/taskStore';

const NOTABLE_STATUS_FEED: Partial<Record<string, string>> = {
  BREAK: '☕',
  DEPLOYING: '🚀',
};

function agentName(id: string): string {
  return useAgentStore.getState().agents[id]?.name ?? 'Someone';
}

function taskTitle(id: string): string {
  return useTaskStore.getState().tasks[id]?.title ?? 'a task';
}

export function applyTeamEvent(event: TeamEvent): void {
  const agents = useAgentStore.getState();
  const tasks = useTaskStore.getState();
  const events = useEventStore.getState();
  const simulation = useSimulationStore.getState();
  const time = formatClock(simulation.simTime);

  switch (event.type) {
    case 'TASK_CREATED': {
      const { task, createdBy } = event.payload;
      tasks.addTask(task);
      const creator = createdBy ? agentName(createdBy) : 'Product';
      events.pushFeed(time, '📋', `${creator} created "${task.title}"`);
      break;
    }
    case 'TASK_ASSIGNED': {
      const { taskId, agentId } = event.payload;
      tasks.patchTask(taskId, { assigneeId: agentId });
      events.pushFeed(time, '🟢', `${agentName(agentId)} started "${taskTitle(taskId)}"`);
      break;
    }
    case 'TASK_UPDATED': {
      const { taskId, patch, note } = event.payload;
      tasks.patchTask(taskId, patch);
      if (note) {
        events.pushFeed(time, note.icon, `${agentName(note.agentId)} ${note.text}`);
        agents.appendLog(note.agentId, { time, text: `${note.text}` });
        note.stats?.forEach((key) => agents.bumpStat(note.agentId, key));
      }
      break;
    }
    case 'TASK_COMPLETED': {
      const { taskId } = event.payload;
      tasks.patchTask(taskId, { status: 'DONE', progress: 100 });
      events.pushFeed(time, '🏁', `"${taskTitle(taskId)}" is done`);
      break;
    }
    case 'AGENT_STATUS_CHANGED': {
      const { agentId, status, activity, blockedReason, currentTaskId } = event.payload;
      const current = agents.agents[agentId];
      if (!current) break;
      const patch: Partial<typeof current> = {
        status,
        activity,
        blockedReason: status === 'BLOCKED' ? (blockedReason ?? activity) : null,
      };
      if (currentTaskId !== undefined) patch.currentTaskId = currentTaskId;
      agents.patchAgent(agentId, patch);
      if (current.activity !== activity) agents.appendLog(agentId, { time, text: activity });
      if (status === 'BLOCKED' && current.status !== 'BLOCKED') {
        events.pushFeed(time, '🔴', `${current.name} is blocked: ${activity}`);
      } else if (current.status !== status && NOTABLE_STATUS_FEED[status]) {
        events.pushFeed(time, NOTABLE_STATUS_FEED[status] as string, `${current.name}: ${activity}`);
      }
      break;
    }
    case 'AGENT_MOVED': {
      const { agentId, area, target, arrived } = event.payload;
      agents.patchAgent(agentId, { location: area, target, moving: !arrived });
      break;
    }
    case 'AGENT_MESSAGE': {
      const { fromId, toId, text, kind } = event.payload;
      events.postMessage({ fromId, toId, text, kind });
      const icon = kind === 'BUG' ? '🐞' : kind === 'UNBLOCK' ? '🟢' : '💬';
      events.pushFeed(time, icon, `${agentName(fromId)} → ${agentName(toId)}: ${text}`);
      break;
    }
    case 'MEETING_STARTED': {
      const { meeting } = event.payload;
      simulation.setMeeting(meeting);
      events.pushFeed(time, '👥', `${MEETING_LABELS[meeting.kind]} started: ${meeting.topic}`);
      meeting.participantIds.forEach((id) =>
        agents.appendLog(id, { time, text: `Joined ${MEETING_LABELS[meeting.kind].toLowerCase()}` }),
      );
      break;
    }
    case 'MEETING_ENDED': {
      const meeting = simulation.meeting;
      if (meeting && meeting.id === event.payload.meetingId) {
        simulation.setMeeting(null);
        events.pushFeed(time, '👥', `${MEETING_LABELS[meeting.kind]} ended`);
      }
      break;
    }
    case 'SPRINT_STARTED': {
      const previous = tasks.sprint.number;
      tasks.startSprint({ number: event.payload.sprint, capacity: event.payload.capacity });
      events.pushFeed(time, '🏁', `Sprint ${previous} complete — Sprint ${event.payload.sprint} begins`);
      break;
    }
  }
}
