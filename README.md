# HailMary

**See your agents. Understand the flow.**

HailMary is an open-source dashboard that automatically visualizes agent workflows from your project files. Point it at a folder or drop your markdown files — it reads your agent definitions, maps the relationships, and renders an interactive graph.

## The Problem

You're building with multiple AI agents — sourcing, analysis, verification, publishing, quality review. The project grows. Agents multiply. Data flows between them through files and APIs. Eventually the system is too complex to hold in your head, and the only way to understand it is to read every file.

HailMary solves this by **auto-reading your project** and **drawing the workflow for you**.

## How It Works

1. **Scan** — Point HailMary at your project folder, or drag-and-drop `.md` files
2. **Parse** — It detects agents from `AGENT_MAP.md`, `.claude/agents/*.md`, `SKILL.md` files, and even unstructured markdown
3. **Visualize** — An interactive node graph shows every agent, their model, role, pipeline order, and connections
4. **Monitor** — Toggle live monitoring to see which agent is running right now, with real-time log streaming

## What It Detects

| Source | What's Extracted |
|--------|-----------------|
| `AGENT_MAP.md` | Agent names, roles, models, scripts, status (CSV or markdown table) |
| `.claude/agents/*.md` | Claude Code harness agent definitions with frontmatter |
| `SYSTEM-ARCHITECTURE.MD` | Pipeline phases, execution order, data flow edges |
| `CLAUDE.md` | Project name, goal, orchestration relationships |
| `.agents/skills/*/SKILL.md` | Agent descriptions and full instruction sets |
| Any `.md` file | Heuristic detection of agents and relationships |

## Live Monitoring (Tier 1)

If your project writes pipeline logs to a `logs/` directory (like `pipeline_YYYYMMDD.log`), HailMary can poll those files and show real-time status:

- Which agent is currently running (pulsing glow)
- Which agents completed successfully (green indicator)
- Which agents failed (red indicator)
- Execution duration per agent
- Streaming log viewer with expandable timeline

**Zero config needed** — if your project writes structured logs, monitoring just works.

## Quick Start

```bash
git clone https://github.com/your-username/hailmary.git
cd hailmary
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and either:
- **Drag & drop** your project's `.md` files onto the landing page
- **Enter a folder path** and click Scan

## Tech Stack

- **Next.js 14+** (App Router)
- **React Flow** (@xyflow/react) — interactive node graph
- **Tailwind CSS** — dark theme with glassmorphism
- **Framer Motion** — smooth animations
- **Dagre** — automatic hierarchical layout
- **Zustand** — lightweight state management
- **TypeScript** — strict mode throughout

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
    api/scan/             # POST: scan a folder for .md files
    api/status/           # POST: poll pipeline log status
    graph/                # Interactive graph visualization page
  components/
    graph/nodes/          # Custom React Flow nodes (Agent, Orchestrator)
    graph/edges/          # Custom edges (Pipeline, Supervision, DataFlow)
    panels/               # Detail panel, project overview, legend, live timeline
  lib/
    parser/               # 7 parsers: agentMap, architecture, claude, claudeAgents, skill, heuristic, markdownUtils
    graph/                # Graph builder + dagre layout engine
    theme/                # Color palette and model-family theming
  store/                  # Zustand state management
  hooks/                  # useAgentStatus polling hook
```

## Roadmap

- [ ] **Phase 1** (current): One-way visualization — read project, draw dashboard
- [ ] **Phase 2**: Bidirectional editing — add/modify agents from the dashboard
- [ ] **Tier 2 monitoring**: Webhook-based real-time events (sub-second updates)
- [ ] **Tier 3 monitoring**: Direct integration with Claude Code harness task state
- [ ] Export graph as PNG/SVG for documentation
- [ ] Shareable read-only URLs

## Built With a Harness

HailMary itself is built using a 5-agent development harness:

| Agent | Role |
|-------|------|
| Architect | Component structure, data models, API design |
| Frontend Dev | React components, styling, animations |
| Design Reviewer | Visual quality gate (>= 7/10 to ship) |
| Code Reviewer | TypeScript correctness, performance, security |
| QA Tester | Parser validation, edge cases, cross-reference |

You can scan HailMary's own folder to see this harness visualized.

## License

MIT
