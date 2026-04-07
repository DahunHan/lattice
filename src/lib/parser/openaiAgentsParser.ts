import type { Agent, AgentEdge } from '../types';
import { slugify, truncate } from './parserUtils';

/** Detect OpenAI Agents SDK Python files */
export function isOpenAIAgents(content: string, filename: string): boolean {
  if (!filename.endsWith('.py')) return false;

  // Import patterns
  if (/from\s+agents\s+import\s+(?:.*\bAgent\b)/.test(content)) return true;
  if (/from\s+openai_agents\s+import/.test(content)) return true;

  // Agent() with handoffs= is a strong signal
  if (/Agent\s*\([^)]*handoffs\s*=/.test(content) && /from\s+agents/.test(content)) return true;

  return false;
}

/** Parse OpenAI Agents SDK Python file */
export function parseOpenAIAgents(content: string, filename: string): { agents: Agent[]; edges: AgentEdge[] } {
  const agents: Agent[] = [];
  const edges: AgentEdge[] = [];
  const varToName = new Map<string, string>();

  // Match: var = Agent(name="Name", ...) or Agent("Name", ...)
  const agentRegex = /(\w+)\s*=\s*Agent\s*\(\s*(?:name\s*=\s*)?(?:"([^"]+)"|'([^']+)')/g;
  let match;

  while ((match = agentRegex.exec(content)) !== null) {
    const varName = match[1];
    const name = match[2] ?? match[3];
    if (!name || varToName.has(varName)) continue;

    varToName.set(varName, name);
    const id = slugify(name);

    // Extract fields from the constructor
    const constructorEnd = findMatchingParen(content, (match.index ?? 0) + match[0].indexOf('('));
    const constructorBody = content.slice((match.index ?? 0), constructorEnd);

    const instructions = extractStringParam(constructorBody, 'instructions');
    const model = extractStringParam(constructorBody, 'model');
    const handoffDesc = extractStringParam(constructorBody, 'handoff_description');

    // Check if this agent has handoffs (triage/orchestrator pattern)
    const hasHandoffs = /handoffs\s*=\s*\[/.test(constructorBody);

    agents.push({
      id,
      name,
      role: handoffDesc ?? (hasHandoffs ? 'Triage agent' : 'Specialist agent'),
      roleType: hasHandoffs ? 'orchestrator' : 'executor',
      model: model ?? 'unknown',
      modelFamily: 'unknown',
      status: 'active',
      isOrchestrator: hasHandoffs,
      skillFile: null,
      script: filename,
      description: handoffDesc ?? (instructions ? truncate(instructions, 200) : null),
      instructions: instructions ? truncate(instructions, 2000) : null,
      phase: null,
      schedule: null,
      tags: ['openai-agents'],
    });
  }

  // Second pass: extract handoff edges
  const handoffRegex = /(\w+)\s*=\s*Agent\s*\([^)]*handoffs\s*=\s*\[([^\]]*)\]/g;
  let handoffMatch;
  while ((handoffMatch = handoffRegex.exec(content)) !== null) {
    const srcVar = handoffMatch[1];
    const srcName = varToName.get(srcVar);
    if (!srcName) continue;

    const handoffList = handoffMatch[2];
    // Match variable references and handoff() calls
    const targetRegex = /\b(\w+)\b/g;
    let targetMatch;
    while ((targetMatch = targetRegex.exec(handoffList)) !== null) {
      const tgtVar = targetMatch[1];
      // Skip keywords
      if (['handoff', 'agent', 'tool_name_override', 'tool_description_override', 'on_handoff', 'input_type', 'input_filter'].includes(tgtVar)) continue;

      const tgtName = varToName.get(tgtVar);
      if (!tgtName) continue;

      const srcId = slugify(srcName);
      const tgtId = slugify(tgtName);
      if (srcId !== tgtId) {
        edges.push({
          id: `${srcId}->${tgtId}:pipeline`,
          source: srcId,
          target: tgtId,
          type: 'pipeline',
          label: 'handoff',
        });
      }
    }
  }

  return { agents, edges };
}

function findMatchingParen(content: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < content.length && i < openIdx + 3000; i++) {
    if (content[i] === '(') depth++;
    if (content[i] === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return Math.min(openIdx + 3000, content.length);
}

function extractStringParam(body: string, param: string): string | null {
  // Match param="value" or param='value' or param="""value"""
  const regex = new RegExp(`${param}\\s*=\\s*(?:"""([\\s\\S]*?)"""|"([^"]*?)"|'([^']*?)')`, 'i');
  const m = body.match(regex);
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

