import type { AgentRole, AgentStats, AgentStatus } from '../types/agent';
import type { StageId, TaskPriority, TaskStatus, TaskType } from '../types/task';
import { ALL_ROLES, type MeetingKind } from '../types/team';

export interface ActivityBand {
  until: number;
  status: AgentStatus;
  text: string;
}

export interface StageDef {
  id: StageId;
  owner: AgentRole;
  duration: number;
  handoff: string;
  doneText: string;
  icon: string;
  canFindBug: boolean;
  stat?: keyof AgentStats;
  bands: ActivityBand[];
}

export const STAGES: Record<StageId, StageDef> = {
  REQUIREMENT: {
    id: 'REQUIREMENT',
    owner: 'PRODUCT',
    duration: 20,
    handoff: 'New requirement',
    doneText: 'finished requirements for',
    icon: '📋',
    canFindBug: false,
    bands: [
      { until: 50, status: 'WORKING', text: 'Analyzing requirements for {title}' },
      { until: 101, status: 'WORKING', text: 'Writing acceptance criteria for {title}' },
    ],
  },
  BACKEND: {
    id: 'BACKEND',
    owner: 'BACKEND',
    duration: 40,
    handoff: 'API ready',
    doneText: 'finished backend for',
    icon: '✓',
    canFindBug: false,
    bands: [
      { until: 60, status: 'WORKING', text: 'Implementing {title}' },
      { until: 85, status: 'WORKING', text: 'Writing unit tests for {title}' },
      { until: 101, status: 'REVIEWING', text: 'Self-reviewing PR for {title}' },
    ],
  },
  FRONTEND: {
    id: 'FRONTEND',
    owner: 'FRONTEND',
    duration: 35,
    handoff: 'Feature ready',
    doneText: 'finished UI for',
    icon: '✓',
    canFindBug: false,
    stat: 'prsReviewed',
    bands: [
      { until: 20, status: 'REVIEWING', text: 'Reviewing backend PR for {title}' },
      { until: 101, status: 'WORKING', text: 'Building UI for {title}' },
    ],
  },
  QA: {
    id: 'QA',
    owner: 'QA',
    duration: 30,
    handoff: 'Tests passed',
    doneText: 'completed regression for',
    icon: '✓',
    canFindBug: true,
    bands: [{ until: 101, status: 'TESTING', text: 'Running regression suite for {title}' }],
  },
  DOCS: {
    id: 'DOCS',
    owner: 'DOC_WRITER',
    duration: 24,
    handoff: 'Docs published',
    doneText: 'published docs for',
    icon: '📝',
    canFindBug: false,
    stat: 'docsWritten',
    bands: [
      { until: 40, status: 'WORKING', text: 'Reading the changes for {title}' },
      { until: 101, status: 'WORKING', text: 'Documenting {title}' },
    ],
  },
  BUGFIX: {
    id: 'BUGFIX',
    owner: 'BACKEND',
    duration: 18,
    handoff: 'Fix ready',
    doneText: 'fixed',
    icon: '🔧',
    canFindBug: false,
    stat: 'bugsFixed',
    bands: [{ until: 101, status: 'WORKING', text: 'Fixing {title}' }],
  },
  RETEST: {
    id: 'RETEST',
    owner: 'QA',
    duration: 14,
    handoff: 'Retest passed',
    doneText: 'retested',
    icon: '✓',
    canFindBug: false,
    bands: [{ until: 101, status: 'TESTING', text: 'Retesting {title}' }],
  },
  DEPLOY: {
    id: 'DEPLOY',
    owner: 'BACKEND',
    duration: 22,
    handoff: 'Deployed to staging',
    doneText: 'deployed',
    icon: '🚀',
    canFindBug: false,
    bands: [{ until: 101, status: 'DEPLOYING', text: 'Deploying {title}' }],
  },
  SMOKE: {
    id: 'SMOKE',
    owner: 'QA',
    duration: 14,
    handoff: 'Smoke tests passed',
    doneText: 'smoke tested',
    icon: '✓',
    canFindBug: false,
    bands: [{ until: 101, status: 'TESTING', text: 'Smoke testing {title}' }],
  },
  DESIGN: {
    id: 'DESIGN',
    owner: 'FRONTEND',
    duration: 26,
    handoff: 'Design ready',
    doneText: 'finished the design for',
    icon: '🎨',
    canFindBug: false,
    bands: [{ until: 101, status: 'WORKING', text: 'Designing {title}' }],
  },
  AUTOMATION: {
    id: 'AUTOMATION',
    owner: 'QA',
    duration: 22,
    handoff: 'Tests ready',
    doneText: 'automated tests for',
    icon: '✓',
    canFindBug: false,
    bands: [{ until: 101, status: 'TESTING', text: 'Automating tests for {title}' }],
  },
};

export function bandFor(
  stage: StageDef,
  progress: number,
  title: string,
): { status: AgentStatus; text: string } {
  const band = stage.bands.find((candidate) => progress < candidate.until) ?? stage.bands[stage.bands.length - 1];
  return { status: band.status, text: band.text.replace('{title}', title) };
}

