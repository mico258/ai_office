export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'REFACTOR'
  | 'DESIGN'
  | 'TEST'
  | 'DEPLOYMENT'
  | 'DOCUMENTATION';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'TESTING' | 'DONE' | 'BLOCKED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StageId =
  | 'REQUIREMENT'
  | 'BACKEND'
  | 'FRONTEND'
  | 'QA'
  | 'DOCS'
  | 'BUGFIX'
  | 'RETEST'
  | 'DEPLOY'
  | 'SMOKE'
  | 'DESIGN'
  | 'AUTOMATION';

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  progress: number;
  sprintId: number;
  pipeline: StageId[];
  stageIndex: number;
  bugCount: number;
  createdAt: string;
}

export interface SprintInfo {
  number: number;
  capacity: number;
}
