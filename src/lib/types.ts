// ── Agent identity ──────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'paused' | 'archived';

export type AgentRole =
  | 'orchestrator'
  | 'executor'
  | 'reviewer'
  | 'publisher'
  | 'tracker'
  | 'custom';

export type ModelFamily = 'haiku' | 'sonnet' | 'opus' | 'gemini' | 'python' | 'unknown';

export interface Agent {
  id: string;
  name: string;
  role: string;
  roleType: AgentRole;
  model: string;
  modelFamily: ModelFamily;
  status: AgentStatus;
  isOrchestrator: boolean;
  skillFile: string | null;
  script: string | null;
  description: string | null;
  instructions: string | null;
  phase: number | null;
  schedule: string | null;
  tags: string[];
  sourceFile: string | null;
}

// ── Relationships ───────────────────────────────────────────────────────────

export type EdgeType = 'pipeline' | 'supervision' | 'data-flow';

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  animated?: boolean;
}

// ── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelinePhase {
  phase: number;
  name: string;
  time: string | null;
  agentId: string;
  gateCondition: string | null;
}

// ── Project ─────────────────────────────────────────────────────────────────

export interface ProjectMetadata {
  name: string;
  goal: string | null;
  description: string | null;
}

export interface ParsedFile {
  filename: string;
  path: string;
  type: 'agent-map' | 'architecture' | 'claude-md' | 'skill' | 'claude-agent' | 'crewai' | 'langgraph' | 'autogen' | 'openai-agents' | 'generic';
}

export interface ParseWarning {
  file: string;
  parser: string;
  message: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  agents: Agent[];
  edges: AgentEdge[];
  pipeline: PipelinePhase[];
  rawFiles: ParsedFile[];
  warnings: ParseWarning[];
}

// ── React Flow node data ────────────────────────────────────────────────────

export type DiffStatus = 'added' | 'removed' | 'changed' | null;

export interface AgentHealth {
  scriptExists: boolean;
  scriptLastModified: string | null;
  scriptSize: number | null;
  staleDays: number | null;
}

export interface AgentNodeData {
  agent: Agent;
  isSelected: boolean;
  isPaused: boolean;
  liveStatus?: LiveAgentStatus;
  diffStatus?: DiffStatus;
  diffDetails?: string;
  hasNote?: boolean;
  health?: AgentHealth;
  [key: string]: unknown;
}

// ── Live monitoring ─────────────────────────────────────────────────────────

export type RunState = 'idle' | 'running' | 'success' | 'failed' | 'waiting';

export interface LiveAgentStatus {
  state: RunState;
  startedAt: string | null;
  completedAt: string | null;
  lastLog: string | null;
  durationMs: number | null;
}

export interface PipelineStatus {
  date: string;
  currentPhase: string;
  isRunning: boolean;
  startedAt: string | null;
  agents: Record<string, LiveAgentStatus>;
  recentLogs: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
  agentId?: string;
}
