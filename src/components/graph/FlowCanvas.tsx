"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./nodes/AgentNode";
import { OrchestratorNode } from "./nodes/OrchestratorNode";
import { PipelineEdge } from "./edges/PipelineEdge";
import { SupervisionEdge } from "./edges/SupervisionEdge";
import { DataFlowEdge } from "./edges/DataFlowEdge";
import { useProjectStore } from "@/store/useProjectStore";
import type { AgentNodeData } from "@/lib/types";

const nodeTypes = {
  agent: AgentNode,
  orchestrator: OrchestratorNode,
  archived: AgentNode,
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

interface FlowCanvasProps {
  initialNodes: Node<AgentNodeData>[];
  initialEdges: Edge[];
}

export function FlowCanvas({ initialNodes, initialEdges }: FlowCanvasProps) {
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
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
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
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#1E1E3A"
      />
      <Controls
        position="bottom-right"
        showInteractive={false}
      />
      <MiniMap
        position="bottom-left"
        nodeColor={minimapNodeColor}
        maskColor="rgba(10, 10, 27, 0.8)"
        style={{ background: "#12122A" }}
      />
    </ReactFlow>
  );
}
