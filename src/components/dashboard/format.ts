import type { StageId, TaskPriority, TaskType } from '../../types/task';

export const STAGE_LABELS: Record<StageId, string> = {
  REQUIREMENT: 'Requirements',
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  QA: 'QA testing',
  DOCS: 'Documentation',
  BUGFIX: 'Bug fix',
  RETEST: 'Retest',
  DEPLOY: 'Deployment',
  SMOKE: 'Smoke test',
  DESIGN: 'Design',
  AUTOMATION: 'Test automation',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#60a5fa',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: 'Feature',
  BUG: 'Bug',
  REFACTOR: 'Refactor',
  DESIGN: 'Design',
  TEST: 'Test',
  DEPLOYMENT: 'Deployment',
  DOCUMENTATION: 'Docs',
};

export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function statusLabel(status: string): string {
  return status.replace('_', ' ');
}
