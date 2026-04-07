# HailMary

**See your agents. Understand the flow. Don't lose track.**

HailMary is an open-source dashboard that automatically visualizes agent workflows from your project files. Point it at a folder or drop your markdown files — it reads your agent definitions, maps the relationships, and renders an interactive graph. Zero config required.

<!-- Add a screenshot of the graph view here -->
<!-- ![HailMary Dashboard](docs/screenshot-graph.png) -->

---

## The Problem

You're building with multiple AI agents — sourcing, analysis, verification, publishing, quality review. The project grows. Agents multiply. Data flows between them through files and APIs. Eventually the system is too complex to hold in your head, and the only way to understand it is to read every file.

HailMary solves this by **auto-reading your project** and **drawing the workflow for you**.

## How It Works

```
Your project folder          HailMary
                              
  AGENT_MAP.md ──────┐        ┌──────────────────────┐
  .claude/agents/ ───┤        │                      │
  CLAUDE.md ─────────┼──────> │  7 parsers with      │ ────> Interactive
  SYSTEM-ARCH.md ────┤        │  heuristic fallback  │       node graph
  SKILL.md ──────────┤        │                      │
  Any .md ───────────┘        └──────────────────────┘
```

1. **Scan** — Point HailMary at your project folder, or drag-and-drop `.md` files
2. **Parse** — 7 specialized parsers detect agents from structured and unstructured markdown
3. **Visualize** — An interactive node graph shows every agent, their model, role, pipeline order, and connections
4. **Monitor** — Toggle live monitoring to see which agent is running, with real-time log streaming

## What It Detects

| Source | What's Extracted |
|--------|-----------------|
| `AGENT_MAP.md` | Agent names, roles, models, scripts, status (CSV or markdown table) |
| `.claude/agents/*.md` | Claude Code harness agent definitions with frontmatter |
| `SYSTEM-ARCHITECTURE.md` | Pipeline phases, execution order, data flow edges |
| `CLAUDE.md` | Project name, goal, orchestration relationships |
| `.agents/skills/*/SKILL.md` | Agent descriptions and full instruction sets |
| `agents.yaml` / `tasks.yaml` | **CrewAI** agent configs, task dependencies, process type |
| `*.py` (CrewAI) | `@CrewBase` crews, `Process.sequential` / `.hierarchical` |
| `*.py` (LangGraph) | `StateGraph` nodes, `add_edge`, conditional routing |
| `*.py` (AutoGen) | `AssistantAgent`, `GroupChat` transitions, `Swarm` handoffs |
| `*.py` (OpenAI Agents) | `Agent` definitions, `handoffs` graphs |
| `langgraph.json` | LangGraph project config |
| Any `.md` file | Heuristic detection of agents and relationships |

## Features

### Interactive Graph
- Hierarchical layout with Dagre — orchestrators on top, pipeline flows left-to-right
- Custom nodes colored by model family (Haiku, Sonnet, Opus, Python)
- Three edge types: pipeline flow (solid blue), supervision (dashed orange), data flow (gray)
- Click any agent to open a detail panel with role, model, script, connections, and instructions
- Search and filter agents in real-time

### Live Monitoring
- Polls pipeline logs for real-time agent status
- Pulsing glow on running agents, green/red indicators for success/failure
- Timeline bar with progress, duration tracking, and streaming log viewer
- Zero config — if your project writes structured logs to `logs/`, monitoring just works

### Persistence
- Projects are saved to localStorage — refresh the page, your graph is still there
- "Continue with [project]" quick-load on the landing page
- UI state (archived toggle, paused agents, monitoring) persists across sessions

### Error Recovery
- Each parser is individually wrapped — one malformed file won't crash the whole scan
- Parse warnings shown as a dismissible banner with detailed warning count
- Graceful degradation: partial results are always returned

### Export
- **JSON** — Full project data (agents, edges, metadata) for programmatic use
- **Mermaid** — Diagram syntax that renders in GitHub, Notion, mermaid.live
- **PNG** — High-res screenshot of the graph with dark background
- **SVG** — Vector image for docs, presentations, print

### Snapshot Diff
- Save snapshots of your agent architecture at any point
- Compare current state against any saved snapshot
- Visual diff badges on nodes: NEW (green), MOD (amber), DEL (red)
- Summary panel shows added/removed/changed agents and edges
- Snapshots persist across sessions

### CLI Distribution
- `npx hailmary` — zero-install local server
- `npx hailmary ./my-project` — auto-scan a folder on startup
- `npx hailmary -p 4000` — custom port
- Standalone build with automatic browser open
- Port-in-use detection with helpful suggestions

### Security (Local-First)
- No data leaves your machine — no external APIs, no telemetry
- Server binds to `127.0.0.1` only — no network exposure
- Origin header validation on all API endpoints (CSRF protection)
- Symlink validation prevents path traversal
- Sensitive directory blocking (`.ssh`, `.aws`, `.config`, system dirs)
- File size limits (1MB per file, 200 files max)

## Quick Start

