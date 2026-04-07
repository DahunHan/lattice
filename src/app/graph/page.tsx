"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type Connection } from "@xyflow/react";
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
import { LogSettings } from "@/components/panels/LogSettings";
import { CostPanel } from "@/components/panels/CostPanel";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { parseProject } from "@/lib/parser";

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
  const manualEdges = useProjectStore((s) => s.manualEdges);
  const addManualEdge = useProjectStore((s) => s.addManualEdge);
  const agentNotes = useProjectStore((s) => s.agentNotes);
  const resolvedAgentIds = useProjectStore((s) => s.resolvedAgentIds);
  const clearResolved = useProjectStore((s) => s.clearResolved);
  const setProject = useProjectStore((s) => s.setProject);

  // Auto-rescan when files change
  const handleFilesChanged = useCallback(async () => {
    if (!projectPath) return;
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });
      const json = await res.json();
      if (json.data) {
        setProject(json.data, projectPath);
        console.log('[Lattice] Auto-rescan complete');
      }
    } catch { /* ignore */ }
  }, [projectPath, setProject]);

  const { watching } = useFileWatcher({
    projectPath,
    enabled: !!projectPath,
    intervalMs: 5000,
    onChanged: handleFilesChanged,
  });

  // Redirect to landing if no project loaded (only after hydration completes)
  useEffect(() => {
    if (hasHydrated && !project) {
      router.replace("/");
    }
  }, [hasHydrated, project, router]);

  // If project exists (from setProject), we don't need to wait for hydration
  const ready = !!project;

  const logDir = useProjectStore((s) => s.logDir);
  const logPattern = useProjectStore((s) => s.logPattern);

  // Live monitoring hook
  const { status, isPolling, lastUpdated } = useAgentStatus({
    projectPath,
    enabled: monitoringEnabled,
    logDir,
    logPattern,
  });

  // Sync status to store, clear resolved IDs on new pipeline run
  const prevDateRef = useRef<string | null>(null);
  useEffect(() => {
    setPipelineStatus(status);
    if (status?.date && prevDateRef.current && status.date !== prevDateRef.current) {
      clearResolved();
    }
    if (status?.date) prevDateRef.current = status.date;
  }, [status, setPipelineStatus, clearResolved]);

  // Fetch agent health + git data
  const [healthData, setHealthData] = useState<Record<string, import('@/lib/types').AgentHealth>>({});
  const setGitInfo = useProjectStore((s) => s.setGitInfo);
  useEffect(() => {
    if (!project || !projectPath) return;
    const scripts = project.agents
      .filter(a => a.script && a.script !== 'N/A')
      .map(a => ({ agentId: a.id, scriptPath: a.script! }));
    if (scripts.length === 0) return;

    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, scripts }),
    })
      .then(res => res.json())
      .then(json => { if (json.data) setHealthData(json.data); })
      .catch(() => { /* ignore */ });

    // Fetch git info for all agent-related files
    const allFiles = project.rawFiles
      .filter(f => f.type !== 'generic')
      .map(f => ({ agentId: f.path.replace(/[^a-z0-9]+/gi, '_').toLowerCase(), filePath: f.path }));
    // Also map scripts to agent IDs
    const scriptFiles = project.agents
      .filter(a => a.script && a.script !== 'N/A')
      .map(a => ({ agentId: a.id, filePath: a.script! }));
    const gitFiles = [...scriptFiles, ...allFiles];

    if (gitFiles.length > 0) {
      fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath, files: gitFiles }),
      })
        .then(res => res.json())
        .then(json => { if (json.data) setGitInfo(json.data); })
        .catch(() => { /* ignore — not a git repo */ });
    }
  }, [project, projectPath]);

  // Handle manual edge connections
  const handleManualConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    addManualEdge({
      id: `manual_${connection.source}->${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: 'pipeline',
      label: 'manual',
    });
  }, [addManualEdge]);

  const { nodes, edges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] };

    // Merge parsed edges with manual edges
    const allEdges = [...project.edges, ...manualEdges];
    const projectWithManual = { ...project, edges: allEdges };

    const graph = buildFlowGraph(projectWithManual, {
      showArchived,
      pausedIds: pausedAgentIds,
      searchQuery,
    });

    // Inject live status into node data (with manual resolve override)
    if (status?.agents) {
      for (const node of graph.nodes) {
        const agentId = node.id;
        const liveStatus = status.agents[agentId];
        if (liveStatus) {
          // If user manually marked this agent as resolved, override to success
          if (resolvedAgentIds.has(agentId) && (liveStatus.state === 'failed' || liveStatus.state === 'running')) {
            node.data = { ...node.data, liveStatus: { ...liveStatus, state: 'success', lastLog: 'Manually resolved' } };
          } else {
            node.data = { ...node.data, liveStatus };
          }
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

    // Inject note indicators and health data
    for (const node of graph.nodes) {
      const extras: Record<string, unknown> = {};
      if (agentNotes[node.id]) extras.hasNote = true;
      if (healthData[node.id]) extras.health = healthData[node.id];
      if (Object.keys(extras).length > 0) {
        node.data = { ...node.data, ...extras };
      }
    }

    return graph;
  }, [project, manualEdges, showArchived, pausedAgentIds, searchQuery, status, diffResult, agentNotes, healthData, resolvedAgentIds]);

  const [warningDismissed, setWarningDismissed] = useState(false);
  const warningCount = project?.warnings?.length ?? 0;
  const graphElementRef = useRef<HTMLElement | null>(null);
  const handleContainerRef = useCallback((el: HTMLElement | null) => {
    graphElementRef.current = el;
  }, []);

  if (!ready) {
    return <LoadingScreen />;
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
            Lattice
          </span>
          <span className="text-xs text-[#7777A0]">/</span>
          <span className="text-xs text-[#9999BB]">
            {project.metadata.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Export menu */}
          <ExportMenu project={project} graphElement={graphElementRef.current} />
          {/* Live monitoring toggle + settings */}
          {projectPath && (
            <div className="flex items-center gap-1">
              <MonitoringToggle />
              <LogSettings />
            </div>
          )}
          <span className="text-[10px] text-[#7777A0]">
            {project.agents.length} agents &middot; {project.edges.length} connections
            {watching && <span className="ml-1.5 text-[#2ECC71]" title="Auto-sync active">&middot; sync</span>}
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
          <FlowCanvas initialNodes={nodes} initialEdges={edges} onContainerRef={handleContainerRef} onManualConnect={handleManualConnect} />
        </ReactFlowProvider>

        {/* Overlay panels */}
        <ProjectOverview />
        <Legend />
        <AgentDetailPanel />
        <SnapshotPanel />
        <CostPanel />
      </div>

      {/* Live timeline bar */}
      {monitoringEnabled && (
        <LiveTimeline status={status} isPolling={isPolling} lastUpdated={lastUpdated} />
      )}
    </div>
  );
}

const LOADING_STEPS = [
  { text: 'Reading project files', sub: 'Scanning .md, .py, .yaml' },
  { text: 'Detecting agents', sub: 'Running 11 parsers' },
  { text: 'Mapping relationships', sub: 'Edges, pipelines, supervision' },
  { text: 'Computing layout', sub: 'Dagre hierarchical positioning' },
  { text: 'Rendering graph', sub: 'Almost there...' },
];

function LoadingScreen(): ReactElement {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
      setElapsed((e) => e + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const current = LOADING_STEPS[step];
  const atEnd = step === LOADING_STEPS.length - 1;

  return (
    <div className="h-screen w-screen bg-[#0A0A1B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Spinner with pulsing glow */}
        <div className="relative">
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-[#F5A623]/20 blur-xl animate-pulse" />
          <div className="relative w-12 h-12 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Status text */}
        <div className="text-center min-w-[220px]">
          <p className="text-sm text-[#E0E0F0] font-medium">
            {atEnd && elapsed > 8 ? 'Still working on it...' : current.text}
          </p>
          <p className="text-[11px] text-[#7777A0] mt-1">
            {atEnd && elapsed > 8 ? 'Large projects take a moment' : current.sub}
          </p>
        </div>

        {/* Progress bar instead of dots */}
        <div className="w-48 h-1 bg-[#1E1E3A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5A623] rounded-full transition-all duration-700 ease-out"
            style={{ width: atEnd ? '90%' : `${((step + 1) / LOADING_STEPS.length) * 80}%` }}
          />
        </div>
      </div>
    </div>
  );
}
