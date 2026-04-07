import { describe, it, expect } from 'vitest';
import {
  isClaudeAgentFile,
  parseClaudeAgentFile,
  parseOrchestrationTable,
} from '../claudeAgentsParser';
import type { Agent } from '../../types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ARCHITECT_MD = `---
name: architect
description: "System Architect. Defines component structure, data models, API contracts, and layout algorithms."
---

# Architect — System & Component Architecture

You are the system architect for Lattice, an open-source Next.js dashboard that visualizes agent workflows.

## Core Responsibilities

1. **Component Architecture**: Define React component tree, props interfaces, and data flow.
2. **Data Model Design**: TypeScript types for agents, edges, pipelines, graph state.
`;

const NO_FRONTMATTER_MD = `# Frontend Dev

You are the frontend developer. Your job is to implement React components.

## Core Responsibilities

Build pixel-perfect components with Tailwind CSS.
`;

function makeAgent(id: string, name: string): Agent {
  return {
    id,
    name,
    role: '',
    roleType: 'custom',
    model: '',
    modelFamily: 'unknown',
    status: 'active',
    isOrchestrator: false,
    skillFile: null,
    script: null,
    description: null,
    instructions: null,
    phase: null,
    schedule: null,
    tags: [],
  };
}

// ── isClaudeAgentFile ────────────────────────────────────────────────────────

describe('isClaudeAgentFile', () => {
  it('detects .claude/agents/*.md paths', () => {
    expect(isClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md')).toBe(true);
  });

  it('detects Windows-style .claude/agents paths', () => {
    expect(isClaudeAgentFile(ARCHITECT_MD, '.claude\\agents\\architect.md')).toBe(true);
  });

  it('detects nested .claude/agents paths', () => {
    expect(isClaudeAgentFile(ARCHITECT_MD, 'project/.claude/agents/architect.md')).toBe(true);
  });

  it('rejects .agents/skills/*/SKILL.md paths', () => {
    const skillContent = `---
name: sourcing
description: "Collects data"
---

## Input
Source configuration

## Output
Collected data
`;
    expect(isClaudeAgentFile(skillContent, '.agents/skills/sourcing-agent/SKILL.md')).toBe(false);
  });

  it('rejects paths containing /skills/', () => {
    expect(isClaudeAgentFile(ARCHITECT_MD, 'project/skills/architect.md')).toBe(false);
  });

  it('rejects files ending with skill.md regardless of path', () => {
    expect(isClaudeAgentFile(ARCHITECT_MD, 'some/path/SKILL.md')).toBe(false);
  });

  it('falls back to content-based detection for non-standard paths', () => {
    // Has frontmatter with name+description AND agent identity language
    const agentContent = `---
name: tester
description: "QA Tester agent"
---

You are the QA tester. Your role is to validate everything.
`;
    expect(isClaudeAgentFile(agentContent, 'custom/path/tester.md')).toBe(true);
  });

  it('rejects content that looks like a skill file even with agent-like frontmatter', () => {
    const skillLike = `---
name: processor
description: "Data processor"
---

You are the data processor. Your job is to transform input.

## Input
Raw data

## Output
Processed data
`;
    expect(isClaudeAgentFile(skillLike, 'random/processor.md')).toBe(false);
  });
});

// ── parseClaudeAgentFile ─────────────────────────────────────────────────────

describe('parseClaudeAgentFile', () => {
  it('extracts name from frontmatter', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.name).toBe('Architect');
    expect(agent.id).toBe('architect');
  });

  it('extracts description from frontmatter', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.description).toContain('System Architect');
  });

  it('extracts role from first heading subtitle', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.role).toContain('System & Component Architecture');
  });

  it('falls back to filename when no frontmatter name', () => {
    const agent = parseClaudeAgentFile(NO_FRONTMATTER_MD, '.claude/agents/frontend-dev.md');
    expect(agent.name).toBe('Frontend_Dev');
    expect(agent.id).toBe('frontend_dev');
  });

  it('extracts instructions from body after frontmatter', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.instructions).toContain('You are the system architect');
    expect(agent.instructions).not.toContain('---');
  });

  it('sets status to active', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.status).toBe('active');
  });

  it('extracts tags from content', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.tags).toContain('architecture');
    expect(agent.tags).toContain('design');
  });

  it('detects executor role type for architect', () => {
    const agent = parseClaudeAgentFile(ARCHITECT_MD, '.claude/agents/architect.md');
    expect(agent.roleType).toBe('executor');
  });
});

// ── parseOrchestrationTable — workflow edge extraction ────────────────────────

describe('parseOrchestrationTable', () => {
  const agents = [
    makeAgent('architect', 'Architect'),
    makeAgent('frontend_dev', 'Frontend Dev'),
    makeAgent('design_reviewer', 'Design Reviewer'),
    makeAgent('code_reviewer', 'Code Reviewer'),
    makeAgent('qa_tester', 'QA Tester'),
  ];

  const CLAUDE_MD_WITH_WORKFLOW = `# Lattice

## Orchestration
Built by a 5-agent harness:

| Agent | Role |
|-------|------|
| architect | Component structure |
| frontend-dev | React components |

Workflow: Architect -> Frontend Dev -> (Design Reviewer + Code Reviewer in parallel) -> QA Tester
`;

  it('extracts sequential edges from workflow pattern', () => {
    const edges = parseOrchestrationTable(CLAUDE_MD_WITH_WORKFLOW, agents);
    // architect -> frontend_dev
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'architect', target: 'frontend_dev', type: 'pipeline' }),
    );
  });

  it('extracts edges from parallel group to next step', () => {
    const edges = parseOrchestrationTable(CLAUDE_MD_WITH_WORKFLOW, agents);
    // design_reviewer -> qa_tester
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'design_reviewer', target: 'qa_tester', type: 'pipeline' }),
    );
    // code_reviewer -> qa_tester
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'code_reviewer', target: 'qa_tester', type: 'pipeline' }),
    );
  });

  it('extracts edges from previous step to parallel group', () => {
    const edges = parseOrchestrationTable(CLAUDE_MD_WITH_WORKFLOW, agents);
    // frontend_dev -> design_reviewer
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'frontend_dev', target: 'design_reviewer', type: 'pipeline' }),
    );
    // frontend_dev -> code_reviewer
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'frontend_dev', target: 'code_reviewer', type: 'pipeline' }),
    );
  });

  it('strips "in parallel" qualifier from agent names', () => {
    const edges = parseOrchestrationTable(CLAUDE_MD_WITH_WORKFLOW, agents);
    // If "in parallel" were not stripped, the names would fail to resolve
    // We verify by checking the parallel agents were found at all
    const parallelSources = edges
      .filter(e => e.target === 'qa_tester')
      .map(e => e.source);
    expect(parallelSources).toContain('design_reviewer');
    expect(parallelSources).toContain('code_reviewer');
  });

  it('sets animated flag on pipeline edges', () => {
    const edges = parseOrchestrationTable(CLAUDE_MD_WITH_WORKFLOW, agents);
    for (const edge of edges) {
      expect(edge.animated).toBe(true);
    }
  });

  it('returns empty array when no orchestration section exists', () => {
    const noOrch = '# Project\n\nJust a regular project file.';
    const edges = parseOrchestrationTable(noOrch, agents);
    expect(edges).toEqual([]);
  });
});
