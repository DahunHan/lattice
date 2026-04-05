import dagre from '@dagrejs/dagre';
import type { Agent, AgentEdge } from '../types';

interface LayoutNode {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const ORCH_WIDTH = 240;
const ORCH_HEIGHT = 100;

export function computeLayout(
  agents: Agent[],
  edges: AgentEdge[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: 'TB',
    ranksep: 120,
    nodesep: 80,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes
  for (const agent of agents) {
    const isOrch = agent.isOrchestrator;
    g.setNode(agent.id, {
      width: isOrch ? ORCH_WIDTH : NODE_WIDTH,
      height: isOrch ? ORCH_HEIGHT : NODE_HEIGHT,
    });
  }

  // Add edges
  for (const edge of edges) {
    // Only add edges where both nodes exist
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const agent of agents) {
    const node = g.node(agent.id);
    if (node) {
      positions.set(agent.id, { x: node.x, y: node.y });
    } else {
      positions.set(agent.id, { x: 0, y: 0 });
    }
  }

  return positions;
}
