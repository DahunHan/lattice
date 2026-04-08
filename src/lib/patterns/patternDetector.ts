import type { Agent, AgentEdge } from '../types';

export type WorkflowPattern =
  | 'sequential'     // A → B → C (linear chain)
  | 'split-merge'    // Hub → [A, B, C] → Hub (fan-out/fan-in)
  | 'operator'       // [A] [B] [C] (parallel isolated, no edges between groups)
  | 'agent-teams'    // Mesh — multiple agents connected to each other
  | 'headless'       // Single autonomous agent with schedule/cron
  | 'hybrid'         // Mix of patterns
  | 'unknown';

export interface PatternInfo {
  pattern: WorkflowPattern;
  confidence: number;    // 0-1
  description: string;
  details: string;
}

export interface PatternGroup {
  name: string;
  pattern: WorkflowPattern;
  agentIds: string[];
}

/** Detect the dominant workflow pattern from agents and edges */
export function detectPattern(agents: Agent[], edges: AgentEdge[]): PatternInfo {
  const activeAgents = agents.filter(a => a.status !== 'archived');
  if (activeAgents.length === 0) return { pattern: 'unknown', confidence: 0, description: 'No agents', details: '' };
  if (activeAgents.length === 1) {
    const agent = activeAgents[0];
    if (agent.schedule) {
      return { pattern: 'headless', confidence: 0.9, description: 'Autonomous agent', details: 'Single agent running on schedule — no human in the loop' };
    }
    return { pattern: 'sequential', confidence: 0.5, description: 'Single agent', details: 'Only one active agent detected' };
  }

  const pipelineEdges = edges.filter(e => e.type === 'pipeline');
  const supervisionEdges = edges.filter(e => e.type === 'supervision');
  const agentIds = new Set(activeAgents.map(a => a.id));

  // Check for isolated groups (Operator pattern)
  const groups = findConnectedGroups(activeAgents, edges);
  if (groups.length >= 2 && groups.every(g => g.length <= 3)) {
    return {
      pattern: 'operator',
      confidence: 0.8,
      description: `${groups.length} parallel workflows`,
      details: `${groups.length} isolated agent groups running independently — like multiple terminal windows`,
    };
  }

  // Check for split-merge (fan-out/fan-in)
  const hubNodes = findHubNodes(activeAgents, pipelineEdges);
  if (hubNodes.length > 0) {
    const hub = hubNodes[0];
    const fanOut = pipelineEdges.filter(e => e.source === hub.id).length;
    const fanIn = pipelineEdges.filter(e => e.target === hub.id).length;
    if (fanOut >= 2 || fanIn >= 2) {
      return {
        pattern: 'split-merge',
        confidence: 0.85,
        description: `Hub: ${hub.name.replace(/_/g, ' ')}`,
        details: `${hub.name.replace(/_/g, ' ')} fans out to ${fanOut} agents and receives from ${fanIn} — split and merge pattern`,
      };
    }
  }

  // Check for agent teams (high interconnection)
  const edgeDensity = pipelineEdges.length / Math.max(activeAgents.length, 1);
  const hasOrchestratorSupervision = supervisionEdges.length > 0;
  if (edgeDensity > 1.5 && activeAgents.length >= 3) {
    return {
      pattern: 'agent-teams',
      confidence: 0.75,
      description: 'Collaborative team',
      details: `${activeAgents.length} agents with ${pipelineEdges.length} connections — high interconnection suggests team collaboration`,
    };
  }

  // Check for sequential (linear chain)
  if (isLinearChain(activeAgents, pipelineEdges)) {
    return {
      pattern: 'sequential',
      confidence: 0.9,
      description: 'Linear pipeline',
      details: `${activeAgents.length} agents in a sequential chain — each feeds into the next`,
    };
  }

  // Check for headless (all agents have schedules)
  const scheduledCount = activeAgents.filter(a => a.schedule).length;
  if (scheduledCount > activeAgents.length * 0.5) {
    return {
      pattern: 'headless',
      confidence: 0.7,
      description: 'Autonomous pipeline',
      details: `${scheduledCount} of ${activeAgents.length} agents have schedules — running autonomously`,
    };
  }

  // Default: hybrid or sequential with branching
  if (pipelineEdges.length > 0) {
    if (hasOrchestratorSupervision) {
      return {
        pattern: 'hybrid',
        confidence: 0.6,
        description: 'Orchestrated pipeline',
        details: `Orchestrator supervises ${activeAgents.length} agents with ${pipelineEdges.length} pipeline connections`,
      };
    }
    return {
      pattern: 'sequential',
      confidence: 0.6,
      description: 'Pipeline flow',
      details: `${activeAgents.length} agents with ${pipelineEdges.length} connections`,
    };
  }

  return { pattern: 'unknown', confidence: 0.3, description: 'Agents detected', details: `${activeAgents.length} agents found but no clear workflow pattern` };
}

