# System Architecture — ContentBot

## 1. Team

| Role | Agent | Model | Supervision |
|------|-------|-------|-------------|
| Pipeline Coordinator | Orchestrator | claude-sonnet-4-6 | Autonomous — starts pipeline, handles retries, logs results |
| Source Collector | Researcher | claude-haiku-4-5 | Autonomous — reads RSS, filters relevance, outputs research briefs |
| Content Drafter | Writer | claude-sonnet-4-5 | Semi-autonomous — drafts are scored by Editor before proceeding |
| Style Reviewer | Editor | claude-sonnet-4-5 | Gate — scores 1-10, blocks drafts below 7 |
| Claim Verifier | Fact_Checker | gemini-2.5-pro | Gate — flags unverifiable claims for human review |
| CMS Deployer | Publisher | Python script | Autonomous — publishes only after both gates pass |

## 2. Daily Pipeline

### Phase 1: Initialization
- **Agent:** Orchestrator (`agents/orchestrator.py`)
- **Action:** Reads topic queue from `data/topics.json`, selects top 3 topics by trending score, creates job records in SQLite.
- **Output:** `pipeline_state.json` with status `initialized`, topic list attached.

### Phase 2: Research
- **Agent:** Researcher (`agents/researcher.py`)
- **Action:** For each topic, queries RSS feeds (Feedly API), Hacker News, and Google Trends. Filters for recency (< 48 hours) and relevance (cosine similarity > 0.7). Assembles research briefs with 5-10 source URLs, key quotes, and summary.
- **Output:** `data/briefs/{topic_slug}.json` — one brief per topic.
- **Data flow:** Orchestrator passes topic list -> Researcher returns brief file paths.

### Phase 3: Drafting
- **Agent:** Writer (`agents/writer.py`)
- **Action:** Reads each research brief and generates an 800-1500 word blog post. Includes SEO keywords (merged from former SEO_Optimizer), generates meta description, selects header image prompt for DALL-E.
- **Output:** `data/drafts/{topic_slug}.md` — markdown draft with frontmatter.
- **Data flow:** Researcher brief paths -> Writer reads briefs -> outputs draft paths.

### Phase 4a: Style Review (parallel)
- **Agent:** Editor (`agents/editor.py`)
- **Action:** Scores each draft on clarity (1-10), tone consistency (1-10), and structure (1-10). Composite score must be >= 7. If below, returns inline edit suggestions and triggers a rewrite (max 2 retries via Writer).
- **Output:** `data/reviews/{topic_slug}_edit.json` — scores and suggestions.
- **Data flow:** Writer draft paths -> Editor reads drafts -> outputs review results.

### Phase 4b: Fact Verification (parallel with 4a)
- **Agent:** Fact_Checker (`agents/fact_checker.py`)
- **Action:** Extracts all factual claims from draft. For each claim, runs Google Search grounding via Gemini API. Requires >= 2 corroborating sources per claim. Flags unverifiable claims and calculates a confidence score.
- **Output:** `data/reviews/{topic_slug}_facts.json` — claim list with verification status.
- **Data flow:** Writer draft paths -> Fact_Checker reads drafts -> outputs verification results.

### Phase 5: Gate Decision
- **Agent:** Orchestrator (`agents/orchestrator.py`)
- **Action:** Reads Editor scores and Fact_Checker results. Articles pass only if: Editor composite >= 7 AND all claims verified (or manually approved). Failed articles are queued to `#content-review` Slack channel.
- **Output:** Updates `pipeline_state.json` with per-article pass/fail status.
- **Data flow:** Editor + Fact_Checker results -> Orchestrator decides -> passes approved article list to Publisher.

### Phase 6: Publish
- **Agent:** Publisher (`agents/publisher.py`)
- **Action:** For each approved article, generates Ghost API JWT, uploads header image, creates post via Admin API with scheduled publish time (staggered 2 hours apart). Updates article history in SQLite.
- **Output:** `data/published/{topic_slug}.json` — Ghost post ID, URL, publish timestamp.
- **Data flow:** Orchestrator approved list -> Publisher reads final drafts -> posts to Ghost CMS.

## 3. Error Handling

- **Retry policy:** Each agent retries up to 2 times on transient failures (API timeouts, rate limits).
- **Circuit breaker:** If any agent fails 3 consecutive runs across days, the pipeline halts and alerts `#content-ops`.
- **Dead letter queue:** Failed articles are logged to `data/failed/` with full context for manual reprocessing.
