import type { Agent } from '../types';
import { parseFrontmatter } from './markdownUtils';

/** Check if content looks like a SKILL.md agent definition */
export function isSkillFile(content: string, filename: string): boolean {
  const nameMatch = /skill\.md$/i.test(filename);
  const hasFrontmatter = /^---\s*\n[\s\S]*?\n---/.test(content);
  const hasAgentKeywords = /(?:agent|role|responsibilit|you are)/i.test(content);
  return nameMatch || (hasFrontmatter && hasAgentKeywords);
}

/** Extract agent enrichment data from SKILL.md files */
export function parseSkillFile(content: string, path: string): {
  skillDirName: string;
  name: string | null;
  description: string | null;
  instructions: string;
} {
  const frontmatter = parseFrontmatter(content);

  // Extract the skill directory name from path: .agents/skills/sourcing-agent/SKILL.md -> sourcing-agent
  const pathParts = path.replace(/\\/g, '/').split('/');
  const skillIdx = pathParts.findIndex(p => /skills?/i.test(p));
  const skillDirName = skillIdx >= 0 && pathParts[skillIdx + 1]
    ? pathParts[skillIdx + 1]
    : pathParts[pathParts.length - 2] ?? '';

  // Get body (everything after frontmatter)
  const bodyMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)/);
  const instructions = bodyMatch ? bodyMatch[1].trim() : content.trim();

  return {
    skillDirName,
    name: frontmatter['name'] || null,
    description: frontmatter['description'] || null,
    instructions,
  };
}

/** Enrich agents with skill file data */
export function enrichAgentsWithSkills(
  agents: Agent[],
  skills: ReturnType<typeof parseSkillFile>[]
): Agent[] {
  return agents.map(agent => {
    // Match by skill file reference or by name similarity
    const match = skills.find(skill => {
      if (!skill.skillDirName) return false;

      // Direct match: agent.skillFile references this skill directory
      if (agent.skillFile) {
        const agentSkillDir = agent.skillFile.replace(/\/SKILL\.md$/i, '').split('/').pop() ?? '';
        if (agentSkillDir.toLowerCase() === skill.skillDirName.toLowerCase()) return true;
      }

      // Name similarity: skill dir name matches agent name
      const normalized = skill.skillDirName.toLowerCase().replace(/[-_]/g, '');
      const agentNormalized = agent.name.toLowerCase().replace(/[-_]/g, '');
      return normalized === agentNormalized || agentNormalized.includes(normalized) || normalized.includes(agentNormalized);
    });

    if (!match) return agent;

    return {
      ...agent,
      description: match.description ?? agent.description,
      instructions: match.instructions ?? agent.instructions,
    };
  });
}