/** Detect patterns per group (e.g., Dev team is sequential, Growth team is split-merge) */
export function detectGroupPatterns(agents: Agent[], edges: AgentEdge[]): PatternGroup[] {
  const groups = new Map<string, Agent[]>();

  for (const agent of agents) {
    const groupName = agent.group ?? '_ungrouped';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(agent);
  }

  const result: PatternGroup[] = [];
  for (const [name, groupAgents] of groups) {
    if (name === '_ungrouped' && groupAgents.length <= 1) continue;
    const groupIds = new Set(groupAgents.map(a => a.id));
    const groupEdges = edges.filter(e => groupIds.has(e.source) && groupIds.has(e.target));
    const pattern = detectPattern(groupAgents, groupEdges);
    result.push({
      name: name === '_ungrouped' ? 'Ungrouped' : name,
      pattern: pattern.pattern,
      agentIds: groupAgents.map(a => a.id),
    });
  }

  return result;
}

function findConnectedGroups(agents: Agent[], edges: AgentEdge[]): string[][] {
  const adjacency = new Map<string, Set<string>>();
  for (const agent of agents) adjacency.set(agent.id, new Set());

  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const agent of agents) {
    if (visited.has(agent.id)) continue;
    const group: string[] = [];
    const queue = [agent.id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      group.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    groups.push(group);
  }

  return groups;
}

function findHubNodes(agents: Agent[], edges: AgentEdge[]): Agent[] {
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const edge of edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  return agents
    .filter(a => (outDegree.get(a.id) ?? 0) >= 2 || (inDegree.get(a.id) ?? 0) >= 2)
    .sort((a, b) => {
      const scoreA = (outDegree.get(a.id) ?? 0) + (inDegree.get(a.id) ?? 0);
      const scoreB = (outDegree.get(b.id) ?? 0) + (inDegree.get(b.id) ?? 0);
      return scoreB - scoreA;
    });
}

function isLinearChain(agents: Agent[], edges: AgentEdge[]): boolean {
  if (edges.length < agents.length - 1) return false;

  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const edge of edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // In a linear chain, every node has at most 1 in-edge and 1 out-edge
  for (const agent of agents) {
    if ((outDegree.get(agent.id) ?? 0) > 1) return false;
    if ((inDegree.get(agent.id) ?? 0) > 1) return false;
  }

  return true;
}

/** Pattern display metadata */
export const PATTERN_META: Record<WorkflowPattern, { label: string; icon: string; color: string }> = {
  'sequential':  { label: 'Sequential',   icon: '→',  color: '#4A9EE0' },
  'split-merge': { label: 'Split & Merge', icon: '⟨⟩', color: '#9B59B6' },
  'operator':    { label: 'Operator',      icon: '∥',  color: '#2ECC71' },
  'agent-teams': { label: 'Agent Teams',   icon: '⬡',  color: '#F5A623' },
  'headless':    { label: 'Headless',      icon: '⚡',  color: '#E74C3C' },
  'hybrid':      { label: 'Hybrid',        icon: '◈',  color: '#F39C12' },
  'unknown':     { label: 'Unknown',       icon: '?',  color: '#7F8C8D' },
};
