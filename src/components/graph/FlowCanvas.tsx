"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./nodes/AgentNode";
import { OrchestratorNode } from "./nodes/OrchestratorNode";
import { GroupNode } from "./nodes/GroupNode";
import { PipelineEdge } from "./edges/PipelineEdge";
import { SupervisionEdge } from "./edges/SupervisionEdge";
import { DataFlowEdge } from "./edges/DataFlowEdge";
import { useProjectStore } from "@/store/useProjectStore";
import type { AgentNodeData } from "@/lib/types";

const nodeTypes = {
  agent: AgentNode,
  orchestrator: OrchestratorNode,
  archived: AgentNode,
  group: GroupNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
  supervision: SupervisionEdge,
  dataflow: DataFlowEdge,
};

function minimapNodeColor(n: Node): string {
  const agent = (n.data as AgentNodeData)?.agent;
  if (!agent) return "#1E1E3A";
  if (agent.isOrchestrator) return "#F5A623";
  switch (agent.modelFamily) {
    case "haiku": return "#4A9EE0";
    case "sonnet": return "#2ECC71";
    case "opus": return "#9B59B6";
    default: return "#7F8C8D";
  }
}

// Custom floating button for fitting the view
function FitViewButton() {
  const { fitView } = useReactFlow();

  return (
    <Panel position="top-left" className="m-4">
      <button
        onClick={() => fitView({ padding: 0.3, duration: 500 })}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#1E1E3A] border border-[#2A2A4A] rounded-md shadow-lg hover:bg-[#2A2A4A] transition-colors"
        title="Fit View"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 9 5 5 9 5" />
          <polyline points="9 19 5 19 5 15" />
          <polyline points="19 9 19 5 15 5" />
          <polyline points="15 19 19 19 19 15" />
        </svg>
        Fit View
      </button>
    </Panel>
  );
}

interface FlowCanvasProps {
  initialNodes: Node<AgentNodeData>[];
  initialEdges: Edge[];
  onContainerRef?: (el: HTMLElement | null) => void;
  onManualConnect?: (connection: Connection) => void;
}

export function FlowCanvas({ initialNodes, initialEdges, onContainerRef, onManualConnect }: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onContainerRef) {
      // Find the react-flow viewport element inside our container
      const viewport = containerRef.current?.querySelector('.react-flow__viewport')?.parentElement as HTMLElement | nu ll;
      onContainerRef(viewport ?? containerRef.current);
    }
  }, [onContainerRef]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const selectAgent = useProjectStore((s) => s.selectAgent);
  const selectedAgentId = useProjectStore((s) => s.selectedAgentId);

  // R2 fix: Sync nodes/edges when props change (filter toggles, search)
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectAgent(node.id === selectedAgentId ? null : node.id);
    },
    [selectAgent, selectedAgentId]
  );

  const onPaneClick = useCallback(() => {
    selectAgent(null);
  }, [selectAgent]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (onManualConnect && connection.source && connection.target) {
        onManualConnect(connection);
      }
    },
    [onManualConnect]
  );

  // Update node selection state
  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === selectedAgentId,
        },
      })),
    [nodes, selectedAgentId]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
        className="!bg-[#0A0A1B]"
      >
        <FitViewButton />
        
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1E1E3A"
        />
        <Controls
          position="top-right"
          showInteractive={false}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={minimapNodeColor}
          maskColor="rgba(10, 10, 27, 0.8)"
          style={{ background: "#12122A" }}
        />
      </ReactFlow>
    </div>
  );
}
