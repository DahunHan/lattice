import type { ProjectData, Agent, AgentEdge } from '../types';
import type { DiffResult, AgentDiff } from './snapshotTypes';

const COMPARE_FIELDS: (keyof Agent)[] = [
  'role', 'model', 'modelFamily', 'status', 'isOrchestrator',
  'description', 'phase', 'script', 'skillFile',
];

/** Compare current project data against a snapshot */
export function diffSnapshots(current: ProjectData, snapshot: ProjectData): DiffResult {
  const currentMap = new Map(current.agents.map(a => [a.id, a]));
  const snapshotMap = new Map(snapshot.agents.map(a => [a.id, a]));

  // Added agents: in current but not in snapshot
  const added: Agent[] = current.agents.filter(a => !snapshotMap.has(a.id));

  // Removed agents: in snapshot but not in current
  const removed: Agent[] = snapshot.agents.filter(a => !currentMap.has(a.id));

  // Changed agents: in both, but with differences
  const changed: AgentDiff[] = [];
  for (const [id, currentAgent] of currentMap) {
    const snapshotAgent = snapshotMap.get(id);
    if (!snapshotAgent) continue;

    const changes: { field: string; from: string; to: string }[] = [];
    for (const field of COMPARE_FIELDS) {
      const from = String(snapshotAgent[field] ?? '');
      const to = String(currentAgent[field] ?? '');
      if (from !== to) {
        changes.push({ field, from, to });
      }
    }

    if (changes.length > 0) {
      changed.push({ agentId: id, name: currentAgent.name, changes });
    }
  }

  // Edge diffs
  const currentEdgeKeys = new Set(current.edges.map(edgeKey));
  const snapshotEdgeKeys = new Set(snapshot.edges.map(edgeKey));

  const edgesAdded: AgentEdge[] = current.edges.filter(e => !snapshotEdgeKeys.has(edgeKey(e)));
  const edgesRemoved: AgentEdge[] = snapshot.edges.filter(e => !currentEdgeKeys.has(edgeKey(e)));

  return { added, removed, changed, edgesAdded, edgesRemoved };
}

function edgeKey(e: AgentEdge): string {
  return `${e.source}->${e.target}:${e.type}`;
}

/** Check if a diff result has any changes */
export function hasDiffChanges(diff: DiffResult): boolean {
  return diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.changed.length > 0 ||
    diff.edgesAdded.length > 0 ||
    diff.edgesRemoved.length > 0;
}
