import type { Agent, AgentEdge, ProjectData } from '../types';

export interface Snapshot {
  id: string;
  timestamp: string;
  label: string;
  projectData: ProjectData;
}

export interface AgentDiff {
  agentId: string;
  name: string;
  changes: { field: string; from: string; to: string }[];
}

export interface DiffResult {
  added: Agent[];
  removed: Agent[];
  changed: AgentDiff[];
  edgesAdded: AgentEdge[];
  edgesRemoved: AgentEdge[];
}
