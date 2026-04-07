import type { Agent, AgentEdge } from '../types';
import { slugify, classifyModelGeneric, classifyRoleGeneric } from './parserUtils';

/** Detect CrewAI YAML config files (agents.yaml or tasks.yaml) */
export function isCrewAIYaml(content: string, filename: string): boolean {
  const fn = filename.toLowerCase();
  // agents.yaml or tasks.yaml in a config/ directory
  const isConfigYaml = /(?:^|\/)config\/(?:agents|tasks)\.ya?ml$/i.test(fn) ||
    fn === 'agents.yaml' || fn === 'agents.yml' ||
    fn === 'tasks.yaml' || fn === 'tasks.yml';
  if (isConfigYaml) {
    // Verify content looks like CrewAI — has role/goal/backstory or agent/description
    return /(?:role:|goal:|backstory:|agent:|expected_output:)/i.test(content);
  }
  return false;
}

/** Detect CrewAI Python files (crew.py with @CrewBase or crewai imports) */
export function isCrewAIPython(content: string, filename: string): boolean {
  if (!filename.endsWith('.py')) return false;
  return /from\s+crewai/.test(content) || /@CrewBase/.test(content);
}

/** Parse a CrewAI agents.yaml file */
export function parseCrewAIAgentsYaml(content: string): Agent[] {
  const agents: Agent[] = [];

  // Simple YAML parser for CrewAI agent blocks:
  // agent_key:
  //   role: "..."
  //   goal: "..."
  //   backstory: "..."
  //   llm: "..."
  const blocks = content.split(/^([a-z_][a-z0-9_]*)\s*:/im);
  // blocks[0] is before first match, then alternating key/body pairs

  for (let i = 1; i < blocks.length; i += 2) {
    const key = blocks[i].trim();
    const body = blocks[i + 1] ?? '';

    // Skip if no role/goal (not an agent block)
    if (!/role\s*:/i.test(body) && !/goal\s*:/i.test(body)) continue;

    const role = extractYamlValue(body, 'role') ?? '';
    const goal = extractYamlValue(body, 'goal') ?? '';
    const backstory = extractYamlValue(body, 'backstory') ?? '';
    const model = extractYamlValue(body, 'llm') ?? '';

    const name = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const roleType = classifyRoleGeneric(role || goal);
    const isOrch = roleType === 'orchestrator';

    agents.push({
      id: slugify(key),
      name,
      role: role || goal,
      roleType,
      model: model || 'unknown',
      modelFamily: model ? classifyModelGeneric(model) : 'unknown',
      status: 'active',
      isOrchestrator: isOrch,
      skillFile: null,
      script: null,
      description: goal,
      instructions: backstory || null,
      phase: null,
      schedule: null,
      tags: ['crewai'],
      sourceFile: null,
        group: null,
    });
  }

  return agents;
}

/** Parse a CrewAI tasks.yaml file and extract edges */
export function parseCrewAITasksYaml(content: string, agents: Agent[]): AgentEdge[] {
  const edges: AgentEdge[] = [];
  const agentIds = new Set(agents.map(a => a.id));

  const blocks = content.split(/^([a-z_][a-z0-9_]*)\s*:/im);
  const taskAgentMap: { task: string; agentId: string }[] = [];

  for (let i = 1; i < blocks.length; i += 2) {
    const taskKey = blocks[i].trim();
    const body = blocks[i + 1] ?? '';

    const agentRef = extractYamlValue(body, 'agent');
    if (!agentRef) continue;

    const agentId = slugify(agentRef);
    if (agentIds.has(agentId)) {
      taskAgentMap.push({ task: taskKey, agentId });
    }

    // Parse context dependencies
    const contextMatch = body.match(/context\s*:\s*\[([^\]]*)\]/);
    if (contextMatch) {
      const deps = contextMatch[1].split(',').map(s => s.trim());
      for (const dep of deps) {
        const depEntry = taskAgentMap.find(t => t.task === dep);
        if (depEntry && depEntry.agentId !== agentId) {
          edges.push({
            id: `${depEntry.agentId}->${agentId}:pipeline`,
            source: depEntry.agentId,
            target: agentId,
            type: 'pipeline',
          });
        }
      }
    }
  }

  // If no context edges found, create sequential pipeline from task order
  if (edges.length === 0 && taskAgentMap.length > 1) {
    for (let i = 0; i < taskAgentMap.length - 1; i++) {
      const src = taskAgentMap[i].agentId;
      const tgt = taskAgentMap[i + 1].agentId;
      if (src !== tgt) {
        edges.push({
          id: `${src}->${tgt}:pipeline`,
          source: src,
          target: tgt,
          type: 'pipeline',
        });
      }
    }
  }

  return edges;
}

/** Parse a CrewAI Python file for process type and agent definitions */
export function parseCrewAIPython(content: string, agents: Agent[]): AgentEdge[] {
  const edges: AgentEdge[] = [];
  const agentIds = new Set(agents.map(a => a.id));

  // Detect Process.hierarchical → add supervision edges from manager
  if (/Process\.hierarchical/i.test(content)) {
    // Find manager_llm or manager_agent references
    const managerMatch = content.match(/manager_agent\s*=\s*(\w+)/);
    const managerId = managerMatch ? slugify(managerMatch[1]) : null;

    if (managerId && agentIds.has(managerId)) {
      for (const a of agents) {
        if (a.id !== managerId) {
          edges.push({
            id: `${managerId}->${a.id}:supervision`,
            source: managerId,
            target: a.id,
            type: 'supervision',
          });
        }
      }
    }
  }

  return edges;
}

function extractYamlValue(body: string, key: string): string | null {
  // Match: key: "value" or key: 'value' or key: value
  const regex = new RegExp(`^\\s*${key}\\s*:\\s*(?:"([^"]*?)"|'([^']*?)'|(.+?)$)`, 'im');
  const m = body.match(regex);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? '').trim();

  // Handle YAML multiline indicators: > (folded) or | (literal)
  if (raw === '>' || raw === '|') {
    // Read subsequent indented lines as the value
    const lines = body.split('\n');
    const keyIdx = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*:`, 'i').test(l));
    if (keyIdx === -1) return null;
    const valueParts: string[] = [];
    for (let i = keyIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s+\S/.test(line)) {
        valueParts.push(line.trim());
      } else if (line.trim() === '') {
        valueParts.push('');
      } else {
        break;
      }
    }
    return valueParts.join(' ').trim() || null;
  }

  return raw || null;
}
