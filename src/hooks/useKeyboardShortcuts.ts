"use client";

import { useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';

export function useKeyboardShortcuts() {
  const project = useProjectStore((s) => s.project);
  const selectedAgentId = useProjectStore((s) => s.selectedAgentId);
  const selectAgent = useProjectStore((s) => s.selectAgent);
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery);
  const toggleMonitoring = useProjectStore((s) => s.toggleMonitoring);
  const toggleShowArchived = useProjectStore((s) => s.toggleShowArchived);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key) {
        case 'Escape':
          // Close detail panel
          selectAgent(null);
          break;

        case '/':
          // Focus search input
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
          searchInput?.focus();
          break;

        case 'Tab': {
          // Cycle through agents
          e.preventDefault();
          if (!project?.agents.length) return;
          const activeAgents = project.agents.filter(a => a.status !== 'archived');
          if (activeAgents.length === 0) return;

          const currentIdx = activeAgents.findIndex(a => a.id === selectedAgentId);
          const nextIdx = e.shiftKey
            ? (currentIdx <= 0 ? activeAgents.length - 1 : currentIdx - 1)
            : (currentIdx + 1) % activeAgents.length;
          selectAgent(activeAgents[nextIdx].id);
          break;
        }

        case 'm':
        case 'M':
          // Toggle monitoring
          toggleMonitoring();
          break;

        case 'a':
        case 'A':
          // Toggle archived
          if (!e.ctrlKey && !e.metaKey) {
            toggleShowArchived();
          }
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [project, selectedAgentId, selectAgent, setSearchQuery, toggleMonitoring, toggleShowArchived]);
}
