# ContentBot — Automated Blog Pipeline

## 1. Goal
AI-powered content pipeline that auto-generates, edits, fact-checks, and publishes blog posts to a Ghost CMS instance. Runs daily at 10:00 UTC, producing 3 high-quality articles per cycle from curated RSS feeds and trending topic signals.

## 2. Orchestration
Built by a 6-agent harness:

| Agent | Role | Model |
|-------|------|-------|
| Orchestrator | Pipeline coordinator, scheduling, error recovery | claude-sonnet-4-6 |
| Researcher | Gathers sources from RSS feeds and trending APIs | claude-haiku-4-5 |
| Writer | Drafts long-form blog posts from research briefs | claude-sonnet-4-5 |
| Editor | Reviews drafts for style, clarity, and tone | claude-sonnet-4-5 |
| Fact_Checker | Verifies factual claims via web search and citations | gemini-2.5-pro |
| Publisher | Posts finalized articles to Ghost CMS via API | Python script (no LLM) |

Workflow: `Orchestrator -> Researcher -> Writer -> (Editor + Fact_Checker in parallel) -> Publisher`

## 3. Technical Stack
- **Runtime:** Python 3.12
- **Orchestration:** Custom DAG runner (`pipeline/runner.py`)
- **LLM calls:** Anthropic SDK, Google Generative AI SDK
- **CMS:** Ghost Admin API v5
- **Data:** SQLite for article history, Redis for job queue
- **Monitoring:** Structured JSON logs, Prometheus metrics

## 4. Pipeline Rules
- Researcher must return at least 5 sources per topic or the topic is skipped.
- Writer drafts must be 800-1500 words. Shorter drafts are sent back for expansion.
- Editor scores each draft 1-10; anything below 7 triggers a rewrite loop (max 2 retries).
- Fact_Checker flags claims with < 2 corroborating sources; flagged articles are held for human review.
- Publisher only runs after both Editor and Fact_Checker pass. No partial publishes.

## 5. Supervision
- **Human-in-the-loop:** Flagged articles queue to Slack channel `#content-review`.
- **Rate limits:** Max 3 articles/day, max 10 LLM calls per agent per run.
- **Rollback:** Published articles can be unpublished via `pipeline/rollback.py <article_id>`.
