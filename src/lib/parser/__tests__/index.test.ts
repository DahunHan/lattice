import { describe, it, expect } from 'vitest';
import { parseProject } from '../index';
import type { RawFile } from '../index';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CLAUDE_MD: RawFile = {
  name: 'CLAUDE.md',
  content: `# Lattice — Agent Workflow Visualizer

## 1. Goal
Open-source Next.js dashboard that auto-reads project folders and renders interactive visualization of agent workflows.

## 2. Orchestration
Built by a 5-agent harness:

| Agent | Role |
|-------|------|
| architect | Component structure |
| frontend-dev | React components |

Workflow: Architect -> Frontend Dev -> (Design Reviewer + Code Reviewer in parallel) -> QA Tester

## 3. Technical Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict)
`,
  path: 'CLAUDE.md',
};

const ARCHITECT_AGENT: RawFile = {
  name: 'architect.md',
  content: `---
name: architect
description: "System Architect. Defines component structure, data models, API contracts."
---

# Architect — System & Component Architecture

You are the system architect for Lattice.

## Core Responsibilities
1. **Component Architecture**: Define React component tree.
2. **Data Model Design**: TypeScript types for agents, edges, pipelines.
`,
  path: '.claude/agents/architect.md',
};

const FRONTEND_DEV_AGENT: RawFile = {
  name: 'frontend-dev.md',
  content: `---
name: frontend-dev
description: "Frontend developer. Implements React components with Tailwind CSS."
---

# Frontend Dev

You are the frontend developer. Your job is to build pixel-perfect components.
`,
  path: '.claude/agents/frontend-dev.md',
};

const DESIGN_REVIEWER_AGENT: RawFile = {
  name: 'design-reviewer.md',
  content: `---
name: design-reviewer
description: "Design quality reviewer."
---

# Design Reviewer

You are the design reviewer. Your role is to review visual quality.
`,
  path: '.claude/agents/design-reviewer.md',
};

const CODE_REVIEWER_AGENT: RawFile = {
  name: 'code-reviewer.md',
  content: `---
name: code-reviewer
description: "Code quality reviewer."
---

# Code Reviewer

You are the code reviewer. Your role is to review code quality and security.
`,
  path: '.claude/agents/code-reviewer.md',
};

const QA_TESTER_AGENT: RawFile = {
  name: 'qa-tester.md',
  content: `---
name: qa-tester
description: "QA tester. Validates parsing and edge cases."
---

# QA Tester

You are the QA tester. Your role is to test everything thoroughly.
`,
  path: '.claude/agents/qa-tester.md',
};

const WORKSPACE_FILE: RawFile = {
  name: 'spec.md',
  content: `# Architecture Spec
## Phase 1
Some workspace artifact that should be ignored.
`,
  path: '_workspace/architecture/spec.md',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parseProject', () => {
  it('returns empty project for empty files array', () => {
    const result = parseProject([]);
    expect(result.agents).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.pipeline).toEqual([]);
    expect(result.rawFiles).toEqual([]);
  });

  it('extracts metadata from a single CLAUDE.md', () => {
    const result = parseProject([CLAUDE_MD]);
    expect(result.metadata.name).toBe('Lattice');
    expect(result.metadata.goal).toContain('Next.js dashboard');
  });

  it('extracts description from CLAUDE.md', () => {
    const result = parseProject([CLAUDE_MD]);
    expect(result.metadata.description).toBeTruthy();
  });

  it('records CLAUDE.md as a parsed file with type claude-md', () => {
    const result = parseProject([CLAUDE_MD]);
    expect(result.rawFiles).toContainEqual(
      expect.objectContaining({ filename: 'CLAUDE.md', type: 'claude-md' }),
    );
  });

  describe('Lattice-style project (.claude/agents + CLAUDE.md)', () => {
    const allFiles = [
      CLAUDE_MD,
      ARCHITECT_AGENT,
      FRONTEND_DEV_AGENT,
      DESIGN_REVIEWER_AGENT,
      CODE_REVIEWER_AGENT,
      QA_TESTER_AGENT,
    ];

    it('discovers all agents from .claude/agents/ files', () => {
      const result = parseProject(allFiles);
      expect(result.agents.length).toBeGreaterThanOrEqual(5);

      const agentIds = result.agents.map(a => a.id);
      expect(agentIds).toContain('architect');
      expect(agentIds).toContain('frontend_dev');
      expect(agentIds).toContain('design_reviewer');
      expect(agentIds).toContain('code_reviewer');
      expect(agentIds).toContain('qa_tester');
    });

    it('extracts workflow edges from CLAUDE.md orchestration section', () => {
      const result = parseProject(allFiles);
      // architect -> frontend_dev
      expect(result.edges).toContainEqual(
        expect.objectContaining({ source: 'architect', target: 'frontend_dev', type: 'pipeline' }),
      );
    });

    it('extracts parallel edges correctly', () => {
      const result = parseProject(allFiles);
      // frontend_dev fans out to both reviewers
      expect(result.edges).toContainEqual(
        expect.objectContaining({ source: 'frontend_dev', target: 'design_reviewer' }),
      );
      expect(result.edges).toContainEqual(
        expect.objectContaining({ source: 'frontend_dev', target: 'code_reviewer' }),
      );
      // both reviewers converge to qa_tester
      expect(result.edges).toContainEqual(
        expect.objectContaining({ source: 'design_reviewer', target: 'qa_tester' }),
      );
      expect(result.edges).toContainEqual(
        expect.objectContaining({ source: 'code_reviewer', target: 'qa_tester' }),
      );
    });

    it('sets agent descriptions from frontmatter', () => {
      const result = parseProject(allFiles);
      const architect = result.agents.find(a => a.id === 'architect')!;
      expect(architect.description).toContain('System Architect');
    });

    it('sets agent instructions from markdown body', () => {
      const result = parseProject(allFiles);
      const architect = result.agents.find(a => a.id === 'architect')!;
      expect(architect.instructions).toContain('You are the system architect');
    });
  });

  describe('_workspace filtering', () => {
    it('filters out files in _workspace directories', () => {
      const result = parseProject([CLAUDE_MD, WORKSPACE_FILE]);
      const paths = result.rawFiles.map(f => f.path);
      expect(paths).not.toContain('_workspace/architecture/spec.md');
    });

    it('does not create agents from _workspace files', () => {
      const result = parseProject([WORKSPACE_FILE]);
      expect(result.agents).toEqual([]);
    });
  });

  describe('file type classification', () => {
    it('classifies .claude/agents files as claude-agent type', () => {
      const result = parseProject([ARCHITECT_AGENT]);
      expect(result.rawFiles).toContainEqual(
        expect.objectContaining({ filename: 'architect.md', type: 'claude-agent' }),
      );
    });
  });
});
