import type { Node, Edge } from '@xyflow/react';
import type { ProjectData, AgentNodeData } from '../types';
import { computeLayout } from './layoutEngine';

export function buildFlowGraph(
  project: ProjectData,
  filters: { showArchived: boolean; pausedIds: Set<string>; searchQuery: string }
): { nodes: Node<AgentNodeData>[]; edges: Edge[] } {
  // Filter agents
  const visibleAgents = project.agents.filter((a) => {
    if (a.status === 'archived' && !filters.showArchived) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const visibleIds = new Set(visibleAgents.map((a) => a.id));

  // Filter edges
  const visibleEdges = project.edges.filter(
    (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
  );

  // Compute layout
  const positions = computeLayout(visibleAgents, visibleEdges);

  // Build React Flow nodes
  const nodes: Node<AgentNodeData>[] = visibleAgents.map((agent) => {
    const pos = positions.get(agent.id) ?? { x: 0, y: 0 };
    let nodeType = 'agent';
    if (agent.isOrchestrator) nodeType = 'orchestrator';
    else if (agent.status === 'archived') nodeType = 'archived';

    return {
      id: agent.id,
      type: nodeType,
      position: { x: pos.x, y: pos.y },
      data: {
        agent,
        isSelected: false,
        isPaused: filters.pausedIds.has(agent.id),
      },
    };
  });

  // Build React Flow edges
  const edges: Edge[] = visibleEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type === 'supervision' ? 'supervision' : e.type === 'data-flow' ? 'dataflow' : 'pipeline',
    animated: e.type === 'pipeline',
    label: e.label,
    data: { edgeType: e.type },
  }));

  return { nodes, edges };
}
