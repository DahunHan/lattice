import type { ProjectMetadata } from '../types';
import { extractSections } from './markdownUtils';

/** Check if content looks like a CLAUDE.md project file */
export function isClaudeMd(content: string, filename: string): boolean {
  const nameMatch = /^claude\.md$/i.test(filename);
  const hasGoal = /##\s*\d*\.?\s*Goal/i.test(content);
  const hasStack = /(?:stack|framework|language|orchestrat)/i.test(content);
  return nameMatch || (hasGoal && hasStack);
}

/** Extract project metadata from CLAUDE.md */
export function parseClaudeMd(content: string, filename: string): Partial<ProjectMetadata> {
  const sections = extractSections(content);
  const metadata: Partial<ProjectMetadata> = {};

  // Extract project name from top-level heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  if (titleMatch) {
    metadata.name = titleMatch[1]
      .replace(/[—–-]+.*$/, '')  // Remove subtitle after dash
      .trim();
  }

  // Extract goal
  for (const section of sections) {
    if (/goal/i.test(section.heading)) {
      metadata.goal = section.body.split('\n')
        .filter(l => l.trim().length > 0)
        .slice(0, 3)
        .join(' ')
        .trim();
      break;
    }
  }

  // Extract description from first substantial section
  if (!metadata.description) {
    for (const section of sections) {
      if (section.body.length > 50 && !(/standard|convention|rule/i.test(section.heading))) {
        metadata.description = section.body.slice(0, 300).trim();
        break;
      }
    }
  }

  return metadata;
}
