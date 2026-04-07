import type { Agent, AgentEdge, AgentRole } from '../types';
import { slugify, truncate } from './parserUtils';

/** Detect AutoGen Python files (both 0.2/AG2 and 0.4+) */
export function isAutoGen(content: string, filename: string): boolean {
  if (!filename.endsWith('.py')) return false;

  // AutoGen 0.2 / AG2
  if (/from\s+autogen\s+import/.test(content)) return true;
  if (/(?:AssistantAgent|UserProxyAgent|GroupChat|GroupChatManager)\s*\(/.test(content) &&
      /autogen/.test(content)) return true;

  // AutoGen 0.4+
  if (/from\s+autogen_agentchat/.test(content)) return true;

  return false;
}

/** Parse AutoGen Python file — extract agents and edges */
export function parseAutoGen(content: string, filename: string): { agents: Agent[]; edges: AgentEdge[] } {
  const agents: Agent[] = [];
  const edges: AgentEdge[] = [];
  const varToName = new Map<string, string>();

  // Match agent instantiations (covers both 0.2 and 0.4)
  const agentRegex = /(\w+)\s*=\s*(?:AssistantAgent|UserProxyAgent|ConversableAgent|GPTAssistantAgent)\s*\(\s*(?:name\s*=\s*)?(?:"([^"]+)"|'([^']+)')/g;

  let match;
  while ((match = agentRegex.exec(content)) !== null) {
    const varName = match[1];
    const name = match[2] ?? match[3];
    if (!name || varToName.has(varName)) continue;

    varToName.set(varName, name);
    const id = slugify(name);

    const role = extractNearbyParam(content, match.index ?? 0, 'system_message');
    const model = extractModel(content, match.index ?? 0);
    const roleType = classifyAgentType(content, match.index ?? 0);
    const isProxy = /UserProxyAgent/.test(match[0]);

    agents.push({
      id,
      name,
      role: role ? truncate(role, 120) : (isProxy ? 'User proxy' : 'Assistant agent'),
      roleType,
      model: model || 'unknown',
      modelFamily: 'unknown',
      status: 'active',
      isOrchestrator: roleType === 'orchestrator',
      skillFile: null,
      script: filename,
      description: role ? truncate(role, 200) : null,
      instructions: null,
      phase: null,
      schedule: null,
      tags: ['autogen'],
    });
  }

  // Parse GroupChat transitions
  const transitionRegex = /(?:allowed_or_disallowed_speaker_transitions|speaker_transitions)\s*=\s*\{([^}]+)\}/;
  const transMatch = content.match(transitionRegex);
  if (transMatch) {
    const entryRegex = /(\w+)\s*:\s*\[([^\]]*)\]/g;
    let entry;
    while ((entry = entryRegex.exec(transMatch[1])) !== null) {
      const srcVar = entry[1];
      const targets = entry[2].split(',').map(s => s.trim()).filter(Boolean);
      const srcName = varToName.get(srcVar);
      if (!srcName) continue;

      for (const tgtVar of targets) {
        const tgtName = varToName.get(tgtVar);
        if (!tgtName) continue;
        const srcId = slugify(srcName);
        const tgtId = slugify(tgtName);
        edges.push({
          id: `${srcId}->${tgtId}:pipeline`,
          source: srcId,
          target: tgtId,
          type: 'pipeline',
        });
      }
    }
  }

  // Parse handoffs (AutoGen 0.4 Swarm)
  const handoffRegex = /(\w+)\s*=\s*AssistantAgent\s*\([^)]*handoffs\s*=\s*\[([^\]]*)\]/g;
  let handoffMatch;
  while ((handoffMatch = handoffRegex.exec(content)) !== null) {
    const srcVar = handoffMatch[1];
    const srcName = varToName.get(srcVar);
    if (!srcName) continue;

    const handoffTargets = handoffMatch[2].match(/(?:"([^"]+)"|'([^']+)'|\b(\w+)\b)/g) ?? [];
    for (const tgt of handoffTargets) {
      const tgtClean = tgt.replace(/["']/g, '');
      const tgtName = varToName.get(tgtClean) ?? tgtClean;
      const srcId = slugify(srcName);
      const tgtId = slugify(tgtName);
      if (agents.some(a => a.id === tgtId)) {
        edges.push({
          id: `${srcId}->${tgtId}:pipeline`,
          source: srcId,
          target: tgtId,
          type: 'pipeline',
        });
      }
    }
  }

  // Parse GroupChatManager → supervision edges
  const managerRegex = /(\w+)\s*=\s*GroupChatManager\s*\(/g;
  let managerMatch;
  while ((managerMatch = managerRegex.exec(content)) !== null) {
    const mgrVar = managerMatch[1];
    const mgrName = varToName.get(mgrVar);
    if (!mgrName) continue;

    const mgrId = slugify(mgrName);
    for (const a of agents) {
      if (a.id !== mgrId) {
        edges.push({
          id: `${mgrId}->${a.id}:supervision`,
          source: mgrId,
          target: a.id,
          type: 'supervision',
        });
      }
    }
  }

  // Detect sequential team type → create pipeline if no edges found
  if (/RoundRobinGroupChat|Process\.sequential/.test(content) && edges.length === 0 && agents.length > 1) {
    for (let i = 0; i < agents.length - 1; i++) {
      edges.push({
        id: `${agents[i].id}->${agents[i + 1].id}:pipeline`,
        source: agents[i].id,
        target: agents[i + 1].id,
        type: 'pipeline',
      });
    }
  }

  return { agents, edges };
}

function extractNearbyParam(content: string, startIdx: number, param: string): string | null {
  const chunk = content.slice(startIdx, startIdx + 1000);
  // Use bounded quantifiers to prevent catastrophic backtracking (R2 fix)
  const regex = new RegExp(`${param}\\s*=\\s*(?:"([^"]{0,500})"|'([^']{0,500})'|"""([\\s\\S]{0,800})""")`, 'i');
  const m = chunk.match(regex);
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

function extractModel(content: string, startIdx: number): string {
  const chunk = content.slice(startIdx, startIdx + 1500);
  const m = chunk.match(/model["']\s*:\s*["']([^"']+)["']/);
  if (m) return m[1];
  const m2 = chunk.match(/model_client\s*=\s*\w+[\s\S]{0,300}?model\s*=\s*["']([^"']+)["']/);
  if (m2) return m2[1];
  return 'unknown';
}

function classifyAgentType(content: string, startIdx: number): AgentRole {
  const chunk = content.slice(startIdx, startIdx + 200);
  if (/GroupChatManager|manager/i.test(chunk)) return 'orchestrator';
  if (/UserProxyAgent/i.test(chunk)) return 'tracker';
  if (/review|critic|quality/i.test(chunk)) return 'reviewer';
  return 'executor';
}
