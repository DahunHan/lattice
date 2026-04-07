import type { Agent, ModelFamily, AgentRole, AgentEdge } from '../types';
import { parseFrontmatter, extractSections, parseMarkdownTable } from './markdownUtils';

/**
 * Detect if a file is a Claude Code agent definition (.claude/agents/*.md)
 * These files have frontmatter with name/description and agent-related content.
 */
export function isClaudeAgentFile(content: string, path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
  // Strict path check: must be in .claude/agents/ directory specifically
  // NOT .agents/skills/ (those are SKILL.md files handled by skillParser)
  if (normalizedPath.includes('/skills/') || normalizedPath.endsWith('skill.md')) {
    return false;
  }
  if (normalizedPath.includes('.claude/agents/') || normalizedPath.includes('/.claude/agents/')) {
    return true;
  }
  // Content-based fallback: frontmatter with name + description + agent identity
  const fm = parseFrontmatter(content);
  if (fm['name'] && fm['description']) {
    const hasAgentIdentity = /(?:you are the|your (?:job|role|goal) is|core responsibilit)/i.test(content);
    // Must NOT look like a skill file (skills have different structure)
    const looksLikeSkill = /(?:## (?:Input|Output|Process|Constraints))/i.test(content);
    return hasAgentIdentity && !looksLikeSkill;
  }
  return false;
}

/**
 * Parse a single .claude/agents/*.md file into an Agent
 */
export function parseClaudeAgentFile(content: string, path: string): Agent {
  const fm = parseFrontmatter(content);

  // Extract agent name from frontmatter or filename
  const pathParts = path.replace(/\\/g, '/').split('/');
  const filename = pathParts[pathParts.length - 1]?.replace(/\.md$/i, '') ?? '';
  const name = fm['name'] || filename;

  // Extract description
  const description = fm['description'] || null;

  // Extract role from first heading or description
  const sections = extractSections(content);
  let role = description ?? '';
  if (sections.length > 0) {
    // First heading often contains role info (e.g. "# Architect — System & Component Architecture")
    const titleParts = sections[0].heading.split(/[—–\-:]/);
    if (titleParts.length > 1) {
      role = titleParts.slice(1).join(' ').trim();
    }
  }

  // Detect model from content
  const modelFamily = detectModelFromContent(content);

  // Detect role type
  const roleType = detectRoleType(name, role, content);

  // Get full instructions (body after frontmatter)
  const bodyMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)/);
  const instructions = bodyMatch ? bodyMatch[1].trim() : content.trim();

  return {
    id: slugify(name),
    name: formatAgentName(name),
    role,
    roleType,
    model: fm['model'] || '',
    modelFamily,
    status: 'active',
    isOrchestrator: roleType === 'orchestrator',
    skillFile: null,
    script: null,
    description,
    instructions,
    phase: null,
    schedule: null,
    tags: extractTags(content),
    sourceFile: path,
  };
}

/**
 * Parse a CLAUDE.md orchestration table to extract agent relationships
 * Many CLAUDE.md files have a table like:
 *   | Agent | Role |
 *   | architect | Component structure... |
 */
export function parseOrchestrationTable(claudeMdContent: string, agents: Agent[]): AgentEdge[] {
  const edges: AgentEdge[] = [];
  const sections = extractSections(claudeMdContent);

  // Look for orchestration/workflow sections
  for (const section of sections) {
    if (/orchestrat|workflow|agent|team/i.test(section.heading)) {
      // Look for arrow patterns in workflow descriptions (even if section also has tables)
      const arrowPattern = /(\w[\w-]+)\s*(?:->|-->|=>|then)\s*(\w[\w-]+)/gi;
      const agentIds = new Set(agents.map(a => a.id));

      for (const match of section.body.matchAll(arrowPattern)) {
        const src = slugify(match[1]);
        const tgt = slugify(match[2]);
        if (agentIds.has(src) && agentIds.has(tgt)) {
          edges.push({
            id: `${src}-${tgt}-pipeline`,
            source: src,
            target: tgt,
            type: 'pipeline',
            animated: true,
          });
        }
      }
    }

    // Look for "Workflow: A -> B -> (C + D) -> E" patterns
    const workflowPattern = /workflow:?\s*(.+)/i;
    const workflowMatch = section.body.match(workflowPattern);
    if (workflowMatch) {
      // Build a lookup: various name forms -> agent ID
      const nameToId = new Map<string, string>();
      for (const a of agents) {
        nameToId.set(a.id, a.id);
        nameToId.set(a.name.toLowerCase(), a.id);
        nameToId.set(slugify(a.name), a.id);
        // Also try without common suffixes
        const base = a.id.replace(/_agent$/, '').replace(/_dev$/, '');
        nameToId.set(base, a.id);
      }

      const resolveId = (name: string): string | null => {
        const slug = slugify(name);
        return nameToId.get(slug) ?? nameToId.get(name.toLowerCase()) ?? null;
      };

      const parts = workflowMatch[1].split(/\s*(?:->|-->|=>|then)\s*/);
      for (let i = 0; i < parts.length - 1; i++) {
        const srcNames = extractAgentNames(parts[i]);
        const tgtNames = extractAgentNames(parts[i + 1]);

        for (const src of srcNames) {
          for (const tgt of tgtNames) {
            const srcId = resolveId(src);
            const tgtId = resolveId(tgt);
            if (srcId && tgtId && srcId !== tgtId) {
              edges.push({
                id: `${srcId}-${tgtId}-pipeline`,
                source: srcId,
                target: tgtId,
                type: 'pipeline',
                animated: true,
              });
            }
          }
        }
      }
    }
  }

  return edges;
}

function extractAgentNames(text: string): string[] {
  // Remove parens, strip qualifiers like "in parallel", split by + or ,
  return text
    .replace(/[()]/g, '')
    .replace(/\s+in\s+parallel\b/gi, '')
    .replace(/\s+(?:simultaneously|concurrently)\b/gi, '')
    .split(/\s*[+,&]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function detectModelFromContent(content: string): ModelFamily {
  const lower = content.toLowerCase();
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('gemini') || lower.includes('google')) return 'gemini';
  if (lower.includes('python') || lower.includes('no llm')) return 'python';
  // Claude agents without specific model are typically sonnet
  if (lower.includes('claude')) return 'sonnet';
  return 'unknown';
}

function detectRoleType(name: string, role: string, content: string): AgentRole {
  const combined = `${name} ${role}`.toLowerCase();
  if (/orchestrat|sequencer|coordinat/.test(combined)) return 'orchestrator';
  if (/review|audit|inspect|quality/.test(combined)) return 'reviewer';
  if (/publish|deploy|release/.test(combined)) return 'publisher';
  if (/track|monitor|metric/.test(combined)) return 'tracker';
  if (/architect|design|plan/.test(combined)) return 'executor';
  if (/develop|build|implement|frontend|backend/.test(combined)) return 'executor';
  if (/test|qa|valid/.test(combined)) return 'reviewer';
  return 'custom';
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function formatAgentName(name: string): string {
  // Convert kebab-case to Title_Case for display
  return name
    .split(/[-_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const lower = content.toLowerCase();
  if (lower.includes('review')) tags.push('reviewer');
  if (lower.includes('test')) tags.push('testing');
  if (lower.includes('security')) tags.push('security');
  if (lower.includes('design')) tags.push('design');
  if (lower.includes('performance')) tags.push('performance');
  if (lower.includes('architect')) tags.push('architecture');
  return tags;
}