```bash
git clone https://github.com/your-username/hailmary.git
cd hailmary/HailMary
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and either:
- **Drag & drop** your project's `.md` files onto the landing page
- **Enter a folder path** and click Scan

### CLI (recommended)

```bash
npx hailmary                    # Start dashboard
npx hailmary ./my-project       # Auto-scan a folder
npx hailmary -p 4000            # Custom port
```

### Try the Example

HailMary ships with a sample harness in `examples/sample-harness/`. Scan that folder to see a 6-agent pipeline with orchestrator supervision, pipeline phases, and log-based monitoring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Graph | React Flow (@xyflow/react) |
| Layout | Dagre (@dagrejs/dagre) |
| State | Zustand (with persist middleware) |
| Animation | Framer Motion |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict mode) |
| Testing | Vitest (88 tests) |

## Project Structure

```
src/
  app/                          # Next.js pages and API routes
    api/scan/                   #   POST: scan a folder for .md files
    api/status/                 #   POST: poll pipeline log status
    graph/                      #   Interactive graph visualization page
  components/
    graph/
      nodes/                    #   AgentNode, OrchestratorNode
      edges/                    #   PipelineEdge, SupervisionEdge, DataFlowEdge
      FlowCanvas.tsx            #   React Flow wrapper
    panels/                     #   AgentDetailPanel, ProjectOverview, Legend, LiveTimeline
  lib/
    parser/                     # 7 parsers + orchestrator
      agentMapParser.ts         #   CSV and markdown table parsing
      architectureParser.ts     #   Pipeline phases and edge detection
      claudeAgentsParser.ts     #   .claude/agents/*.md with frontmatter
      claudeParser.ts           #   CLAUDE.md metadata extraction
      skillParser.ts            #   SKILL.md instruction parsing
      crewaiParser.ts           #   CrewAI agents.yaml, tasks.yaml, crew.py
      langgraphParser.ts        #   LangGraph StateGraph nodes and edges
      autogenParser.ts          #   AutoGen agents, GroupChat, Swarm
      openaiAgentsParser.ts     #   OpenAI Agents SDK definitions and handoffs
      heuristicParser.ts        #   Fallback: bold names, arrow patterns, verbal cues
      markdownUtils.ts          #   Shared: frontmatter, table, CSV utilities
      index.ts                  #   Orchestrator: priority-based parsing with error recovery
    graph/
      buildGraph.ts             #   Filters + transforms agents into React Flow nodes/edges
      layoutEngine.ts           #   Dagre hierarchical layout computation
    theme/colors.ts             #   Model-family color palette
    export/exportGraph.ts       #   JSON, Mermaid, PNG, SVG export
    snapshot/
      snapshotTypes.ts          #   Snapshot and DiffResult types
      diffEngine.ts             #   Compare snapshots, produce structured diffs
    types.ts                    #   Full TypeScript type definitions
  store/useProjectStore.ts      # Zustand store with localStorage persistence
  hooks/useAgentStatus.ts       # Live monitoring polling hook
```

## Design

Dark theme with glassmorphism. Information density over whitespace — this is a developer tool, not a marketing site.

| Element | Color |
|---------|-------|
| Background | `#0A0A1B` |
| Surface | `#12122A` |
| Border | `#1E1E3A` |
| Text | `#E0E0F0` |
| Accent | `#F5A623` (orange) |
| Haiku | `#4A9EE0` (blue) |
| Sonnet | `#2ECC71` (green) |
| Opus | `#9B59B6` (purple) |

## Current Status: Phase 1 Complete

Phase 1 (one-way visualization) is fully built and functional:

- [x] File upload and folder scanning
- [x] Multi-format parsing (11 parsers + heuristic fallback)
- [x] Interactive graph visualization with React Flow
- [x] Agent detail panel with full information
- [x] Search, filter, and archived agent toggle
- [x] Live monitoring with log polling
- [x] Persistence across page refreshes
- [x] Parser error recovery with warnings
- [x] Onboarding hints for new users
- [x] Security: symlink validation, directory blocking, file size limits

## Roadmap

### Phase 2: From Map to Dashboard
- [x] Framework plugins — CrewAI, LangGraph, AutoGen, OpenAI Agents SDK
- [x] Snapshot diff — save snapshots, compare, visual diff badges on nodes
- [x] Export — PNG, SVG, JSON, Mermaid diagram
- [x] CLI distribution — `npx hailmary` with auto-scan, standalone build
- [ ] File watcher — sub-second monitoring updates via fs.watch

### Phase 3: Agent IDE Companion
- [ ] Bidirectional editing — add/modify agents from the dashboard, writes back to files
- [ ] Execution replay — record and step through full pipeline runs
- [ ] Cost tracking — token usage and cost-per-agent from logs
- [ ] VS Code / Cursor extension — side panel graph while you code
- [ ] Tauri desktop app — native experience with system tray

## Built With a Harness

HailMary itself is built using a 5-agent development harness:

| Agent | Role |
|-------|------|
| Architect | Component structure, data models, API design |
| Frontend Dev | React components, styling, animations |
| Design Reviewer | Visual quality gate (>= 7/10 to ship) |
| Code Reviewer | TypeScript correctness, performance, security |
| QA Tester | Parser validation, edge cases, cross-reference |

Scan HailMary's own folder to see this harness visualized.

## License

MIT

## Contributing

HailMary is open source and welcomes contributions. The biggest impact areas right now are framework parser plugins (CrewAI, LangGraph, AutoGen) and export functionality.
