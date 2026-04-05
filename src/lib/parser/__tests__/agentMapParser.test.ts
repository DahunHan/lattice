import { describe, it, expect } from 'vitest';
import { isAgentMap, parseAgentMap } from '../agentMapParser';

// ── CSV format (readyit-style AGENT_MAP.md) ──────────────────────────────────

const CSV_CONTENT = `Agent Name,Role,Primary Model,Skill File,Script,Status
Master_Agent,Pipeline Sequencer + Error Handler,Python script (no LLM),master-agent/SKILL.md,agents/master_agent.py,Active
Sourcing_Agent,Reddit Data Collection + Noise Filtering,claude-haiku-4-5 (Batch API),sourcing-agent/SKILL.md,agents/sourcing_agent.py,Active
Analysis_Agent,Sentiment Analysis + Gap Discovery,claude-haiku-4-5 (Batch API),analysis-agent/SKILL.md,agents/analysis_agent.py,Active
Verification_Agent,Fact-Checking via Web Search,gemini-2.5-pro (Google One AI Premium),verification-agent/SKILL.md,agents/verification_agent.py,Active
Publishing_Agent,Newsletter Drafting + CURVE A/B Subject Lines,claude-sonnet-4-5 (pay-per-token),publishing-agent/SKILL.md,agents/publishing_agent.py,Active
Pipeline_Health_Agent,ARCHIVED — merged into Quality Reviewer,N/A,N/A,agents/archive/pipeline_health_agent.py,Archived
Paused_Agent,Some paused task,claude-opus-4-5,N/A,N/A,Paused`;

// ── Markdown table format ────────────────────────────────────────────────────

const MD_TABLE_CONTENT = `# Agent Map

| Agent Name | Role | Model | Status |
|------------|------|-------|--------|
| Orchestrator | Pipeline sequencer | claude-sonnet-4-5 | Active |
| Worker | Data processing | claude-haiku-4-5 | Active |
`;

describe('parseAgentMap', () => {
  describe('CSV parsing', () => {
    it('parses all rows from valid CSV content', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      expect(agents).toHaveLength(7);
    });

    it('extracts agent names correctly', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      expect(agents[0].name).toBe('Master_Agent');
      expect(agents[1].name).toBe('Sourcing_Agent');
    });

    it('extracts roles correctly', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      expect(agents[0].role).toBe('Pipeline Sequencer + Error Handler');
    });

    it('generates slugified IDs', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      expect(agents[0].id).toBe('master_agent');
      expect(agents[1].id).toBe('sourcing_agent');
    });

    it('extracts skillFile and script fields', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      expect(agents[1].skillFile).toBe('sourcing-agent/SKILL.md');
      expect(agents[1].script).toBe('agents/sourcing_agent.py');
    });

    it('normalizes N/A skillFile to null', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      const archived = agents.find(a => a.name === 'Pipeline_Health_Agent')!;
      expect(archived.skillFile).toBeNull();
      // script is not N/A for this agent, so it retains its value
      expect(archived.script).toBe('agents/archive/pipeline_health_agent.py');
    });

    it('normalizes N/A script to null', () => {
      const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
      const paused = agents.find(a => a.name === 'Paused_Agent')!;
      expect(paused.script).toBeNull();
    });

    it('returns empty array for empty content', () => {
      expect(parseAgentMap('', 'AGENT_MAP.md')).toEqual([]);
    });

    it('returns empty array for header-only CSV', () => {
      const headerOnly = 'Agent Name,Role,Primary Model,Skill File,Script,Status';
      expect(parseAgentMap(headerOnly, 'AGENT_MAP.md')).toEqual([]);
    });
  });

  describe('markdown table parsing', () => {
    it('parses agents from a pipe-delimited markdown table', () => {
      const agents = parseAgentMap(MD_TABLE_CONTENT, 'agents.md');
      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('Orchestrator');
      expect(agents[1].name).toBe('Worker');
    });
  });
});

describe('isAgentMap', () => {
  it('identifies CSV format with Agent Name header', () => {
    expect(isAgentMap(CSV_CONTENT, 'AGENT_MAP.md')).toBe(true);
  });

  it('identifies markdown table format with agent columns', () => {
    expect(isAgentMap(MD_TABLE_CONTENT, 'agents.md')).toBe(true);
  });

  it('rejects README.md regardless of content', () => {
    expect(isAgentMap(CSV_CONTENT, 'README.md')).toBe(false);
  });

  it('rejects CHANGELOG files', () => {
    expect(isAgentMap(CSV_CONTENT, 'CHANGELOG.md')).toBe(false);
  });

  it('rejects plain markdown without agent table', () => {
    const plain = '# Hello\n\nSome regular markdown content.';
    expect(isAgentMap(plain, 'notes.md')).toBe(false);
  });
});

describe('model family classification', () => {
  it('classifies haiku models', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const sourcing = agents.find(a => a.name === 'Sourcing_Agent')!;
    expect(sourcing.modelFamily).toBe('haiku');
  });

  it('classifies sonnet models', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const publishing = agents.find(a => a.name === 'Publishing_Agent')!;
    expect(publishing.modelFamily).toBe('sonnet');
  });

  it('classifies opus models', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const paused = agents.find(a => a.name === 'Paused_Agent')!;
    expect(paused.modelFamily).toBe('opus');
  });

  it('classifies gemini models', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const verification = agents.find(a => a.name === 'Verification_Agent')!;
    expect(verification.modelFamily).toBe('gemini');
  });

  it('classifies python/no-LLM as python family', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const master = agents.find(a => a.name === 'Master_Agent')!;
    expect(master.modelFamily).toBe('python');
  });

  it('classifies N/A model as python family', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const archived = agents.find(a => a.name === 'Pipeline_Health_Agent')!;
    expect(archived.modelFamily).toBe('python');
  });
});

describe('orchestrator detection', () => {
  it('detects orchestrator from role containing "sequencer"', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const master = agents.find(a => a.name === 'Master_Agent')!;
    expect(master.isOrchestrator).toBe(true);
    expect(master.roleType).toBe('orchestrator');
  });

  it('does not flag non-orchestrator agents', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const sourcing = agents.find(a => a.name === 'Sourcing_Agent')!;
    expect(sourcing.isOrchestrator).toBe(false);
  });

  it('detects orchestrator from role containing "orchestrator"', () => {
    const csv = `Agent Name,Role,Primary Model,Skill File,Script,Status
TestOrch,Main Orchestrator,claude-sonnet-4-5,N/A,N/A,Active`;
    const agents = parseAgentMap(csv, 'map.md');
    expect(agents[0].isOrchestrator).toBe(true);
  });
});

describe('status parsing', () => {
  it('parses Active status', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    expect(agents[0].status).toBe('active');
  });

  it('parses Archived status', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const archived = agents.find(a => a.name === 'Pipeline_Health_Agent')!;
    expect(archived.status).toBe('archived');
  });

  it('parses Paused status', () => {
    const agents = parseAgentMap(CSV_CONTENT, 'AGENT_MAP.md');
    const paused = agents.find(a => a.name === 'Paused_Agent')!;
    expect(paused.status).toBe('paused');
  });
});
