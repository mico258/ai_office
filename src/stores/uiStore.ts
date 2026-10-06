import { create } from 'zustand';
import type { ConnectionStatus } from '../services/teamSocket';

interface UiState {
  selectedAgentId: string | null;
  cameraResetNonce: number;
  connection: ConnectionStatus;
  selectAgent: (id: string) => void;
  clearSelection: () => void;
  resetCamera: () => void;
  setConnection: (status: ConnectionStatus) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAgentId: null,
  cameraResetNonce: 0,
  connection: 'DISCONNECTED',
  selectAgent: (id) => set({ selectedAgentId: id }),
  clearSelection: () => set({ selectedAgentId: null }),
  resetCamera: () => set((state) => ({ selectedAgentId: null, cameraResetNonce: state.cameraResetNonce + 1 })),
  setConnection: (connection) => set({ connection }),
}));
