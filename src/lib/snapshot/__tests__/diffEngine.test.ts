import { describe, it, expect } from 'vitest';
import { diffSnapshots, hasDiffChanges } from '../diffEngine';
import type { ProjectData, Agent, AgentEdge } from '../../types';

function makeAgent(overrides: Partial<Agent> & { id: string; name: string }): Agent {
  return {
    role: 'executor',
    roleType: 'executor',
    model: 'sonnet',
    modelFamily: 'sonnet',
    status: 'active',
    isOrchestrator: false,
    skillFile: null,
    script: null,
    description: null,
    instructions: null,
    phase: null,
    schedule: null,
    tags: [],
    ...overrides,
  };
}

function makeProject(agents: Agent[], edges: AgentEdge[] = []): ProjectData {
  return {
    metadata: { name: 'Test', goal: null, description: null },
    agents,
    edges,
    pipeline: [],
    rawFiles: [],
    warnings: [],
  };
}

describe('diffSnapshots', () => {
  it('detects added agents', () => {
    const snapshot = makeProject([makeAgent({ id: 'a', name: 'A' })]);
    const current = makeProject([
      makeAgent({ id: 'a', name: 'A' }),
      makeAgent({ id: 'b', name: 'B' }),
    ]);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe('b');
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it('detects removed agents', () => {
    const snapshot = makeProject([
      makeAgent({ id: 'a', name: 'A' }),
      makeAgent({ id: 'b', name: 'B' }),
    ]);
    const current = makeProject([makeAgent({ id: 'a', name: 'A' })]);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].id).toBe('b');
    expect(diff.added).toHaveLength(0);
  });

  it('detects changed agents', () => {
    const snapshot = makeProject([makeAgent({ id: 'a', name: 'A', role: 'old role' })]);
    const current = makeProject([makeAgent({ id: 'a', name: 'A', role: 'new role' })]);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].agentId).toBe('a');
    expect(diff.changed[0].changes).toContainEqual({
      field: 'role',
      from: 'old role',
      to: 'new role',
    });
  });

  it('detects added edges', () => {
    const edge: AgentEdge = { id: 'e1', source: 'a', target: 'b', type: 'pipeline' };
    const snapshot = makeProject([makeAgent({ id: 'a', name: 'A' }), makeAgent({ id: 'b', name: 'B' })], []);
    const current = makeProject([makeAgent({ id: 'a', name: 'A' }), makeAgent({ id: 'b', name: 'B' })], [edge]);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.edgesAdded).toHaveLength(1);
    expect(diff.edgesRemoved).toHaveLength(0);
  });

  it('detects removed edges', () => {
    const edge: AgentEdge = { id: 'e1', source: 'a', target: 'b', type: 'pipeline' };
    const snapshot = makeProject([makeAgent({ id: 'a', name: 'A' }), makeAgent({ id: 'b', name: 'B' })], [edge]);
    const current = makeProject([makeAgent({ id: 'a', name: 'A' }), makeAgent({ id: 'b', name: 'B' })], []);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.edgesRemoved).toHaveLength(1);
    expect(diff.edgesAdded).toHaveLength(0);
  });

  it('returns empty diff for identical projects', () => {
    const agents = [makeAgent({ id: 'a', name: 'A' })];
    const edges: AgentEdge[] = [{ id: 'e1', source: 'a', target: 'b', type: 'pipeline' }];
    const p = makeProject(agents, edges);
    const diff = diffSnapshots(p, p);
    expect(hasDiffChanges(diff)).toBe(false);
  });

  it('detects multiple changes in one agent', () => {
    const snapshot = makeProject([makeAgent({ id: 'a', name: 'A', role: 'r1', model: 'm1' })]);
    const current = makeProject([makeAgent({ id: 'a', name: 'A', role: 'r2', model: 'm2' })]);
    const diff = diffSnapshots(current, snapshot);
    expect(diff.changed[0].changes).toHaveLength(2);
  });
});

describe('hasDiffChanges', () => {
  it('returns false for empty diff', () => {
    expect(hasDiffChanges({ added: [], removed: [], changed: [], edgesAdded: [], edgesRemoved: [] })).toBe(false);
  });

  it('returns true for any change', () => {
    expect(hasDiffChanges({ added: [makeAgent({ id: 'a', name: 'A' })], removed: [], changed: [], edgesAdded: [], edgesRemoved: [] })).toBe(true);
  });
});
