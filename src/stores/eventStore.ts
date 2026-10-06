import { create } from 'zustand';
import type { CommMessage, FeedItem } from '../types/events';

const MAX_FEED_ITEMS = 60;
const MESSAGE_LIFETIME_MS = 4500;

let sequence = 0;

export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

interface EventState {
  feed: FeedItem[];
  messages: CommMessage[];
  speech: Record<string, { id: string; text: string }>;
  pushFeed: (time: string, icon: string, text: string) => void;
  postMessage: (message: Omit<CommMessage, 'id' | 'createdAt'>) => void;
  reset: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  feed: [],
  messages: [],
  speech: {},
  pushFeed: (time, icon, text) =>
    set((state) => ({
      feed: [{ id: nextId('F'), time, icon, text }, ...state.feed].slice(0, MAX_FEED_ITEMS),
    })),
  postMessage: (message) => {
    const id = nextId('M');
    const entry: CommMessage = { ...message, id, createdAt: performance.now() };
    set((state) => ({
      messages: [...state.messages, entry],
      speech: { ...state.speech, [message.fromId]: { id, text: message.text } },
    }));
    const timer = setTimeout(() => {
      const state = get();
      const speech = { ...state.speech };
      if (speech[message.fromId]?.id === id) delete speech[message.fromId];
      set({ messages: state.messages.filter((item) => item.id !== id), speech });
    }, MESSAGE_LIFETIME_MS);
    if (typeof timer === 'object' && 'unref' in timer) timer.unref();
  },
  reset: () => set({ feed: [], messages: [], speech: {} }),
}));
