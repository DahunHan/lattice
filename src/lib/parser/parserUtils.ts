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
  // Anthropic
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('opus')) return 'opus';
  // OpenAI
  if (/\b(o1|o3|o4)\b/.test(m)) return 'o-series';
  if (m.includes('gpt-') || m.includes('gpt4') || m.includes('chatgpt')) return 'gpt';
  // Google
  if (m.includes('gemini')) return 'gemini';
  // Meta
  if (m.includes('llama') || m.includes('meta-llama')) return 'llama';
  // Mistral
  if (m.includes('mistral') || m.includes('mixtral')) return 'mistral';
  // Deepseek
  if (m.includes('deepseek')) return 'deepseek';
  // Non-LLM
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
