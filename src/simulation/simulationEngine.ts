import type { Agent, AgentRole, AgentStats, AreaId, Vec2 } from '../types/agent';
import type { TeamEvent } from '../types/events';
import type { StageId, Task, TaskPriority } from '../types/task';
import { formatClock, MEETING_LABELS, type Meeting, type MeetingKind } from '../types/team';
import { useAgentStore } from '../stores/agentStore';
import { nextId } from '../stores/eventStore';
import { useSimulationStore } from '../stores/simulationStore';
import { useTaskStore } from '../stores/taskStore';
import { agentRegistry } from './agentRegistry';
import { BREAK_SPOTS, MEETING_SEATS, sameSpot, visitSpot } from './layout';
import {
  BLOCK_CHANCE,
  BLOCKERS,
  BUG_CHANCE,
  bandFor,
  MAX_BUGS_PER_TASK,
  MEETING_PLANS,
  MEETING_ROTATION,
  PRIORITY_RANK,
  PRIORITY_WEIGHTS,
  STAGES,
  taskStatusFor,
  TASK_TEMPLATES,
  type BlockerDef,
  type StageDef,
} from './workflows';

type Mode = 'FREE' | 'WORKING' | 'BLOCKED' | 'HELPING' | 'VISITING' | 'MEETING' | 'BREAK';

interface Runtime {
  mode: Mode;
  prevMode: Mode;
  idleFor: number;
  progress: number;
  blockAt: number | null;
  blocker: BlockerDef | null;
  blockedFor: number;
  resolverId: string | null;
  helping: { targetId: string; remaining: number; blocker: BlockerDef } | null;
  visitRemaining: number;
}

interface ActiveMeeting {
  meeting: Meeting;
  running: boolean;
  gathered: number;
  elapsed: number;
  duration: number;
}

const TICK_INTERVAL_MS = 100;
const IDLE_BEFORE_WANDER = 10;
const BREAK_DURATION = 14;
const VISIT_DURATION = 4;
const HELP_DURATION = 6;
const BLOCKED_BEFORE_HELP = 6;
const BLOCKED_AUTO_RESOLVE = 45;
const GATHER_TIMEOUT = 30;
const NEXT_SPRINT_CAPACITY = 12;
const MAX_OPEN_TASKS = 7;
const INTERRUPTIBLE: Mode[] = ['FREE', 'WORKING', 'BREAK'];

function freshRuntime(): Runtime {
  return {
    mode: 'FREE',
    prevMode: 'FREE',
    idleFor: 0,
    progress: 0,
    blockAt: null,
    blocker: null,
    blockedFor: 0,
    resolverId: null,
    helping: null,
    visitRemaining: 0,
  };
}

