import type { ModelFamily } from '../types';

export const MODEL_COLORS: Record<ModelFamily, { bg: string; border: string; glow: string; text: string }> = {
  haiku:   { bg: '#0A2A4A', border: '#4A9EE0', glow: 'rgba(74, 158, 224, 0.25)', text: '#4A9EE0' },
  sonnet:  { bg: '#0A3A2A', border: '#2ECC71', glow: 'rgba(46, 204, 113, 0.25)', text: '#2ECC71' },
  opus:    { bg: '#2A1A3A', border: '#9B59B6', glow: 'rgba(155, 89, 182, 0.25)', text: '#9B59B6' },
  gemini:  { bg: '#2A2A1A', border: '#F1C40F', glow: 'rgba(241, 196, 15, 0.25)', text: '#F1C40F' },
  python:  { bg: '#1A1A2A', border: '#7F8C8D', glow: 'rgba(127, 140, 141, 0.25)', text: '#7F8C8D' },
  unknown: { bg: '#1A1A2A', border: '#95A5A6', glow: 'rgba(149, 165, 166, 0.25)', text: '#95A5A6' },
};

export const ORCHESTRATOR_COLORS = {
  bg: '#1A1408',
  border: '#F5A623',
  glow: 'rgba(245, 166, 35, 0.35)',
  text: '#F5A623',
};

export const STATUS_COLORS: Record<string, string> = {
  active:   '#2ECC71',
  paused:   '#F39C12',
  archived: '#555555',
};

export const SURFACE = {
  bg:         '#0A0A1B',
  surface:    '#12122A',
  surfaceAlt: '#161632',
  border:     '#1E1E3A',
  borderLight:'#2E2E52',
  text:       '#E0E0F0',
  textDim:    '#8888AA',
  accent:     '#F5A623',
  accentDim:  'rgba(245, 166, 35, 0.15)',
};

export function getAgentColors(agent: { modelFamily: ModelFamily; isOrchestrator: boolean }) {
  if (agent.isOrchestrator) return ORCHESTRATOR_COLORS;
  return MODEL_COLORS[agent.modelFamily];
}
