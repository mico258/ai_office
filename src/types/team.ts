import type { AgentRole, AgentStatus, Department } from './agent';

export type MeetingKind =
  | 'STANDUP'
  | 'SPRINT_PLANNING'
  | 'REFINEMENT'
  | 'DESIGN_DISCUSSION'
  | 'TECHNICAL_DISCUSSION';

export type MessageKind = 'HANDOFF' | 'BUG' | 'UNBLOCK';

export type SimSpeed = 1 | 2 | 5 | 10;

export interface Meeting {
  id: string;
  kind: MeetingKind;
  topic: string;
  participantIds: string[];
  startedAt: number;
}

export const ALL_ROLES: AgentRole[] = ['PRODUCT', 'FRONTEND', 'BACKEND', 'DOC_WRITER', 'QA'];

export const SPEEDS: SimSpeed[] = [1, 2, 5, 10];

export const ROLE_TITLES: Record<AgentRole, string> = {
  PRODUCT: 'Product Manager',
  FRONTEND: 'Frontend Engineer',
  BACKEND: 'Backend Engineer',
  DOC_WRITER: 'Documentation Writer',
  QA: 'QA Engineer',
};

export const ROLE_COLORS: Record<AgentRole, string> = {
  PRODUCT: '#f59e0b',
  FRONTEND: '#38bdf8',
  BACKEND: '#34d399',
  DOC_WRITER: '#a78bfa',
  QA: '#fb7185',
};

export const DEPARTMENT_ORDER: Department[] = ['PRODUCT', 'DOCUMENTATION', 'ENGINEERING', 'QA'];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  PRODUCT: 'Product',
  DOCUMENTATION: 'Documentation',
  ENGINEERING: 'Engineering',
  QA: 'Quality Assurance',
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  IDLE: '#94a3b8',
  WORKING: '#22c55e',
  IN_MEETING: '#60a5fa',
  WAITING: '#eab308',
  BLOCKED: '#ef4444',
  REVIEWING: '#a78bfa',
  TESTING: '#f97316',
  DEPLOYING: '#06b6d4',
  BREAK: '#f472b6',
  ERROR: '#dc2626',
};

export const ACTIVE_STATUSES: AgentStatus[] = ['WORKING', 'REVIEWING', 'TESTING', 'DEPLOYING'];

export const RESTING_STATUSES: AgentStatus[] = ['IDLE', 'WAITING', 'BREAK'];

export const MEETING_LABELS: Record<MeetingKind, string> = {
  STANDUP: 'Daily Standup',
  SPRINT_PLANNING: 'Sprint Planning',
  REFINEMENT: 'Backlog Refinement',
  DESIGN_DISCUSSION: 'Design Discussion',
  TECHNICAL_DISCUSSION: 'Technical Discussion',
};

export const SIM_CLOCK_START_MINUTES = 9 * 60;

export const SIM_SECONDS_PER_OFFICE_MINUTE = 3;

export function formatClock(simTime: number): string {
  const total = SIM_CLOCK_START_MINUTES + Math.floor(simTime / SIM_SECONDS_PER_OFFICE_MINUTE);
  const minutes = total % (24 * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDuration(simSeconds: number): string {
  const officeSeconds = Math.max(0, Math.floor(simSeconds * 20));
  const mm = String(Math.floor(officeSeconds / 60)).padStart(2, '0');
  const ss = String(officeSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
