export type AgentRole = 'PRODUCT' | 'FRONTEND' | 'BACKEND' | 'DOC_WRITER' | 'QA';

export type Department = 'PRODUCT' | 'DOCUMENTATION' | 'ENGINEERING' | 'QA';

export type AgentStatus =
  | 'IDLE'
  | 'WORKING'
  | 'IN_MEETING'
  | 'WAITING'
  | 'BLOCKED'
  | 'REVIEWING'
  | 'TESTING'
  | 'DEPLOYING'
  | 'BREAK'
  | 'ERROR';

export type AreaId =
  | 'PRODUCT_ROOM'
  | 'DOCS_ROOM'
  | 'ENGINEERING'
  | 'QA_AREA'
  | 'MEETING_ROOM'
  | 'BREAK_AREA';

export type Vec2 = readonly [number, number];

export interface AgentStats {
  tasksCompleted: number;
  prsReviewed: number;
  bugsFixed: number;
  docsWritten: number;
}

export interface ActivityLogEntry {
  time: string;
  text: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  department: Department;
  homeArea: AreaId;
  home: Vec2;
  status: AgentStatus;
  activity: string;
  location: AreaId;
  target: Vec2;
  moving: boolean;
  currentTaskId: string | null;
  blockedReason: string | null;
  stats: AgentStats;
  log: ActivityLogEntry[];
}
