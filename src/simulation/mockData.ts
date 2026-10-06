import type { Agent, AgentRole, AgentStats, AreaId, Department } from '../types/agent';
import type { SprintInfo, Task, TaskPriority, TaskType } from '../types/task';
import { allocateDesk, AREAS } from './layout';
import { STAGES, TASK_TEMPLATES } from './workflows';

interface AgentSeed {
  id: string;
  name: string;
  role: AgentRole;
  department: Department;
  homeArea: AreaId;
  stats: AgentStats;
  log: { time: string; text: string }[];
}

const AGENT_SEEDS: AgentSeed[] = [
  {
    id: 'alex',
    name: 'Alex',
    role: 'PRODUCT',
    department: 'PRODUCT',
    homeArea: 'PRODUCT_ROOM',
    stats: { tasksCompleted: 96, prsReviewed: 12, bugsFixed: 0, docsWritten: 8 },
    log: [
      { time: '08:41', text: 'Triaged overnight feedback' },
      { time: '08:20', text: 'Reordered the sprint backlog' },
    ],
  },
  {
    id: 'daniel',
    name: 'Daniel',
    role: 'BACKEND',
    department: 'ENGINEERING',
    homeArea: 'ENGINEERING',
    stats: { tasksCompleted: 127, prsReviewed: 48, bugsFixed: 31, docsWritten: 3 },
    log: [
      { time: '08:52', text: 'Pulled latest changes' },
      { time: '08:30', text: 'Reviewed PR #182' },
    ],
  },
  {
    id: 'sarah',
    name: 'Sarah',
    role: 'FRONTEND',
    department: 'ENGINEERING',
    homeArea: 'ENGINEERING',
    stats: { tasksCompleted: 109, prsReviewed: 52, bugsFixed: 14, docsWritten: 2 },
    log: [
      { time: '08:47', text: 'Merged the latest design tokens' },
      { time: '08:25', text: 'Requested API contract review' },
    ],
  },
  {
    id: 'lisa',
    name: 'Lisa',
    role: 'DOC_WRITER',
    department: 'DOCUMENTATION',
    homeArea: 'DOCS_ROOM',
    stats: { tasksCompleted: 74, prsReviewed: 6, bugsFixed: 0, docsWritten: 88 },
    log: [
      { time: '08:50', text: 'Published the refund runbook' },
      { time: '08:15', text: 'Updated the API changelog' },
    ],
  },
  {
    id: 'jessica',
    name: 'Jessica',
    role: 'QA',
    department: 'QA',
    homeArea: 'QA_AREA',
    stats: { tasksCompleted: 131, prsReviewed: 21, bugsFixed: 9, docsWritten: 1 },
    log: [
      { time: '08:44', text: 'Completed smoke test on staging' },
      { time: '08:10', text: 'Triaged flaky tests' },
    ],
  },
];

export const SEED_SPRINT: SprintInfo = { number: 42, capacity: 25 };

export function createSeedAgents(): Agent[] {
  const usedDesks = new Map<AreaId, number>();
  return AGENT_SEEDS.map((seed) => {
    const home = allocateDesk(seed.homeArea, usedDesks);
    return {
      id: seed.id,
      name: seed.name,
      role: seed.role,
      department: seed.department,
      homeArea: seed.homeArea,
      home,
      status: 'IDLE',
      activity: 'Starting the day',
      location: seed.homeArea,
      target: home,
      moving: false,
      currentTaskId: null,
      blockedReason: null,
      stats: { ...seed.stats },
      log: [...seed.log],
    };
  });
}

export function agentIdForRole(role: AgentRole): string {
  const seed = AGENT_SEEDS.find((candidate) => candidate.role === role);
  return seed ? seed.id : AGENT_SEEDS[0].id;
}

type DoneSeed = [TaskType, string, TaskPriority];

const DONE_SEEDS: DoneSeed[] = [
  ['FEATURE', 'Wishlist', 'MEDIUM'],
  ['FEATURE', 'Search filters', 'HIGH'],
  ['FEATURE', 'Notification center', 'MEDIUM'],
  ['FEATURE', 'Profile settings', 'LOW'],
  ['FEATURE', 'Invoice export', 'HIGH'],
  ['FEATURE', 'Loyalty points', 'MEDIUM'],
  ['FEATURE', 'Refund workflow', 'HIGH'],
  ['BUG', 'Cart badge count', 'MEDIUM'],
  ['BUG', 'Duplicate order emails', 'HIGH'],
  ['BUG', 'Receipt timezone offset', 'LOW'],
  ['BUG', 'Coupon stacking glitch', 'CRITICAL'],
  ['REFACTOR', 'Pricing module', 'MEDIUM'],
  ['REFACTOR', 'Auth middleware', 'HIGH'],
  ['REFACTOR', 'Order service', 'MEDIUM'],
  ['TEST', 'Checkout regression suite', 'MEDIUM'],
  ['DOCUMENTATION', 'Release notes', 'LOW'],
  ['DOCUMENTATION', 'Onboarding guide', 'LOW'],
  ['DEPLOYMENT', 'Staging environment', 'HIGH'],
];

type OpenSeed = [TaskType, string, TaskPriority, number];

const OPEN_SEEDS: OpenSeed[] = [
  ['FEATURE', 'Payment API', 'HIGH', 1],
  ['FEATURE', 'Checkout flow', 'HIGH', 2],
  ['FEATURE', 'Saved cards', 'MEDIUM', 3],
  ['FEATURE', 'Promo codes', 'MEDIUM', 4],
  ['FEATURE', 'Order history page', 'MEDIUM', 0],
  ['BUG', 'Checkout total miscalculation', 'CRITICAL', 0],
  ['TEST', 'Orders API contract tests', 'LOW', 0],
];

function pipelineFor(type: TaskType) {
  const template = TASK_TEMPLATES.find((candidate) => candidate.type === type);
  return template ? [...template.pipeline] : [];
}

export function createSeedTasks(): Task[] {
  const tasks: Task[] = [];
  let sequence = 101;

  DONE_SEEDS.forEach(([type, title, priority]) => {
    const pipeline = pipelineFor(type);
    const lastStage = STAGES[pipeline[pipeline.length - 1]];
    tasks.push({
      id: `T-${sequence++}`,
      title,
      type,
      status: 'DONE',
      priority,
      assigneeId: agentIdForRole(lastStage.owner),
      progress: 100,
      sprintId: SEED_SPRINT.number,
      pipeline,
      stageIndex: pipeline.length - 1,
      bugCount: 0,
      createdAt: '08:00',
    });
  });

  OPEN_SEEDS.forEach(([type, title, priority, stageIndex]) => {
    tasks.push({
      id: `T-${sequence++}`,
      title,
      type,
      status: 'TODO',
      priority,
      assigneeId: null,
      progress: 0,
      sprintId: SEED_SPRINT.number,
      pipeline: pipelineFor(type),
      stageIndex,
      bugCount: 0,
      createdAt: '08:30',
    });
  });

  return tasks;
}

export function homeAreaLabel(area: AreaId): string {
  return AREAS[area].label;
}
