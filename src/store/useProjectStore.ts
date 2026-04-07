import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProjectData, PipelineStatus } from '@/lib/types';
import type { Snapshot, DiffResult } from '@/lib/snapshot/snapshotTypes';
import { diffSnapshots } from '@/lib/snapshot/diffEngine';

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

  // Snapshots
  snapshots: Snapshot[];
  activeComparisonId: string | null;
  diffResult: DiffResult | null;
  saveSnapshot: (label?: string) => void;
  deleteSnapshot: (id: string) => void;
  compareWith: (id: string) => void;
  clearComparison: () => void;

  // Hydration tracking
  _hasHydrated: boolean;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: null,
      projectPath: null,
      setProject: (data, path) => set({ project: data, projectPath: path ?? null, activeComparisonId: null, diffResult: null }),
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

      // Snapshots
      snapshots: [],
      activeComparisonId: null,
      diffResult: null,
      saveSnapshot: (label) =>
        set((s) => {
          if (!s.project) return s;
          // Strip rawFiles from snapshot to save space (they can be large)
          const { rawFiles: _, ...projectWithoutRaw } = s.project;
          const snapshot: Snapshot = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            label: label ?? `Snapshot ${s.snapshots.length + 1}`,
            projectData: structuredClone({ ...projectWithoutRaw, rawFiles: [] }) as ProjectData,
          };
          // Cap at 20 snapshots, remove oldest if needed
          const updated = [...s.snapshots, snapshot];
          if (updated.length > 20) updated.shift();
          return { snapshots: updated };
        }),
      deleteSnapshot: (id) =>
        set((s) => ({
          snapshots: s.snapshots.filter(snap => snap.id !== id),
          activeComparisonId: s.activeComparisonId === id ? null : s.activeComparisonId,
          diffResult: s.activeComparisonId === id ? null : s.diffResult,
        })),
      compareWith: (id) =>
        set((s) => {
          if (!s.project) return s;
          const snapshot = s.snapshots.find(snap => snap.id === id);
          if (!snapshot) return s;
          const result = diffSnapshots(s.project, snapshot.projectData);
          return { activeComparisonId: id, diffResult: result };
        }),
      clearComparison: () => set({ activeComparisonId: null, diffResult: null }),

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
        snapshots: state.snapshots,
      }),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 1) {
          if (state.project && typeof state.project === 'object') {
            const proj = state.project as Record<string, unknown>;
            if (!Array.isArray(proj.warnings)) {
              proj.warnings = [];
            }
          }
        }
        if (version < 2) {
          if (!Array.isArray(state.snapshots)) {
            state.snapshots = [];
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
