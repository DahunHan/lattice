import type { Agent, AgentEdge, ModelFamily } from '../types';

/** Attempt to discover agents from unstructured markdown */
export function detectAgentsHeuristic(content: string, filename: string): Agent[] {
  const agents: Agent[] = [];
  const seen = new Set<string>();

  // Pattern 1: Bold names followed by descriptions (e.g., **AgentName** — Does something)
  const boldPattern = /\*\*(\w[\w\s-]{2,30})\*\*\s*[—–:-]\s*(.+)/g;
  for (const match of content.matchAll(boldPattern)) {
    const name = match[1].trim();
    const role = match[2].trim();
    if (isAgentLike(name, role) && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      agents.push(createAgent(name, role));
    }
  }

  // Pattern 2: Heading + "agent" in context
  const headingPattern = /^#{2,4}\s+(.+agent.+|.+bot.+|.+worker.+)/gim;
  for (const match of content.matchAll(headingPattern)) {
    const name = match[1].trim().replace(/\s*[-—–:].+$/, '');
    if (name.length > 2 && name.length < 40 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      agents.push(createAgent(name, ''));
    }
  }

  // Pattern 3: Bullet lists with key-value pairs
  const bulletBlockPattern = /[-*]\s+\*?\*?(\w[\w\s-]{2,30})\*?\*?\s*\n(?:\s+[-*]\s+(?:model|role|status|type):\s*.+\n?)+/gi;
  for (const match of content.matchAll(bulletBlockPattern)) {
    const name = match[1].trim();
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      const blockText = match[0];
      const roleMatch = blockText.match(/role:\s*(.+)/i);
      agents.push(createAgent(name, roleMatch?.[1]?.trim() ?? ''));
    }
  }

  return agents;
}

/** Attempt to discover edges from unstructured markdown */
export function detectEdgesHeuristic(content: string, knownAgentIds: Set<string>): AgentEdge[] {
  const edges: AgentEdge[] = [];
  const edgeSet = new Set<string>();

  // Arrow patterns: A → B, A -> B
  const arrowPattern = /(\w[\w_-]+)\s*(?:→|->|──>|==>)\s*(\w[\w_-]+)/g;
  for (const match of content.matchAll(arrowPattern)) {
    const src = slugify(match[1]);
    const tgt = slugify(match[2]);
    const key = `${src}->${tgt}`;
    if (knownAgentIds.has(src) && knownAgentIds.has(tgt) && !edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `${src}-${tgt}-pipeline`,
        source: src,
        target: tgt,
        type: 'pipeline',
        animated: true,
      });
    }
  }

  // Verbal patterns: "X feeds into Y", "X sends to Y"
  const verbalPatterns = [
    /(\w[\w_-]+)\s+(?:feeds?\s+into|sends?\s+to|triggers?|passes?\s+to|flows?\s+to)\s+(\w[\w_-]+)/gi,
    /(\w[\w_-]+)\s+(?:supervises?|controls?|monitors?|directs?|manages?)\s+(\w[\w_-]+)/gi,
  ];

  for (const pattern of verbalPatterns) {
    const isSupervision = pattern.source.includes('supervis');
    for (const match of content.matchAll(pattern)) {
      const src = slugify(match[1]);
      const tgt = slugify(match[2]);
      const type = isSupervision ? 'supervision' : 'pipeline';
      const key = `${src}->${tgt}:${type}`;
      if (knownAgentIds.has(src) && knownAgentIds.has(tgt) && !edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: `${src}-${tgt}-${type}`,
          source: src,
          target: tgt,
          type: type as AgentEdge['type'],
        });
      }
    }
  }

  return edges;
}

// Common doc headings and generic words that should NOT be detected as agents
const EXCLUDE_NAMES = new Set([
  'customize', 'customize further', 'getting started', 'installation',
  'quick start', 'overview', 'introduction', 'usage', 'configuration',
  'multi agent', 'multi-agent', 'agent as tool', 'streaming', 'about',
  'features', 'setup', 'contributing', 'license', 'changelog',
  'api reference', 'examples', 'faq', 'troubleshooting',
]);

function isAgentLike(name: string, context: string): boolean {
  const nameLower = name.toLowerCase().trim();

  // Reject common doc headings
  if (EXCLUDE_NAMES.has(nameLower)) return false;

  // Reject very short or generic names
  if (nameLower.length < 3) return false;
  if (/^(the|a|an|this|that|how|why|what|when)\s/i.test(name)) return false;

  const combined = `${name} ${context}`.toLowerCase();
  const agentKeywords = ['agent', 'bot', 'worker', 'processor', 'handler', 'orchestrat', 'reviewer', 'tracker', 'publisher', 'analyzer', 'monitor'];
  return agentKeywords.some(kw => combined.includes(kw));
}

function classifyModelFromText(text: string): ModelFamily {
  const t = text.toLowerCase();
  if (t.includes('haiku')) return 'haiku';
  if (t.includes('sonnet')) return 'sonnet';
  if (t.includes('opus')) return 'opus';
  if (t.includes('gemini')) return 'gemini';
  if (t.includes('python') || t.includes('no llm')) return 'python';
  return 'unknown';
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function createAgent(name: string, role: string): Agent {
  return {
    id: slugify(name),
    name,
    role,
    roleType: 'custom',
    model: '',
    modelFamily: classifyModelFromText(role),
    status: 'active',
    isOrchestrator: /orchestrat|sequencer/i.test(role),
    skillFile: null,
    script: null,
    description: null,
    instructions: null,
    phase: null,
    schedule: null,
    tags: [],
    sourceFile: null,
        group: null,
  };
}
