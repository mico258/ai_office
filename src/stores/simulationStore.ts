import { create } from 'zustand';
import type { Meeting, SimSpeed } from '../types/team';

interface SimulationState {
  running: boolean;
  speed: SimSpeed;
  simTime: number;
  epoch: number;
  meeting: Meeting | null;
  start: () => void;
  pause: () => void;
  setSpeed: (speed: SimSpeed) => void;
  advance: (seconds: number) => void;
  setMeeting: (meeting: Meeting | null) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  running: true,
  speed: 1,
  simTime: 0,
  epoch: 0,
  meeting: null,
  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  setSpeed: (speed) => set({ speed }),
  advance: (seconds) => set((state) => ({ simTime: state.simTime + seconds })),
  setMeeting: (meeting) => set({ meeting }),
  reset: () => set((state) => ({ simTime: 0, meeting: null, epoch: state.epoch + 1 })),
}));
