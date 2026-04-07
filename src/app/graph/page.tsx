"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { useProjectStore } from "@/store/useProjectStore";
import { buildFlowGraph } from "@/lib/graph/buildGraph";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { FlowCanvas } from "@/components/graph/FlowCanvas";
import { AgentDetailPanel } from "@/components/panels/AgentDetailPanel";
import { ProjectOverview } from "@/components/panels/ProjectOverview";
import { Legend } from "@/components/panels/Legend";
import { LiveTimeline } from "@/components/panels/LiveTimeline";
import { MonitoringToggle } from "@/components/panels/MonitoringToggle";
import { ExportMenu } from "@/components/graph/ExportMenu";
import { SnapshotPanel } from "@/components/panels/SnapshotPanel";

export default function GraphPage() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const projectPath = useProjectStore((s) => s.projectPath);
  const showArchived = useProjectStore((s) => s.showArchived);
  const pausedAgentIds = useProjectStore((s) => s.pausedAgentIds);
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const monitoringEnabled = useProjectStore((s) => s.monitoringEnabled);
  const setPipelineStatus = useProjectStore((s) => s.setPipelineStatus);
  const hasHydrated = useProjectStore((s) => s._hasHydrated);
  const diffResult = useProjectStore((s) => s.diffResult);

  // Redirect to landing if no project loaded (only after hydration)
  useEffect(() => {
    if (hasHydrated && !project) {
      router.replace("/");
    }
  }, [hasHydrated, project, router]);

  // Live monitoring hook
  const { status, isPolling, lastUpdated } = useAgentStatus({
    projectPath,
    enabled: monitoringEnabled,
  });

  // Sync status to store
  useEffect(() => {
    setPipelineStatus(status);
  }, [status, setPipelineStatus]);

  const { nodes, edges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] };
    const graph = buildFlowGraph(project, {
      showArchived,
      pausedIds: pausedAgentIds,
      searchQuery,
    });

    // Inject live status into node data
    if (status?.agents) {
      for (const node of graph.nodes) {
        const agentId = node.id;
        const liveStatus = status.agents[agentId];
        if (liveStatus) {
          node.data = { ...node.data, liveStatus };
        }
      }
    }

    // Inject diff status into node data
    if (diffResult) {
      const addedIds = new Set(diffResult.added.map(a => a.id));
      const changedIds = new Set(diffResult.changed.map(c => c.agentId));
      for (const node of graph.nodes) {
        if (addedIds.has(node.id)) {
          node.data = { ...node.data, diffStatus: 'added' as const };
        } else if (changedIds.has(node.id)) {
          const change = diffResult.changed.find(c => c.agentId === node.id);
          const details = change?.changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
          node.data = { ...node.data, diffStatus: 'changed' as const, diffDetails: details };
        }
      }
    }

    return graph;
  }, [project, showArchived, pausedAgentIds, searchQuery, status, diffResult]);

  const [warningDismissed, setWarningDismissed] = useState(false);
  const warningCount = project?.warnings?.length ?? 0;
  const graphElementRef = useRef<HTMLElement | null>(null);
  const handleContainerRef = useCallback((el: HTMLElement | null) => {
    graphElementRef.current = el;
  }, []);

  if (!hasHydrated || !project) {
    return (
      <div className="h-screen w-screen bg-[#0A0A1B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#7777A0]">Loading project...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0A0A1B] relative overflow-hidden">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-12 glass-strong border-b border-[#1E1E3A] flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-[#9999BB] hover:text-[#E0E0F0] transition-colors"
            aria-label="Back to home"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="w-px h-5 bg-[#1E1E3A]" />
          <span className="text-xs font-bold text-[#F5A623] tracking-wide">
            HailMary
          </span>
          <span className="text-xs text-[#7777A0]">/</span>
          <span className="text-xs text-[#9999BB]">
            {project.metadata.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Export menu */}
          <ExportMenu project={project} graphElement={graphElementRef.current} />
          {/* Live monitoring toggle */}
          {projectPath && (
            <MonitoringToggle />
          )}
          <span className="text-[10px] text-[#7777A0]">
            {project.agents.length} agents &middot; {project.edges.length} connections
          </span>
        </div>
      </div>

      {/* Parse warnings banner */}
      {warningCount > 0 && !warningDismissed && (
        <div className="absolute top-12 left-0 right-0 z-20 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <span className="text-xs text-amber-400">
            Parsed with {warningCount} warning{warningCount > 1 ? 's' : ''} — some files may not have been fully processed
          </span>
          <button
            onClick={() => setWarningDismissed(true)}
            className="text-amber-400/60 hover:text-amber-400 transition-colors text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main canvas area */}
      <div className="absolute inset-0 pt-12" style={{ paddingTop: warningCount > 0 && !warningDismissed ? '80px' : '48px', paddingBottom: monitoringEnabled && status ? '40px' : '0' }}>
        <ReactFlowProvider>
          <FlowCanvas initialNodes={nodes} initialEdges={edges} onContainerRef={handleContainerRef} />
        </ReactFlowProvider>

        {/* Overlay panels */}
        <ProjectOverview />
        <Legend />
        <AgentDetailPanel />
        <SnapshotPanel />
      </div>

      {/* Live timeline bar */}
      {monitoringEnabled && (
        <LiveTimeline status={status} isPolling={isPolling} lastUpdated={lastUpdated} />
      )}
    </div>
  );
}
