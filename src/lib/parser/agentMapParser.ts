import type { Agent, ModelFamily, AgentRole } from '../types';
import { parseCSV, parseMarkdownTable } from './markdownUtils';

const ORCHESTRATOR_KEYWORDS = ['orchestrator', 'sequencer', 'pipeline sequencer'];

function isOrchestrator(role: string): boolean {
  const r = role.toLowerCase();
  return ORCHESTRATOR_KEYWORDS.some(kw => r.includes(kw));
}

function classifyModel(model: string): ModelFamily {
  const m = model.toLowerCase();
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('opus')) return 'opus';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('python') || m.includes('no llm') || m.includes('n/a')) return 'python';
  return 'unknown';
}

function classifyRole(role: string): AgentRole {
  const r = role.toLowerCase();
  if (isOrchestrator(r)) return 'orchestrator';
  if (r.includes('review') || r.includes('quality')) return 'reviewer';
  if (r.includes('publish') || r.includes('ghost') || r.includes('cms')) return 'publisher';
  if (r.includes('track') || r.includes('metric') || r.includes('monitor')) return 'tracker';
  if (r.includes('sourc') || r.includes('analy') || r.includes('verif') || r.includes('growth')) return 'executor';
  return 'custom';
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseStatus(status: string): 'active' | 'paused' | 'archived' {
  const s = status.toLowerCase();
  if (s.includes('archiv')) return 'archived';
  if (s.includes('paus')) return 'paused';
  return 'active';
}

/** Detect if content looks like a CSV agent map (comma-separated with known headers) */
function isCSVFormat(content: string): boolean {
  const firstLine = content.split('\n')[0] ?? '';
  return firstLine.includes('Agent Name') && firstLine.includes(',') && !firstLine.includes('|');
}

/** Detect if content contains a markdown table with agent-like header columns */
function hasAgentTable(content: string): boolean {
  // Find table header rows (lines before |---|---| separator)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = (lines[i + 1] ?? '').trim();
    // Header row must be pipe-delimited and followed by separator
    if (line.startsWith('|') && nextLine.match(/^\|[\s\-:|]+\|/)) {
      // Split into column headers and check if they look like an agent map
      const headers = line.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
      const hasAgent = headers.some(h => h === 'agent' || h === 'agent name' || h === 'name');
      const hasRole = headers.some(h => h === 'role' || h === 'model' || h === 'status' || h === 'script');
      if (hasAgent && hasRole) return true;
    }
  }
  return false;
}

/** Check if file content looks like a dedicated agent map file */
export function isAgentMap(content: string, filename?: string): boolean {
  const lowerName = (filename ?? '').toLowerCase();
  if (lowerName === 'readme.md' || lowerName.startsWith('changelog') || lowerName.startsWith('contributing')) {
    return false;
  }
  return isCSVFormat(content) || hasAgentTable(content);
}

/** Parse agent map from CSV or markdown table format */
export function parseAgentMap(content: string, filename: string): Agent[] {
  let rows: Record<string, string>[];

  if (isCSVFormat(content)) {
    rows = parseCSV(content);
  } else if (hasAgentTable(content)) {
    rows = parseMarkdownTable(content);
  } else {
    return [];
  }

  if (rows.length === 0) return [];

  return rows
    .filter(row => {
      // Must have at least a name
      const name = row['Agent Name'] || row['Agent'] || row['Name'] || '';
      return name.trim().length > 0;
    })
    .map(row => {
      const name = (row['Agent Name'] || row['Agent'] || row['Name'] || '').trim();
      const role = (row['Role'] || row['Description'] || '').trim();
      const model = (row['Primary Model'] || row['Model'] || '').trim();
      const skillFile = (row['Skill File'] || row['Skill'] || '').trim() || null;
      const script = (row['Script'] || row['File'] || '').trim() || null;
      const status = (row['Status'] || 'Active').trim();

      return {
        id: slugify(name),
        name,
        role,
        roleType: classifyRole(role),
        model,
        modelFamily: classifyModel(model),
        status: parseStatus(status),
        isOrchestrator: isOrchestrator(role),
        skillFile: skillFile === 'N/A' ? null : skillFile,
        script: script === 'N/A' ? null : script,
        description: null,
        instructions: null,
        phase: null,
        schedule: null,
        tags: [],
        sourceFile: null,
      };
    });
}
