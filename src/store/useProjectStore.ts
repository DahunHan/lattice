import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

  // Hydration tracking
  _hasHydrated: boolean;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
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

      _hasHydrated: false,
    }),
    {
      name: 'hailmary-project',
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) => {
          if (value instanceof Set) return { __type: 'Set', values: [...value] };
          return value;
        },
        reviver: (_key, value) => {
          if (value && typeof value === 'object' && '__type' in value && value.__type === 'Set') {
            return new Set((value as unknown as { values: string[] }).values);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        project: state.project,
        projectPath: state.projectPath,
        showArchived: state.showArchived,
        pausedAgentIds: state.pausedAgentIds,
        monitoringEnabled: state.monitoringEnabled,
      }),
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0) {
          // v0 → v1: ensure warnings array exists on project
          if (state.project && typeof state.project === 'object') {
            const proj = state.project as Record<string, unknown>;
            if (!Array.isArray(proj.warnings)) {
              proj.warnings = [];
            }
          }
        }
        return state as never;
      },
      onRehydrateStorage: () => () => {
        useProjectStore.setState({ _hasHydrated: true });
      },
    }
  )
);
