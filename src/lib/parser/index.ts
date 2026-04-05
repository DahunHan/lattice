import type { ProjectData, Agent, AgentEdge, ParsedFile } from '../types';
import { isAgentMap, parseAgentMap } from './agentMapParser';
import { isArchitectureDoc, parsePipeline, parseEdges } from './architectureParser';
import { isClaudeMd, parseClaudeMd } from './claudeParser';
import { isSkillFile, parseSkillFile, enrichAgentsWithSkills } from './skillParser';
import { detectAgentsHeuristic, detectEdgesHeuristic } from './heuristicParser';

export interface RawFile {
  name: string;
  content: string;
  path?: string;
}

/** Main parsing orchestrator — turns a collection of MD files into ProjectData */
export function parseProject(files: RawFile[]): ProjectData {
  let agents: Agent[] = [];
  let edges: AgentEdge[] = [];
  const parsedFiles: ParsedFile[] = [];
  const skills: ReturnType<typeof parseSkillFile>[] = [];
  let metadata = { name: '', goal: null as string | null, description: null as string | null };

  // Classify and parse each file
  const unmatched: RawFile[] = [];

  for (const file of files) {
    // Check architecture BEFORE agent-map since arch docs may contain tables
    if (isArchitectureDoc(file.content, file.name)) {
      parsedFiles.push({ filename: file.name, path: file.path ?? file.name, type: 'architecture' });
    } else if (isClaudeMd(file.content, file.name)) {
      const partial = parseClaudeMd(file.content, file.name);
      if (partial.name) metadata.name = partial.name;
      if (partial.goal) metadata.goal = partial.goal;
      if (partial.description) metadata.description = partial.description;
      parsedFiles.push({ filename: file.name, path: file.path ?? file.name, type: 'claude-md' });
    } else if (isSkillFile(file.content, file.name)) {
      skills.push(parseSkillFile(file.content, file.path ?? file.name));
      parsedFiles.push({ filename: file.name, path: file.path ?? file.name, type: 'skill' });
    } else if (isAgentMap(file.content)) {
      const parsed = parseAgentMap(file.content, file.name);
      agents = mergeAgents(agents, parsed);
      parsedFiles.push({ filename: file.name, path: file.path ?? file.name, type: 'agent-map' });
    } else {
      unmatched.push(file);
    }
  }

  // Parse architecture docs (need agents first for cross-referencing)
  const archFiles = files.filter((f, i) =>
    parsedFiles.some(pf => pf.filename === f.name && pf.type === 'architecture')
  );

  let pipeline = archFiles.length > 0
    ? parsePipeline(archFiles.map(f => f.content).join('\n\n'), agents)
    : [];

  const archEdges = archFiles.length > 0
    ? parseEdges(archFiles.map(f => f.content).join('\n\n'), agents, pipeline)
    : [];

  edges = mergeEdges(edges, archEdges);

  // Enrich agents with skill data
  if (skills.length > 0) {
    agents = enrichAgentsWithSkills(agents, skills);
  }

  // Heuristic parsing on unmatched files
  for (const file of unmatched) {
    const heuristicAgents = detectAgentsHeuristic(file.content, file.name);
    if (heuristicAgents.length > 0) {
      agents = mergeAgents(agents, heuristicAgents);
      parsedFiles.push({ filename: file.name, path: file.path ?? file.name, type: 'generic' });
    }
  }

  // Heuristic edges (using all agent IDs)
  const agentIdSet = new Set(agents.map(a => a.id));
  for (const file of unmatched) {
    const heuristicEdges = detectEdgesHeuristic(file.content, agentIdSet);
    edges = mergeEdges(edges, heuristicEdges);
  }

  // Assign pipeline phases to agents
  for (const phase of pipeline) {
    const agent = agents.find(a => a.id === phase.agentId);
    if (agent) {
      agent.phase = phase.phase;
    }
  }

  // If no project name from CLAUDE.md, derive from folder
  if (!metadata.name && files.length > 0) {
    const firstPath = files[0].path ?? files[0].name;
    const parts = firstPath.replace(/\\/g, '/').split('/');
    metadata.name = parts.find(p => p && !p.includes('.')) ?? 'Unknown Project';
  }

  return {
    metadata,
    agents,
    edges,
    pipeline,
    rawFiles: parsedFiles,
  };
}

/** Merge agents by ID, preferring the first occurrence but enriching with additional data */
function mergeAgents(existing: Agent[], incoming: Agent[]): Agent[] {
  const byId = new Map<string, Agent>();
  for (const a of existing) byId.set(a.id, a);

  for (const a of incoming) {
    if (!byId.has(a.id)) {
      byId.set(a.id, a);
    } else {
      // Enrich existing with non-null fields from incoming
      const ex = byId.get(a.id)!;
      byId.set(a.id, {
        ...ex,
        description: ex.description ?? a.description,
        instructions: ex.instructions ?? a.instructions,
        phase: ex.phase ?? a.phase,
        schedule: ex.schedule ?? a.schedule,
      });
    }
  }

  return Array.from(byId.values());
}

/** Merge edges by composite key (source+target+type) */
function mergeEdges(existing: AgentEdge[], incoming: AgentEdge[]): AgentEdge[] {
  const byKey = new Map<string, AgentEdge>();
  for (const e of existing) byKey.set(`${e.source}->${e.target}:${e.type}`, e);
  for (const e of incoming) {
    const key = `${e.source}->${e.target}:${e.type}`;
    if (!byKey.has(key)) byKey.set(key, e);
  }
  return Array.from(byKey.values());
}
