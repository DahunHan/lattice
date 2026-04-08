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

  // Detect groups and compute group bounding boxes
  const groups = new Map<string, { agents: typeof visibleAgents; minX: number; minY: number; maxX: number; maxY: number }>();
  for (const agent of visibleAgents) {
    if (!agent.group) continue;
    const pos = positions.get(agent.id) ?? { x: 0, y: 0 };
    const existing = groups.get(agent.group);
    if (existing) {
      existing.agents.push(agent);
      existing.minX = Math.min(existing.minX, pos.x);
      existing.minY = Math.min(existing.minY, pos.y);
      existing.maxX = Math.max(existing.maxX, pos.x);
      existing.maxY = Math.max(existing.maxY, pos.y);
    } else {
      groups.set(agent.group, { agents: [agent], minX: pos.x, minY: pos.y, maxX: pos.x, maxY: pos.y });
    }
  }

  // Build group background nodes (rendered behind agent nodes)
  const groupNodes: Node[] = [];
  for (const [groupName, group] of groups) {
    if (group.agents.length < 2) continue; // Only show group for 2+ agents
    const padding = 60;
    const nodeWidth = 220;
    const nodeHeight = 100;
    groupNodes.push({
      id: `group_${groupName}`,
      type: 'group',
      draggable: false,
      selectable: false,
      position: { x: group.minX - padding, y: group.minY - padding },
      style: {
        width: group.maxX - group.minX + nodeWidth + padding * 2,
        height: group.maxY - group.minY + nodeHeight + padding * 2,
        background: 'rgba(245, 166, 35, 0.03)',
        border: '1px solid rgba(245, 166, 35, 0.08)',
        borderRadius: '16px',
      },
      data: { label: `${groupName} (${group.agents.length})` },
    });
  }

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

  // Group nodes go first (rendered behind)
  const allNodes = [...groupNodes, ...nodes] as Node<AgentNodeData>[];

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

  return { nodes: allNodes, edges };
}
