# Agent Map

## Agents

```csv
Agent Name,Role,Primary Model,Skill File,Script,Status
Orchestrator,Pipeline orchestrator and scheduler,claude-sonnet-4-6,.claude/agents/orchestrator.md,agents/orchestrator.py,active
Researcher,Gathers sources from RSS feeds and trending APIs,claude-haiku-4-5,.claude/agents/researcher.md,agents/researcher.py,active
Writer,Drafts blog posts from research briefs,claude-sonnet-4-5,.claude/agents/writer.md,agents/writer.py,active
Editor,Reviews drafts for style and clarity,claude-sonnet-4-5,.claude/agents/editor.md,agents/editor.py,active
Fact_Checker,Verifies claims via web search and citation lookup,gemini-2.5-pro,.claude/agents/fact_checker.md,agents/fact_checker.py,active
Publisher,Posts finalized articles to Ghost CMS,none,n/a,agents/publisher.py,active
SEO_Optimizer,Keyword density and meta-tag generation,claude-haiku-4-5,.claude/agents/seo_optimizer.md,agents/seo_optimizer.py,archived
```

### Notes
- **SEO_Optimizer** was merged into Writer (v2.1, 2026-03-15). Its keyword injection and meta-tag logic now runs as a sub-step inside the Writer agent. Kept here for audit trail.
- **Publisher** is a pure Python script with no LLM dependency. It authenticates via Ghost Admin API JWT and handles image uploads, slug generation, and scheduling.
- **Fact_Checker** uses Gemini 2.5 Pro for its large context window and grounding with Google Search.
