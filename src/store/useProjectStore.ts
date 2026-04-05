import { create } from 'zustand';
import type { ProjectData, PipelineStatus } from '@/lib/types';

interface ProjectStore {
  project: ProjectData | null;
  projectPath: string | null;
  setProject: (data: ProjectData, path?: string) => void;
  clearProject: () => void;

  selectedAgentId: string | null;
  selectAgent: (id: string | null) => void;

  showArchived: boolean;
  toggleShowArchived: () => void;

  pausedAgentIds: Set<string>;
  togglePaused: (id: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Live monitoring
  monitoringEnabled: boolean;
  toggleMonitoring: () => void;
  pipelineStatus: PipelineStatus | null;
  setPipelineStatus: (status: PipelineStatus | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  projectPath: null,
  setProject: (data, path) => set({ project: data, projectPath: path ?? null }),
  clearProject: () => set({ project: null, selectedAgentId: null, projectPath: null }),

  selectedAgentId: null,
  selectAgent: (id) => set({ selectedAgentId: id }),

  showArchived: false,
  toggleShowArchived: () => set((s) => ({ showArchived: !s.showArchived })),

  pausedAgentIds: new Set(),
  togglePaused: (id) =>
    set((s) => {
      const next = new Set(s.pausedAgentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { pausedAgentIds: next };
    }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  monitoringEnabled: false,
  toggleMonitoring: () => set((s) => ({ monitoringEnabled: !s.monitoringEnabled })),
  pipelineStatus: null,
  setPipelineStatus: (status) => set({ pipelineStatus: status }),
}));