export function taskStatusFor(status: AgentStatus): TaskStatus {
  switch (status) {
    case 'REVIEWING':
      return 'IN_REVIEW';
    case 'TESTING':
      return 'TESTING';
    case 'BLOCKED':
      return 'BLOCKED';
    default:
      return 'IN_PROGRESS';
  }
}

export interface BlockerDef {
  reason: string;
  resolver: AgentRole;
  fix: string;
}

export const BLOCKERS: Partial<Record<StageId, BlockerDef[]>> = {
  BACKEND: [
    {
      reason: 'Waiting for payment provider API credentials',
      resolver: 'PRODUCT',
      fix: 'Got the provider credentials, you can continue',
    },
    {
      reason: 'Unclear business rule for an edge case',
      resolver: 'PRODUCT',
      fix: 'Clarified the rule, see updated requirement',
    },
  ],
  FRONTEND: [
    {
      reason: 'Waiting for final copy and design spec',
      resolver: 'PRODUCT',
      fix: 'Final copy and spec are in the ticket',
    },
    {
      reason: 'API response is missing fields',
      resolver: 'BACKEND',
      fix: 'Added the missing fields to the response',
    },
  ],
  QA: [
    {
      reason: 'Staging environment is unstable',
      resolver: 'BACKEND',
      fix: 'Restarted staging, it is healthy again',
    },
  ],
  DOCS: [
    {
      reason: 'Needs API examples to document',
      resolver: 'BACKEND',
      fix: 'Shared request and response examples',
    },
  ],
};

export const BLOCK_CHANCE = 0.22;
export const BUG_CHANCE = 0.3;
export const MAX_BUGS_PER_TASK = 2;

export interface MeetingPlan {
  roles: AgentRole[];
  duration: number;
  topics: string[];
}

export const MEETING_PLANS: Record<MeetingKind, MeetingPlan> = {
  STANDUP: {
    roles: ALL_ROLES,
    duration: 12,
    topics: ['Daily sync', 'Priorities and blockers'],
  },
  SPRINT_PLANNING: {
    roles: ALL_ROLES,
    duration: 20,
    topics: ['Sprint scope'],
  },
  REFINEMENT: {
    roles: ['PRODUCT', 'BACKEND', 'FRONTEND', 'QA'],
    duration: 18,
    topics: ['Checkout redesign', 'Payment edge cases', 'Refund rules'],
  },
  TECHNICAL_DISCUSSION: {
    roles: ['BACKEND', 'FRONTEND', 'QA'],
    duration: 16,
    topics: ['API contract review', 'Caching strategy', 'Error handling approach'],
  },
  DESIGN_DISCUSSION: {
    roles: ['PRODUCT', 'FRONTEND', 'DOC_WRITER'],
    duration: 16,
    topics: ['User flow walkthrough', 'Copy and content review'],
  },
};

export const MEETING_ROTATION: MeetingKind[] = [
  'STANDUP',
  'REFINEMENT',
  'TECHNICAL_DISCUSSION',
  'STANDUP',
  'DESIGN_DISCUSSION',
];

export interface TaskTemplate {
  type: TaskType;
  pipeline: StageId[];
  titles: string[];
  weight: number;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: 'FEATURE',
    pipeline: ['REQUIREMENT', 'BACKEND', 'FRONTEND', 'QA', 'DOCS'],
    weight: 40,
    titles: [
      'Payment API',
      'Checkout flow',
      'Order history page',
      'Promo codes',
      'Saved cards',
      'Refund workflow',
      'Wishlist',
      'Search filters',
      'Notification center',
      'Profile settings',
      'Invoice export',
      'Loyalty points',
    ],
  },
  {
    type: 'BUG',
    pipeline: ['BUGFIX', 'RETEST'],
    weight: 20,
    titles: [
      'Checkout total miscalculation',
      'Duplicate order emails',
      'Cart badge count',
      'Receipt timezone offset',
      'Coupon stacking glitch',
      'Stale price on retry',
    ],
  },
  {
    type: 'REFACTOR',
    pipeline: ['BACKEND', 'QA'],
    weight: 10,
    titles: ['Pricing module', 'Auth middleware', 'Order service', 'Notification templates'],
  },
  {
    type: 'TEST',
    pipeline: ['AUTOMATION'],
    weight: 10,
    titles: ['Payment integration suite', 'Checkout regression suite', 'Orders API contract tests'],
  },
  {
    type: 'DOCUMENTATION',
    pipeline: ['DOCS'],
    weight: 8,
    titles: ['Payment API reference', 'Onboarding guide', 'Release notes', 'Refund runbook'],
  },
  {
    type: 'DESIGN',
    pipeline: ['REQUIREMENT', 'DESIGN'],
    weight: 6,
    titles: ['Payment flow', 'Empty states', 'Onboarding checklist'],
  },
  {
    type: 'DEPLOYMENT',
    pipeline: ['DEPLOY', 'SMOKE'],
    weight: 6,
    titles: ['Staging environment', 'Release candidate', 'Feature flag rollout'],
  },
];

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export const PRIORITY_WEIGHTS: [TaskPriority, number][] = [
  ['LOW', 15],
  ['MEDIUM', 40],
  ['HIGH', 35],
  ['CRITICAL', 10],
];
