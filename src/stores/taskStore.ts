import { create } from 'zustand';
import type { SprintInfo, Task } from '../types/task';
import { createSeedTasks, SEED_SPRINT } from '../simulation/mockData';

export interface SprintStats {
  total: number;
  done: number;
  highTotal: number;
  highDone: number;
  bugTotal: number;
  bugDone: number;
}

interface TaskState {
  tasks: Record<string, Task>;
  order: string[];
  sprint: SprintInfo;
  addTask: (task: Task) => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  startSprint: (sprint: SprintInfo) => void;
  reset: (tasks: Task[], sprint: SprintInfo) => void;
}

function index(tasks: Task[]): Pick<TaskState, 'tasks' | 'order'> {
  return {
    tasks: Object.fromEntries(tasks.map((task) => [task.id, task])),
    order: tasks.map((task) => task.id),
  };
}

export const useTaskStore = create<TaskState>((set) => ({
  ...index(createSeedTasks()),
  sprint: SEED_SPRINT,
  addTask: (task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: task },
      order: [...state.order, task.id],
    })),
  patchTask: (id, patch) =>
    set((state) => {
      const current = state.tasks[id];
      if (!current) return state;
      return { tasks: { ...state.tasks, [id]: { ...current, ...patch } } };
    }),
  startSprint: (sprint) => set({ sprint }),
  reset: (tasks, sprint) => set({ ...index(tasks), sprint }),
}));

export function computeSprintStats(tasks: Record<string, Task>, sprint: number): SprintStats {
  const stats: SprintStats = { total: 0, done: 0, highTotal: 0, highDone: 0, bugTotal: 0, bugDone: 0 };
  for (const task of Object.values(tasks)) {
    if (task.sprintId !== sprint) continue;
    const done = task.status === 'DONE';
    const high = task.priority === 'HIGH' || task.priority === 'CRITICAL';
    const bug = task.type === 'BUG';
    stats.total += 1;
    if (done) stats.done += 1;
    if (high) {
      stats.highTotal += 1;
      if (done) stats.highDone += 1;
    }
    if (bug) {
      stats.bugTotal += 1;
      if (done) stats.bugDone += 1;
    }
  }
  return stats;
}

export function selectSprintKey(state: TaskState): string {
  const s = computeSprintStats(state.tasks, state.sprint.number);
  return [state.sprint.number, state.sprint.capacity, s.total, s.done, s.highTotal, s.highDone, s.bugTotal, s.bugDone].join('|');
}

export function parseSprintKey(key: string): SprintStats & { number: number; capacity: number } {
  const [number, capacity, total, done, highTotal, highDone, bugTotal, bugDone] = key.split('|').map(Number);
  return { number, capacity, total, done, highTotal, highDone, bugTotal, bugDone };
}

export function selectOpenTasksKey(state: TaskState): string {
  return state.order
    .map((id) => state.tasks[id])
    .filter((task) => task.status !== 'DONE')
    .map((task) => `${task.id}:${task.status}`)
    .join(',');
}
