"use client";

import { useEffect, useMemo } from "react";
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

export default function GraphPage() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const projectPath = useProjectStore((s) => s.projectPath);
  const showArchived = useProjectStore((s) => s.showArchived);
  const pausedAgentIds = useProjectStore((s) => s.pausedAgentIds);
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const monitoringEnabled = useProjectStore((s) => s.monitoringEnabled);
  const setPipelineStatus = useProjectStore((s) => s.setPipelineStatus);

  // Redirect to landing if no project loaded
  useEffect(() => {
    if (!project) {
      router.replace("/");
    }
  }, [project, router]);

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

    return graph;
  }, [project, showArchived, pausedAgentIds, searchQuery, status]);

  if (!project) return null;

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
        <div className="flex items-center gap-4">
          {/* Live monitoring toggle */}
          {projectPath && (
            <MonitoringToggle />
          )}
          <span className="text-[10px] text-[#7777A0]">
            {project.agents.length} agents &middot; {project.edges.length} connections
          </span>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="absolute inset-0 pt-12" style={{ paddingBottom: monitoringEnabled && status ? '40px' : '0' }}>
        <ReactFlowProvider>
          <FlowCanvas initialNodes={nodes} initialEdges={edges} />
        </ReactFlowProvider>

        {/* Overlay panels */}
        <ProjectOverview />
        <Legend />
        <AgentDetailPanel />
      </div>

      {/* Live timeline bar */}
      {monitoringEnabled && (
        <LiveTimeline status={status} isPolling={isPolling} lastUpdated={lastUpdated} />
      )}
    </div>
  );
}
