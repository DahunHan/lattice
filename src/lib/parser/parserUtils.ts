import type { ModelFamily, AgentRole } from '../types';

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function classifyModelGeneric(model: string): ModelFamily {
  const m = model.toLowerCase();
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('opus')) return 'opus';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('python') || m.includes('no llm') || m.includes('n/a')) return 'python';
  return 'unknown';
}

export function classifyRoleGeneric(role: string): AgentRole {
  const r = role.toLowerCase();
  if (r.includes('orchestrat') || r.includes('manager') || r.includes('lead') || r.includes('sequencer')) return 'orchestrator';
  if (r.includes('review') || r.includes('quality') || r.includes('critic')) return 'reviewer';
  if (r.includes('publish') || r.includes('writer') || r.includes('report')) return 'publisher';
  if (r.includes('track') || r.includes('monitor') || r.includes('metric')) return 'tracker';
  if (r.includes('research') || r.includes('analy') || r.includes('sourc') || r.includes('verif')) return 'executor';
  return 'custom';
}

export function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
