import type { Agent, AgentEdge } from '../types';
import { slugify, escapeRegex, formatName } from './parserUtils';

/** Detect LangGraph Python files */
export function isLangGraph(content: string, filename: string): boolean {
  if (!filename.endsWith('.py') && !filename.endsWith('.json')) return false;

  // langgraph.json config file
  if (filename.endsWith('.json') && /langgraph/i.test(filename)) {
    return /"graphs"\s*:/.test(content);
  }

  // Python file with StateGraph usage
  return /StateGraph\s*\(/.test(content) && /add_node\s*\(/.test(content);
}

/** Parse LangGraph Python file — extract nodes and edges */
export function parseLangGraph(content: string, filename: string): { agents: Agent[]; edges: AgentEdge[] } {
  const agents: Agent[] = [];
  const edges: AgentEdge[] = [];

  if (filename.endsWith('.json')) {
    return { agents, edges };
  }

  // Extract add_node("name", func) calls
  const nodeRegex = /\.add_node\s*\(\s*(?:"([^"]+)"|'([^']+)')/g;
  let match;
  const nodeNames = new Set<string>();

  while ((match = nodeRegex.exec(content)) !== null) {
    const name = match[1] ?? match[2];
    if (name && !nodeNames.has(name)) {
      nodeNames.add(name);
      const id = slugify(name);

      const funcName = extractNodeFunction(content, name);
      const description = funcName ? `Function: ${funcName}` : null;

      agents.push({
        id,
        name: formatName(name),
        role: 'Graph node',
        roleType: 'custom',
        model: detectModelFromContent(content, name),
        modelFamily: 'unknown',
        status: 'active',
        isOrchestrator: false,
        skillFile: null,
        script: filename,
        description,
        instructions: null,
        phase: null,
        schedule: null,
        tags: ['langgraph'],
        sourceFile: filename,
        group: null,
      });
    }
  }

  // Extract add_edge(source, target) calls
  const edgeRegex = /\.add_edge\s*\(\s*(?:START|"([^"]+)"|'([^']+)')\s*,\s*(?:END|"([^"]+)"|'([^']+)')/g;
  while ((match = edgeRegex.exec(content)) !== null) {
    const src = match[1] ?? match[2] ?? '__start__';
    const tgt = match[3] ?? match[4] ?? '__end__';

    const srcId = slugify(src);
    const tgtId = slugify(tgt);

    if (nodeNames.has(src) && nodeNames.has(tgt)) {
      edges.push({
        id: `${srcId}->${tgtId}:pipeline`,
        source: srcId,
        target: tgtId,
        type: 'pipeline',
      });
    }
  }

  // Extract START -> node edges to mark phase
  const startEdgeRegex = /\.add_edge\s*\(\s*START\s*,\s*(?:"([^"]+)"|'([^']+)')/g;
  while ((match = startEdgeRegex.exec(content)) !== null) {
    const tgt = match[1] ?? match[2];
    if (tgt) {
      const agent = agents.find(a => a.id === slugify(tgt));
      if (agent) agent.phase = 1;
    }
  }

  // Extract add_conditional_edges(source, func, mapping)
  const condRegex = /\.add_conditional_edges\s*\(\s*(?:"([^"]+)"|'([^']+)')/g;
  while ((match = condRegex.exec(content)) !== null) {
    const src = match[1] ?? match[2];
    if (!src || !nodeNames.has(src)) continue;

    const srcId = slugify(src);
    const restOfCall = content.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 500);
    const targetRegex = /(?:"([^"]+)"|'([^']+)')\s*:\s*(?:"([^"]+)"|'([^']+)')/g;
    let targetMatch;
    while ((targetMatch = targetRegex.exec(restOfCall)) !== null) {
      const tgt = targetMatch[3] ?? targetMatch[4];
      if (tgt && nodeNames.has(tgt)) {
        edges.push({
          id: `${srcId}->${slugify(tgt)}:pipeline`,
          source: srcId,
          target: slugify(tgt),
          type: 'pipeline',
          label: targetMatch[1] ?? targetMatch[2] ?? undefined,
        });
      }
    }
  }

  return { agents, edges };
}

function extractNodeFunction(content: string, nodeName: string): string | null {
  // Escape nodeName to prevent regex injection (R1 fix)
  const escaped = escapeRegex(nodeName);
  const regex = new RegExp(`add_node\\s*\\(\\s*(?:"${escaped}"|'${escaped}')\\s*,\\s*(\\w+)`, 'i');
  const m = content.match(regex);
  return m ? m[1] : null;
}

function detectModelFromContent(content: string, nodeName: string): string {
  const funcName = extractNodeFunction(content, nodeName);
  if (!funcName) return 'unknown';

  // Escape funcName before interpolating into regex
  const escaped = escapeRegex(funcName);
  const funcRegex = new RegExp(`(?:def\\s+${escaped}|${escaped}\\s*=)[\\s\\S]{0,500}?model\\s*=\\s*(?:"([^"]+)"|'([^']+)')`, 'i');
  const m = content.match(funcRegex);
  return m ? (m[1] ?? m[2] ?? 'unknown') : 'unknown';
}
