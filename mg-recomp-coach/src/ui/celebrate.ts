import { create } from 'zustand';

export interface Celebration {
  title: string;
  text: string;
  kind: 'badge' | 'level' | 'milestone' | 'pr';
}

export const useCelebration = create<{ queue: Celebration[]; push: (c: Celebration) => void; pop: () => void }>((set) => ({
  queue: [],
  push: (c) => set((s) => ({ queue: [...s.queue, c] })),
  pop: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

export const celebrate = (c: Celebration) => useCelebration.getState().push(c);
