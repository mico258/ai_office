import type { AgentStats, AgentStatus, AreaId, Vec2 } from './agent';
import type { Meeting, MessageKind } from './team';
import type { Task } from './task';

export interface FeedNote {
  agentId: string;
  icon: string;
  text: string;
  stats?: (keyof AgentStats)[];
}

export type TeamEvent =
  | { type: 'TASK_CREATED'; payload: { task: Task; createdBy: string | null } }
  | { type: 'TASK_ASSIGNED'; payload: { taskId: string; agentId: string } }
  | { type: 'TASK_UPDATED'; payload: { taskId: string; patch: Partial<Task>; note?: FeedNote } }
  | { type: 'TASK_COMPLETED'; payload: { taskId: string; agentId: string } }
  | {
      type: 'AGENT_STATUS_CHANGED';
      payload: {
        agentId: string;
        status: AgentStatus;
        activity: string;
        blockedReason?: string | null;
        currentTaskId?: string | null;
      };
    }
  | {
      type: 'AGENT_MOVED';
      payload: { agentId: string; area: AreaId; target: Vec2; arrived: boolean };
    }
  | {
      type: 'AGENT_MESSAGE';
      payload: { fromId: string; toId: string; text: string; kind: MessageKind; taskId?: string };
    }
  | { type: 'MEETING_STARTED'; payload: { meeting: Meeting } }
  | { type: 'MEETING_ENDED'; payload: { meetingId: string } }
  | { type: 'SPRINT_STARTED'; payload: { sprint: number; capacity: number } };

export type TeamEventType = TeamEvent['type'];

export interface FeedItem {
  id: string;
  time: string;
  icon: string;
  text: string;
}

export interface CommMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  kind: MessageKind;
  createdAt: number;
}
