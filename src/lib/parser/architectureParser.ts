import type { Agent, AgentEdge, PipelinePhase } from '../types';
import { extractSections } from './markdownUtils';

/** Extract pipeline phases from architecture markdown */
export function parsePipeline(content: string, agents: Agent[]): PipelinePhase[] {
  const scriptToAgent = new Map<string, Agent>();
  const nameToAgent = new Map<string, Agent>();

  for (const agent of agents) {
    if (agent.script && agent.script.toUpperCase() !== 'N/A') {
      const filename = agent.script.split('/').pop() ?? '';
      scriptToAgent.set(filename, agent);
    }
    nameToAgent.set(agent.name.toLowerCase(), agent);
    nameToAgent.set(agent.id, agent);
  }

  const phases: PipelinePhase[] = [];
  const sections = extractSections(content);

  // Look for pipeline-related sections
  const pipelineSections = sections.filter(s =>
    /pipeline|phase|workflow|execution/i.test(s.heading)
  );

  // Strategy 1: Find explicit "Phase N" patterns
  const timePattern = /\[?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:[A-Z]{2,4})?)\s*\]?/i;

  for (const section of pipelineSections) {
    const fullText = `${section.heading}\n${section.body}`;
    // Create fresh regex per section to avoid lastIndex carryover (R5 fix)
    const phasePattern = /phase\s+(\d+)[:\s]*([^\n]*)/gi;
    const scriptPattern = /agents\/(\w+\.py)/g;
    let phaseMatch;

    while ((phaseMatch = phasePattern.exec(fullText)) !== null) {
      const phaseNum = parseInt(phaseMatch[1], 10);
      const phaseName = phaseMatch[2].trim().replace(/^[:\-–—\s]+/, '');

      // Find the section of text for this phase (until next Phase)
      const phaseStart = phaseMatch.index;
      const nextPhaseIdx = fullText.indexOf('Phase', phaseStart + 1);
      const phaseText = nextPhaseIdx > -1
        ? fullText.slice(phaseStart, nextPhaseIdx)
        : fullText.slice(phaseStart, phaseStart + 500);

      // Extract time
      const timeMatch = phaseText.match(timePattern);
      const time = timeMatch ? timeMatch[1].trim() : null;

      // Extract agent by script reference
      let agentId = '';
      const scriptMatches = [...phaseText.matchAll(scriptPattern)];
      if (scriptMatches.length > 0) {
        const scriptFile = scriptMatches[0][1];
        const agent = scriptToAgent.get(scriptFile);
        if (agent) agentId = agent.id;
      }

      // Fallback: try to match agent name in the phase text
      if (!agentId) {
        for (const agent of agents) {
          const nameVariants = [
            agent.name,
            agent.name.replace(/_/g, ' '),
            agent.name.replace(/_/g, '-'),
          ];
          for (const variant of nameVariants) {
            if (phaseText.toLowerCase().includes(variant.toLowerCase())) {
              agentId = agent.id;
              break;
            }
          }
          if (agentId) break;
        }
      }

      if (agentId) {
        phases.push({
          phase: phaseNum,
          name: phaseName || `Phase ${phaseNum}`,
          time,
          agentId,
          gateCondition: null,
        });
      }
    }
  }

  // Strategy 2: If no explicit phases found, infer from script references in order
  if (phases.length === 0) {
    const allText = sections.map(s => s.body).join('\n');
    const seen = new Set<string>();
    let phaseNum = 1;

    for (const match of allText.matchAll(/agents\/(\w+\.py)/g)) {
      const scriptFile = match[1];
      if (seen.has(scriptFile)) continue;
      seen.add(scriptFile);

      const agent = scriptToAgent.get(scriptFile);
      if (agent && !agent.isOrchestrator) {
        phases.push({
          phase: phaseNum++,
          name: agent.name.replace(/_/g, ' '),
          time: null,
          agentId: agent.id,
          gateCondition: null,
        });
      }
    }
  }

  return phases.sort((a, b) => a.phase - b.phase);
}

/** Extract edges from architecture content */
export function parseEdges(content: string, agents: Agent[], pipeline: PipelinePhase[]): AgentEdge[] {
  const edges: AgentEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (source: string, target: string, type: AgentEdge['type'], label?: string) => {
    const key = `${source}->${target}:${type}`;
    if (edgeSet.has(key)) return;
    if (source === target) return;
    edgeSet.add(key);
    edges.push({
      id: `${source}-${target}-${type}`,
      source,
      target,
      type,
      label,
      animated: type === 'pipeline',
    });
  };

  // Pipeline edges from sequential phases
  for (let i = 0; i < pipeline.length - 1; i++) {
    addEdge(pipeline[i].agentId, pipeline[i + 1].agentId, 'pipeline');
  }

  // Supervision edges: orchestrators supervise non-orchestrator agents
  const orchestrators = agents.filter(a => a.isOrchestrator);
  const sections = extractSections(content);

  for (const orch of orchestrators) {
    // Look for explicit supervision mentions
    for (const section of sections) {
      const text = section.body.toLowerCase();
      for (const agent of agents) {
        if (agent.isOrchestrator || agent.id === orch.id) continue;

        const nameVariants = [
          agent.name.toLowerCase(),
          agent.name.replace(/_/g, ' ').toLowerCase(),
          agent.name.replace(/_/g, '-').toLowerCase(),
        ];

        for (const variant of nameVariants) {
          // Check for supervision language near agent mentions
          const idx = text.indexOf(variant);
          if (idx !== -1) {
            const surroundingText = text.slice(Math.max(0, idx - 100), idx + variant.length + 100);
            if (/(?:run|execut|trigger|start|launch|dispatch|orchestrat|control|supervis|direct|manag)/i.test(surroundingText)) {
              addEdge(orch.id, agent.id, 'supervision');
              break;
            }
          }
        }
      }
    }
  }

  // Data flow edges: detect file output/input patterns
  const dataFlowPatterns = [
    /(\w+)\s*(?:→|->|──>|produces?|outputs?|generates?|writes?)\s*["`']?([/\w._-]+\.(json|md|csv))["`']?/gi,
    /["`']?([/\w._-]+\.(json|md|csv))["`']?\s*(?:→|->|──>|consumed by|read by|input to|used by)\s*(\w+)/gi,
  ];

  const nameToAgent = new Map<string, string>();
  for (const agent of agents) {
    nameToAgent.set(agent.name.toLowerCase(), agent.id);
    nameToAgent.set(agent.name.replace(/_/g, ' ').toLowerCase(), agent.id);
    nameToAgent.set(agent.id, agent.id);
  }

  for (const section of sections) {
    for (const pattern of dataFlowPatterns) {
      for (const match of section.body.matchAll(pattern)) {
        // Try to resolve agent names in match groups
        const groups = match.slice(1);
        for (let i = 0; i < groups.length - 1; i++) {
          const srcId = nameToAgent.get(groups[i]?.toLowerCase() ?? '');
          const tgtId = nameToAgent.get(groups[i + 1]?.toLowerCase() ?? '');
          if (srcId && tgtId) {
            addEdge(srcId, tgtId, 'data-flow', groups.find(g => g?.includes('.')) ?? undefined);
          }
        }
      }
    }
  }

  return edges;
}

/** Check if content looks like a system architecture doc */
export function isArchitectureDoc(content: string, filename: string): boolean {
  const nameMatch = /architect|system|pipeline|workflow/i.test(filename);
  const contentMatch = /(?:pipeline|phase|workflow|data.?flow|orchestrat)/i.test(content);
  const hasPhases = /phase\s+\d/i.test(content);
  return nameMatch || (contentMatch && hasPhases);
}