export class SimulationEngine {
  private readonly runtimes = new Map<string, Runtime>();
  private activeMeeting: ActiveMeeting | null = null;
  private pendingPlanning: number | null = null;
  private taskTimer = 12;
  private meetingTimer = 40;
  private meetingCursor = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly emit: (event: TeamEvent) => void,
    private readonly rng: () => number = Math.random,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const simulation = useSimulationStore.getState();
      if (simulation.running) this.tick((TICK_INTERVAL_MS / 1000) * simulation.speed);
    }, TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset(): void {
    this.runtimes.clear();
    this.activeMeeting = null;
    this.pendingPlanning = null;
    this.taskTimer = 12;
    this.meetingTimer = 40;
    this.meetingCursor = 0;
  }

  tick(dt: number): void {
    useSimulationStore.getState().advance(dt);
    this.detectArrivals();
    this.updateSprint();
    this.spawnTasks(dt);
    this.updateMeeting(dt);
    for (const agent of this.agents()) this.updateAgent(agent, dt);
  }

  private agents(): Agent[] {
    const { agents, order } = useAgentStore.getState();
    return order.map((id) => agents[id]);
  }

  private agent(id: string): Agent {
    return useAgentStore.getState().agents[id];
  }

  private tasks(): Task[] {
    const { tasks, order } = useTaskStore.getState();
    return order.map((id) => tasks[id]);
  }

  private task(id: string): Task | undefined {
    return useTaskStore.getState().tasks[id];
  }

  private runtime(id: string): Runtime {
    let runtime = this.runtimes.get(id);
    if (!runtime) {
      runtime = freshRuntime();
      this.runtimes.set(id, runtime);
    }
    return runtime;
  }

  private stageOf(task: Task): StageDef {
    return STAGES[task.pipeline[task.stageIndex]];
  }

  private detectArrivals(): void {
    for (const agent of this.agents()) {
      if (agent.moving && agentRegistry.hasArrived(agent.id, agent.target)) {
        this.emit({
          type: 'AGENT_MOVED',
          payload: { agentId: agent.id, area: agent.location, target: agent.target, arrived: true },
        });
      }
    }
  }

  private moveTo(agent: Agent, area: AreaId, target: Vec2): void {
    this.emit({
      type: 'AGENT_MOVED',
      payload: {
        agentId: agent.id,
        area,
        target,
        arrived: agentRegistry.hasArrived(agent.id, target),
      },
    });
  }

  private setStatus(
    agent: Agent,
    status: Agent['status'],
    activity: string,
    extra: { blockedReason?: string | null; currentTaskId?: string | null } = {},
  ): void {
    this.emit({
      type: 'AGENT_STATUS_CHANGED',
      payload: { agentId: agent.id, status, activity, ...extra },
    });
  }

  private updateSprint(): void {
    const { sprint } = useTaskStore.getState();
    const sprintTasks = this.tasks().filter((task) => task.sprintId === sprint.number);
    const finished = sprintTasks.length >= sprint.capacity && sprintTasks.every((task) => task.status === 'DONE');
    if (!finished) return;
    const next = sprint.number + 1;
    this.emit({ type: 'SPRINT_STARTED', payload: { sprint: next, capacity: NEXT_SPRINT_CAPACITY } });
    this.pendingPlanning = next;
    this.taskTimer = 6;
  }

  private weightedPick<T>(entries: [T, number][]): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.rng() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  private spawnTasks(dt: number): void {
    this.taskTimer -= dt;
    if (this.taskTimer > 0) return;
    this.taskTimer = 14 + this.rng() * 12;

    const { sprint } = useTaskStore.getState();
    const sprintTasks = this.tasks().filter((task) => task.sprintId === sprint.number);
    const open = sprintTasks.filter((task) => task.status !== 'DONE').length;
    if (sprintTasks.length >= sprint.capacity || open >= MAX_OPEN_TASKS) return;
    this.createTask(sprint.number);
  }

  private createTask(sprintId: number): void {
    const roles = new Set(this.agents().map((agent) => agent.role));
    const templates = TASK_TEMPLATES.filter((template) =>
      template.pipeline.every((stage) => roles.has(STAGES[stage].owner)),
    );
    if (templates.length === 0) return;

    const template = this.weightedPick(templates.map((candidate) => [candidate, candidate.weight] as [typeof candidate, number]));
    const openTitles = new Set(this.tasks().filter((task) => task.status !== 'DONE').map((task) => task.title));
    const available = template.titles.filter((title) => !openTitles.has(title));
    const pool = available.length > 0 ? available : template.titles;
    const title = pool[Math.floor(this.rng() * pool.length)];
    const priority: TaskPriority = this.weightedPick(
      PRIORITY_WEIGHTS.map(([value, weight]) => [value, template.type === 'BUG' && value === 'LOW' ? 0 : weight] as [TaskPriority, number]),
    );
    const creator = this.agents().find((agent) => agent.role === 'PRODUCT') ?? this.agents()[0];
    const id = `T-${101 + useTaskStore.getState().order.length}`;
    const task: Task = {
      id,
      title,
      type: template.type,
      status: 'TODO',
      priority,
      assigneeId: null,
      progress: 0,
      sprintId,
      pipeline: [...template.pipeline],
      stageIndex: 0,
      bugCount: 0,
      createdAt: formatClock(useSimulationStore.getState().simTime),
    };
    this.emit({ type: 'TASK_CREATED', payload: { task, createdBy: creator ? creator.id : null } });

    const firstOwner = STAGES[template.pipeline[0]].owner;
    if (creator && firstOwner !== creator.role) {
      const receiver = this.agents().find((agent) => agent.role === firstOwner);
      if (receiver) {
        this.emit({
          type: 'AGENT_MESSAGE',
          payload: { fromId: creator.id, toId: receiver.id, text: 'New requirement', kind: 'HANDOFF', taskId: id },
        });
      }
    }
  }

  private updateAgent(agent: Agent, dt: number): void {
    const runtime = this.runtime(agent.id);
    switch (runtime.mode) {
      case 'WORKING':
        this.work(agent, runtime, dt);
        break;
      case 'BLOCKED':
        this.waitForHelp(agent, runtime, dt);
        break;
      case 'HELPING':
        this.help(agent, runtime, dt);
        break;
      case 'VISITING':
        this.visit(agent, runtime, dt);
        break;
      case 'MEETING':
        break;
      default:
        this.free(agent, runtime, dt);
    }
  }

  private pickTask(agent: Agent, runtime: Runtime): boolean {
    const candidates = this.tasks()
      .filter((task) => task.status !== 'DONE' && task.assigneeId === null && this.stageOf(task).owner === agent.role)
      .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    const task = candidates[0];
    if (!task) return false;

    const stage = this.stageOf(task);
    const band = bandFor(stage, 0, task.title);
    runtime.mode = 'WORKING';
    runtime.progress = 0;
    runtime.idleFor = 0;
    runtime.blocker = this.chooseBlocker(agent, stage);
    runtime.blockAt = runtime.blocker ? 25 + this.rng() * 50 : null;

    this.emit({ type: 'TASK_ASSIGNED', payload: { taskId: task.id, agentId: agent.id } });
    this.emit({
      type: 'TASK_UPDATED',
      payload: { taskId: task.id, patch: { status: taskStatusFor(band.status), progress: 0 } },
    });
    this.setStatus(agent, band.status, band.text, { currentTaskId: task.id });
    this.moveTo(agent, agent.homeArea, agent.home);
    return true;
  }

  private chooseBlocker(agent: Agent, stage: StageDef): BlockerDef | null {
    const options = BLOCKERS[stage.id];
    if (!options || options.length === 0 || this.rng() >= BLOCK_CHANCE) return null;
    const option = options[Math.floor(this.rng() * options.length)];
    const resolverExists = this.agents().some((other) => other.id !== agent.id && other.role === option.resolver);
    return resolverExists ? option : null;
  }

  private work(agent: Agent, runtime: Runtime, dt: number): void {
    if (agent.moving) return;
    const task = agent.currentTaskId ? this.task(agent.currentTaskId) : undefined;
    if (!task) {
      runtime.mode = 'FREE';
      return;
    }

    const stage = this.stageOf(task);
    const before = runtime.progress;
    let progress = Math.min(100, before + (dt / stage.duration) * 100);

    if (runtime.blocker && runtime.blockAt !== null && before < runtime.blockAt && progress >= runtime.blockAt) {
      progress = runtime.blockAt;
      runtime.progress = progress;
      this.publishProgress(task, progress);
      this.block(agent, runtime, task);
      return;
    }

    runtime.progress = progress;
    this.publishProgress(task, progress, before);

    const band = bandFor(stage, progress, task.title);
    if (band.status !== agent.status || band.text !== agent.activity) {
      this.setStatus(agent, band.status, band.text);
      this.emit({ type: 'TASK_UPDATED', payload: { taskId: task.id, patch: { status: taskStatusFor(band.status) } } });
    }

    if (progress >= 100) this.completeStage(agent, runtime, task, stage);
  }

  private publishProgress(task: Task, progress: number, before = -1): void {
    const rounded = Math.floor(progress);
    if (rounded === Math.floor(before)) return;
    this.emit({ type: 'TASK_UPDATED', payload: { taskId: task.id, patch: { progress: rounded } } });
  }

  private block(agent: Agent, runtime: Runtime, task: Task): void {
    const reason = runtime.blocker ? runtime.blocker.reason : 'Blocked';
    runtime.mode = 'BLOCKED';
    runtime.blockedFor = 0;
    runtime.resolverId = null;
    this.emit({ type: 'TASK_UPDATED', payload: { taskId: task.id, patch: { status: 'BLOCKED' } } });
    this.setStatus(agent, 'BLOCKED', reason, { blockedReason: reason });
  }

  private waitForHelp(agent: Agent, runtime: Runtime, dt: number): void {
    runtime.blockedFor += dt;
    if (runtime.resolverId || runtime.blockedFor < BLOCKED_BEFORE_HELP || !runtime.blocker) return;

    const blocker = runtime.blocker;
    const resolver = this.agents().find(
      (candidate) =>
        candidate.id !== agent.id &&
        candidate.role === blocker.resolver &&
        INTERRUPTIBLE.includes(this.runtime(candidate.id).mode),
    );

    if (!resolver) {
      if (runtime.blockedFor > BLOCKED_AUTO_RESOLVE) this.unblock(agent, runtime);
      return;
    }

    const resolverRuntime = this.runtime(resolver.id);
    resolverRuntime.prevMode = resolverRuntime.mode === 'BREAK' ? 'FREE' : resolverRuntime.mode;
    resolverRuntime.mode = 'HELPING';
    resolverRuntime.helping = { targetId: agent.id, remaining: HELP_DURATION, blocker };
    runtime.resolverId = resolver.id;

    this.setStatus(resolver, 'WORKING', `Helping ${agent.name}: ${blocker.reason}`);
    this.moveTo(resolver, agent.homeArea, visitSpot(agent.home));
  }

  private help(agent: Agent, runtime: Runtime, dt: number): void {
    const helping = runtime.helping;
    if (!helping) {
      runtime.mode = 'FREE';
      return;
    }
    if (agent.moving) return;
    helping.remaining -= dt;
    if (helping.remaining > 0) return;

    const target = this.agent(helping.targetId);
    const targetRuntime = this.runtime(target.id);
    this.emit({
      type: 'AGENT_MESSAGE',
      payload: {
        fromId: agent.id,
        toId: target.id,
        text: helping.blocker.fix,
        kind: 'UNBLOCK',
        taskId: target.currentTaskId ?? undefined,
      },
    });
    if (targetRuntime.mode === 'BLOCKED') this.unblock(target, targetRuntime);

    runtime.helping = null;
    runtime.mode = runtime.prevMode;
    this.returnToDesk(agent, runtime);
  }

  private unblock(agent: Agent, runtime: Runtime): void {
    runtime.blocker = null;
    runtime.blockAt = null;
    runtime.resolverId = null;
    runtime.blockedFor = 0;
    runtime.mode = 'WORKING';
    const task = agent.currentTaskId ? this.task(agent.currentTaskId) : undefined;
    if (!task) {
      runtime.mode = 'FREE';
      return;
    }
    const band = bandFor(this.stageOf(task), runtime.progress, task.title);
    this.emit({ type: 'TASK_UPDATED', payload: { taskId: task.id, patch: { status: taskStatusFor(band.status) } } });
    this.setStatus(agent, band.status, band.text, { blockedReason: null });
  }

  private returnToDesk(agent: Agent, runtime: Runtime): void {
    const task = agent.currentTaskId ? this.task(agent.currentTaskId) : undefined;
    if (runtime.mode === 'WORKING' && task) {
      const band = bandFor(this.stageOf(task), runtime.progress, task.title);
      this.setStatus(agent, band.status, band.text);
    } else {
      runtime.mode = 'FREE';
      runtime.idleFor = 0;
      this.setStatus(agent, 'IDLE', 'Heading back to the desk');
    }
    this.moveTo(agent, agent.homeArea, agent.home);
  }

  private completeStage(agent: Agent, runtime: Runtime, task: Task, stage: StageDef): void {
    const index = task.stageIndex;
    const bugFound = stage.canFindBug && task.bugCount < MAX_BUGS_PER_TASK && this.rng() < BUG_CHANCE;
    const stats: (keyof AgentStats)[] = ['tasksCompleted', ...(stage.stat ? [stage.stat] : [])];
    const doneNote = { agentId: agent.id, icon: stage.icon, text: `${stage.doneText} "${task.title}"`, stats };

    runtime.progress = 0;
    runtime.mode = 'FREE';
    runtime.idleFor = 0;
    runtime.blocker = null;
    runtime.blockAt = null;

    let receiverRole: AgentRole | null = null;
    let messageText = stage.handoff;
    let messageKind: 'HANDOFF' | 'BUG' = 'HANDOFF';

    if (bugFound) {
      const pipeline: StageId[] = [
        ...task.pipeline.slice(0, index + 1),
        'BUGFIX',
        'RETEST',
        ...task.pipeline.slice(index + 1),
      ];
      this.emit({
        type: 'TASK_UPDATED',
        payload: {
          taskId: task.id,
          patch: {
            pipeline,
            stageIndex: index + 1,
            status: 'TODO',
            assigneeId: null,
            progress: 0,
            bugCount: task.bugCount + 1,
          },
          note: { agentId: agent.id, icon: '🐞', text: `found a bug in "${task.title}"`, stats },
        },
      });
      receiverRole = 'BACKEND';
      messageText = `Bug found in "${task.title}"`;
      messageKind = 'BUG';
    } else if (index + 1 >= task.pipeline.length) {
      this.emit({
        type: 'TASK_UPDATED',
        payload: { taskId: task.id, patch: { status: 'DONE', progress: 100 }, note: doneNote },
      });
      this.emit({ type: 'TASK_COMPLETED', payload: { taskId: task.id, agentId: agent.id } });
    } else {
      this.emit({
        type: 'TASK_UPDATED',
        payload: {
          taskId: task.id,
          patch: { stageIndex: index + 1, status: 'TODO', assigneeId: null, progress: 0 },
          note: doneNote,
        },
      });
      receiverRole = STAGES[task.pipeline[index + 1]].owner;
    }

    this.setStatus(agent, 'IDLE', 'Looking for the next task', { currentTaskId: null });

    if (!receiverRole || receiverRole === agent.role) return;
    const receiver = this.pickReceiver(receiverRole, agent);
    if (!receiver) return;
    this.emit({
      type: 'AGENT_MESSAGE',
      payload: { fromId: agent.id, toId: receiver.id, text: messageText, kind: messageKind, taskId: task.id },
    });
    if (this.rng() < 0.7) this.startVisit(agent, runtime, receiver, `Walking ${receiver.name} through "${task.title}"`);
  }

  private pickReceiver(role: AgentRole, from: Agent): Agent | undefined {
    const candidates = this.agents().filter((agent) => agent.role === role && agent.id !== from.id);
    return candidates.find((agent) => this.runtime(agent.id).mode === 'FREE') ?? candidates[0];
  }

  private startVisit(agent: Agent, runtime: Runtime, host: Agent, activity: string): void {
    runtime.mode = 'VISITING';
    runtime.visitRemaining = VISIT_DURATION;
    this.setStatus(agent, 'WAITING', activity);
    this.moveTo(agent, host.homeArea, visitSpot(host.home));
  }

  private visit(agent: Agent, runtime: Runtime, dt: number): void {
    if (agent.moving) return;
    runtime.visitRemaining -= dt;
    if (runtime.visitRemaining > 0) return;
    runtime.mode = 'FREE';
    runtime.idleFor = 0;
    this.setStatus(agent, 'IDLE', 'Heading back to the desk');
    this.moveTo(agent, agent.homeArea, agent.home);
  }

  private free(agent: Agent, runtime: Runtime, dt: number): void {
    if (this.pickTask(agent, runtime)) return;
    if (agent.moving) return;

    if (runtime.mode === 'BREAK') {
      runtime.idleFor += dt;
      if (runtime.idleFor > BREAK_DURATION) {
        runtime.mode = 'FREE';
        runtime.idleFor = 0;
        this.setStatus(agent, 'IDLE', 'Back from the break');
        this.moveTo(agent, agent.homeArea, agent.home);
      }
      return;
    }

    if (!sameSpot(agent.target, agent.home)) {
      this.moveTo(agent, agent.homeArea, agent.home);
      return;
    }

    runtime.idleFor += dt;
    const upstreamWork = this.tasks().some((task) => task.status !== 'DONE' && this.stageOf(task).owner !== agent.role);
    const status = upstreamWork ? 'WAITING' : 'IDLE';
    const activity = upstreamWork ? 'Waiting for upstream work' : 'Waiting for new tasks';
    if (agent.status !== status || agent.activity !== activity) this.setStatus(agent, status, activity);

    if (runtime.idleFor > IDLE_BEFORE_WANDER) this.wander(agent, runtime);
  }

  private wander(agent: Agent, runtime: Runtime): void {
    const hosts = this.agents().filter(
      (other) => other.id !== agent.id && this.runtime(other.id).mode === 'WORKING' && !other.moving,
    );
    runtime.idleFor = 0;
    if (hosts.length > 0 && this.rng() < 0.5) {
      const host = hosts[Math.floor(this.rng() * hosts.length)];
      this.startVisit(agent, runtime, host, `Syncing with ${host.name}`);
      return;
    }
    const index = Math.max(0, useAgentStore.getState().order.indexOf(agent.id));
    runtime.mode = 'BREAK';
    this.setStatus(agent, 'BREAK', 'Grabbing a coffee');
    this.moveTo(agent, 'BREAK_AREA', BREAK_SPOTS[index % BREAK_SPOTS.length]);
  }

  private updateMeeting(dt: number): void {
    const active = this.activeMeeting;
    if (!active) {
      this.meetingTimer -= dt;
      if (this.pendingPlanning !== null) {
        const started = this.startMeeting('SPRINT_PLANNING', `Sprint ${this.pendingPlanning} planning`);
        if (started) this.pendingPlanning = null;
        return;
      }
      if (this.meetingTimer <= 0) {
        const kind = MEETING_ROTATION[this.meetingCursor % MEETING_ROTATION.length];
        const topics = MEETING_PLANS[kind].topics;
        const topic = topics[Math.floor(this.rng() * topics.length)];
        if (this.startMeeting(kind, topic)) this.meetingCursor += 1;
        else this.meetingTimer = 15;
      }
      return;
    }

    if (!active.running) {
      active.gathered += dt;
      const everyoneSeated = active.meeting.participantIds.every((id) => !this.agent(id).moving);
      if (everyoneSeated || active.gathered > GATHER_TIMEOUT) active.running = true;
      return;
    }

    active.elapsed += dt;
    if (active.elapsed >= active.duration) this.endMeeting(active);
  }

  private startMeeting(kind: MeetingKind, topic: string): boolean {
    const plan = MEETING_PLANS[kind];
    const participants = this.agents().filter(
      (agent) => plan.roles.includes(agent.role) && INTERRUPTIBLE.includes(this.runtime(agent.id).mode),
    );
    if (participants.length < 2) return false;

    const meeting: Meeting = {
      id: nextId('MTG'),
      kind,
      topic,
      participantIds: participants.map((agent) => agent.id),
      startedAt: useSimulationStore.getState().simTime,
    };
    this.activeMeeting = { meeting, running: false, gathered: 0, elapsed: 0, duration: plan.duration };

    participants.forEach((agent, seatIndex) => {
      const runtime = this.runtime(agent.id);
      runtime.prevMode = runtime.mode === 'BREAK' ? 'FREE' : runtime.mode;
      runtime.mode = 'MEETING';
      this.setStatus(agent, 'IN_MEETING', `${MEETING_LABELS[kind]}: ${topic}`);
      this.moveTo(agent, 'MEETING_ROOM', MEETING_SEATS[seatIndex % MEETING_SEATS.length]);
    });
    this.emit({ type: 'MEETING_STARTED', payload: { meeting } });
    return true;
  }

  private endMeeting(active: ActiveMeeting): void {
    for (const id of active.meeting.participantIds) {
      const agent = this.agent(id);
      const runtime = this.runtime(id);
      runtime.mode = runtime.prevMode;
      this.returnToDesk(agent, runtime);
    }
    this.emit({ type: 'MEETING_ENDED', payload: { meetingId: active.meeting.id } });
    this.activeMeeting = null;
    this.meetingTimer = 100 + this.rng() * 60;
  }
}
