# Lattice

**See your agents. Understand the flow. Don't lose track.**

Lattice is an open-source dashboard that automatically visualizes agent workflows from your project files. Point it at a folder or drop your files — it reads your agent definitions, maps the relationships, and renders an interactive graph. Zero config required. No AI models needed — pure regex-based parsing.

<!-- Add a screenshot or GIF of the graph view here -->
<!-- ![Lattice Dashboard](docs/screenshot-graph.png) -->

```bash
npx lattice-agents ./your-project
```

---

## The Problem

You're building with multiple AI agents — sourcing, analysis, verification, publishing, quality review. The project grows. Agents multiply. Data flows between them through files and APIs. Eventually the system is too complex to hold in your head, and the only way to understand it is to read every file.

Lattice solves this by **auto-reading your project** and **drawing the workflow for you**.

## How It Works

```
Your project folder          Lattice

  AGENT_MAP.md ──────┐        ┌──────────────────────┐
  .claude/agents/ ───┤        │                      │
  CLAUDE.md ─────────┤        │  11 parsers with     │
  SYSTEM-ARCH.md ────┼──────> │  heuristic fallback  │ ────> Interactive
  SKILL.md ──────────┤        │                      │       node graph
  *.py (any framework)┤       │  No AI model needed  │
  *.yaml ────────────┘        └──────────────────────┘
```

1. **Scan** — Point Lattice at your project folder, or drag-and-drop files (.md, .py, .yaml, .json)
2. **Parse** — 11 specialized parsers detect agents from structured and unstructured files
3. **Visualize** — An interactive node graph shows every agent, their model, role, pipeline order, and connections
4. **Work** — Edit agents, monitor pipelines, export graphs, track changes — all from the dashboard

## What It Detects

| Source | What's Extracted |
|--------|-----------------|
| `AGENT_MAP.md` | Agent names, roles, models, scripts, status, team/group (CSV or markdown table) |
| `.claude/agents/*.md` | Claude Code harness agent definitions with frontmatter |
| `SYSTEM-ARCHITECTURE.md` | Pipeline phases, execution order, data flow edges |
| `CLAUDE.md` | Project name, goal, orchestration relationships |
| `.agents/skills/*/SKILL.md` | Agent descriptions and full instruction sets |
| `agents.yaml` / `tasks.yaml` | **CrewAI** agent configs, task dependencies, process type |
| `*.py` (CrewAI) | `@CrewBase` crews, `@task` decorator agent mappings, `Process.sequential` / `.hierarchical` |
| `*.py` (LangGraph) | `StateGraph` nodes, `add_edge`, conditional routing, `tools_condition` inference |
| `*.py` (AutoGen) | `AssistantAgent`, `GroupChat` transitions, `Swarm` handoffs |
| `*.py` (OpenAI Agents) | `Agent` definitions, multiline `handoffs` graphs |
| `langgraph.json` | LangGraph project config |
| Any `.md` file | Heuristic detection of agents and relationships |

## Features

### Interactive Graph
- Hierarchical layout with Dagre — orchestrators on top, pipeline flows left-to-right
- Custom nodes colored by model family — legend dynamically shows only models in use
- Three edge types: pipeline flow (solid blue), supervision (dashed orange), data flow (gray)
- **Team grouping** — agents with a Team/Group column are enclosed in labeled visual containers with agent counts
- **Selected agent highlighting** — subtle white border + glow when navigating with Tab or clicking
- Click any agent to open a resizable detail panel with role, model, script, connections, and instructions
- **Draw manual edges** — drag between nodes to add missing connections
- **Keyboard shortcuts** — `Esc` (close panel), `Tab` (cycle agents), `/` (search), `M` (monitor), `A` (archived)
- **Agent notes** — annotate any agent with persisted notes
- Search and filter agents in real-time

### Workflow Pattern Detection
Lattice auto-detects the 5 agentic workflow patterns and displays a clickable badge with confidence score:

| Pattern | Icon | How it's detected |
|---------|------|-------------------|
| **Sequential** | → | Linear chain — each agent has ≤1 in-edge and ≤1 out-edge |
| **Split & Merge** | ⟨⟩ | Hub node with 2+ fan-out or fan-in edges |
| **Operator** | ∥ | Multiple isolated groups with no cross-connections |
| **Agent Teams** | ⬡ | High edge density — mesh of interconnected agents |
| **Headless** | ⚡ | Agents with schedule/cron fields, autonomous execution |

Click the pattern badge to see per-team breakdown (e.g., "Dev: Sequential, Growth: Sequential").

### Bidirectional Editing
- **Edit agent instructions** — click Edit on any agent's source file, modify in-place, preview diff before writing
- **Toggle agent status** — switch between active/paused/archived from the dashboard, writes back to source file
- **Diff preview modal** — every file write shows a before/after diff for review before confirming
- **Auto-snapshot** — a snapshot is saved automatically before every file write (safety net)
- **Mark as Resolved** — manually override failed/running pipeline status after intervention, with undo

### Live Monitoring
- Polls pipeline logs for real-time agent status
- Pulsing glow on running agents, green/red indicators for success/failure
- Timeline bar with progress, duration tracking, and streaming log viewer
- **Configurable log paths** — gear icon lets you set custom log directory and file pattern
- **Auto-discover** — scans for common log directories (`logs/`, `output/`, `runs/`) including nested subdirectories
- Works out of the box if your project writes structured logs to `logs/`

### Auto-Sync
- File watcher polls every 5 seconds for changes in your project
- When `.md`, `.py`, or `.yaml` files change, the graph auto-rescans
- Green "sync" indicator in the header when active
- No manual re-scan needed after editing files

### Agent Health
- Green/amber/red health dots on every agent node
- Script existence check — does the file actually exist?
- Staleness detection — warns if a script hasn't been modified in 30+ days
- Detailed health info in the agent detail panel

### Git Integration
- Shows last commit info per agent — who changed it, when, what commit message
- Automatic detection for git repositories
- "Changed 2 hours ago by @han — Fix sourcing timeout"

### Cost Tracking
- Estimated run cost per agent based on model rates and runtime duration
- Cost panel in bottom-right shows per-agent breakdown
- Total pipeline cost estimate
- Works with live monitoring data

### Export
- **JSON** — Full project data (agents, edges, metadata) for programmatic use
- **Mermaid** — Diagram syntax that renders in GitHub, Notion, mermaid.live
- **PNG** — High-res screenshot of the current viewport
- **SVG** — Vector image for docs, presentations, print
- **Update README** — One click to inject a Mermaid diagram into your project's README.md

### Snapshot Diff
- Save snapshots of your agent architecture at any point
- Compare current state against any saved snapshot
- Visual diff badges on nodes: NEW (green), MOD (amber), DEL (red)
- Summary panel shows added/removed/changed agents and edges
- Snapshots persist across sessions (capped at 20)

### Persistence
- Projects are saved to localStorage — refresh the page, your graph is still there
- "Continue with [project]" quick-load on the landing page
- UI state (archived toggle, paused agents, monitoring, notes, manual edges) persists across sessions

### Error Recovery
- Each parser is individually wrapped — one malformed file won't crash the whole scan
- Parse warnings shown as a dismissible banner with detailed warning count
- Graceful degradation: partial results are always returned

### CLI
- `npx lattice-agents` — zero-install local server
- `npx lattice-agents ./my-project` — auto-scan a folder on startup
- `npx lattice-agents -p 4000` — custom port
- Standalone build with automatic browser open
- Port-in-use detection with helpful suggestions

### Security (Local-First)
- No data leaves your machine — no external APIs, no telemetry, no AI models
- Server binds to `127.0.0.1` only — no network exposure
- Origin header validation on all write API endpoints (CSRF protection)
- Symlink validation prevents path traversal
- Sensitive directory blocking (`.ssh`, `.aws`, `.config`, system dirs, docs dirs)
- File size limits (1MB for .md, 50KB for .py, 200 files max)

## Quick Start

```bash
# Option 1: npx (zero install)
npx lattice-agents

# Option 2: Clone and run
git clone https://github.com/DahunHan/lattice.git
cd lattice/HailMary
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and either:
- **Drag & drop** your project files onto the landing page (.md, .py, .yaml, .json)
- **Enter a folder path** and click Scan

### CLI (recommended)

```bash
npx lattice-agents                    # Start dashboard
npx lattice-agents ./my-project       # Auto-scan a folder
npx lattice-agents -p 4000            # Custom port
npx lattice-agents --help             # All options
```

### Try the Example

Lattice ships with a sample harness in `examples/sample-harness/`. Scan that folder to see a multi-agent pipeline with orchestrator supervision, pipeline phases, and log-based monitoring.

You can also scan Lattice's own folder — it's built by a 10-agent harness and visualizes itself.

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
| Testing | Vitest (88 tests, 5 suites) |

## Project Structure

```
src/
  app/                          # Next.js pages and API routes
    api/scan/                   #   POST: scan a folder for project files
    api/status/                 #   POST: poll pipeline log status
    api/check-changes/          #   POST: detect file changes for auto-sync
    api/config/                 #   GET: server-side config (CLI scan path)
    api/discover-logs/          #   POST: find log directories automatically
    api/git/                    #   POST: git commit info per agent file
    api/health/                 #   POST: agent script health checks
    api/readme/                 #   POST: inject Mermaid diagram into README
    api/write-agent/            #   GET/POST: read and write agent source files
    graph/                      #   Interactive graph visualization page
  components/
    graph/
      nodes/                    #   AgentNode, OrchestratorNode, GroupNode
      edges/                    #   PipelineEdge, SupervisionEdge, DataFlowEdge
      FlowCanvas.tsx            #   React Flow wrapper with manual edge support
      ExportMenu.tsx            #   Export format dropdown menu
    modals/
      DiffPreviewModal.tsx      #   Before/after diff preview for file writes
    panels/                     #   UI overlay panels
      AgentDetailPanel.tsx      #   Resizable agent detail + editing panel
      ProjectOverview.tsx       #   Project stats and controls
      Legend.tsx                #   Draggable color/edge legend
      LiveTimeline.tsx          #   Pipeline timeline and log viewer
      MonitoringToggle.tsx      #   Live monitoring on/off toggle
      LogSettings.tsx           #   Configurable log path settings
      SnapshotPanel.tsx         #   Snapshot save/compare/diff UI
      CostPanel.tsx             #   Per-agent cost estimation panel
  lib/
    parser/                     # 11 parsers + orchestrator
      agentMapParser.ts         #   CSV and markdown table parsing
      architectureParser.ts     #   Pipeline phases and edge detection
      claudeAgentsParser.ts     #   .claude/agents/*.md with frontmatter
      claudeParser.ts           #   CLAUDE.md metadata extraction
      skillParser.ts            #   SKILL.md instruction parsing
      crewaiParser.ts           #   CrewAI agents.yaml, tasks.yaml, @task decorators
      langgraphParser.ts        #   LangGraph StateGraph nodes, edges, conditional routing
      autogenParser.ts          #   AutoGen agents, GroupChat, Swarm
      openaiAgentsParser.ts     #   OpenAI Agents SDK definitions and handoffs
      heuristicParser.ts        #   Fallback: bold names, arrow patterns, verbal cues
      markdownUtils.ts          #   Shared: frontmatter, table, CSV utilities
      parserUtils.ts            #   Shared: slugify, model/role classifiers
      index.ts                  #   Orchestrator: priority-based parsing with error recovery
    graph/
      buildGraph.ts             #   Filters, groups, transforms into React Flow nodes/edges
      layoutEngine.ts           #   Dagre hierarchical layout computation
    theme/colors.ts             #   Model-family color palette (10 families)
    export/exportGraph.ts       #   JSON, Mermaid, PNG, SVG export
    snapshot/
      snapshotTypes.ts          #   Snapshot and DiffResult types
      diffEngine.ts             #   Compare snapshots, produce structured diffs
    types.ts                    #   Full TypeScript type definitions
  store/useProjectStore.ts      # Zustand store with localStorage persistence
  hooks/
    useAgentStatus.ts           #   Live monitoring polling hook
    useFileWatcher.ts           #   Auto-sync file change detection hook
scripts/
  orchestrator.py               # Pipeline runner for agent harnesses
vscode-extension/               # VS Code extension (side panel webview)
```

## Design

Dark theme with glassmorphism. Information density over whitespace — this is a developer tool, not a marketing site.

### Colors

| Element | Color |
|---------|-------|
| Background | `#0A0A1B` |
| Surface | `#12122A` |
| Border | `#1E1E3A` |
| Text | `#E0E0F0` |
| Accent | `#F5A623` (orange) |

### Model Family Colors

| Model | Color | Hex |
|-------|-------|-----|
| Haiku | Blue | `#4A9EE0` |
| Sonnet | Green | `#2ECC71` |
| Opus | Purple | `#9B59B6` |
| GPT | Teal | `#1ABC9C` |
| o-series (o1/o3/o4) | Cyan | `#00BCD4` |
| Gemini | Yellow | `#F1C40F` |
| Llama | Orange | `#E67E22` |
| Mistral | Red | `#E74C3C` |
| Deepseek | Blue | `#3498DB` |
| Python/No LLM | Gray | `#7F8C8D` |

## Roadmap

### Phase 2: From Map to Dashboard — COMPLETE
- [x] Framework plugins — CrewAI, LangGraph, AutoGen, OpenAI Agents SDK
- [x] Snapshot diff — save snapshots, compare, visual diff badges on nodes
- [x] Export — PNG, SVG, JSON, Mermaid diagram
- [x] CLI distribution — `npx lattice-agents` with auto-scan, standalone build
- [x] Manual edges and agent notes — draw missing connections, annotate agents
- [x] Agent health check — script existence, staleness detection
- [x] Git integration — last commit info per agent
- [x] Auto-update README — inject Mermaid diagram into project README.md
- [x] File watcher — polling-based auto-sync when project files change

### Phase 3: Agent IDE Companion — MOSTLY COMPLETE
- [x] Bidirectional editing — edit instructions and toggle status from dashboard, with diff preview
- [x] Auto-sync — file watcher auto-rescans when project files change
- [x] Cost tracking — estimated cost per agent based on model rates and runtime
- [x] VS Code extension — open agent dashboard as a side panel while you code
- [x] Team grouping — visual containers with labels for agent teams
- [x] Expanded model support — 10 model families with distinct colors
- [ ] Execution replay — record and step through full pipeline runs
- [ ] Tauri desktop app — native experience with system tray

## VS Code Extension

Lattice includes a VS Code extension that opens the dashboard as a side panel.

```bash
cd vscode-extension
npm install
npm run build
```

Then in VS Code: `Ctrl+Shift+P` → "Lattice: Scan Current Workspace" — opens the graph next to your code.

## Built With Two Harnesses

Lattice itself is built and maintained by a 10-agent system — two teams working in sequence.

### Dev Harness (builds the product)

| Agent | Role |
|-------|------|
| Architect | Component structure, data models, API design |
| Frontend Dev | React components, styling, animations |
| Design Reviewer | Visual quality gate (>= 7/10 to ship) |
| Code Reviewer | TypeScript correctness, performance, security |
| QA Tester | Parser validation, edge cases, cross-reference |

Workflow: Architect → Frontend Dev → (Design Reviewer + Code Reviewer in parallel) → QA Tester

### Growth Harness (grows the project)

| Agent | Role |
|-------|------|
| Dogfood Tester | Tests Lattice against real open source agent projects, reports bugs |
| Docs Writer | Maintains README, guides, changelogs, onboarding content |
| Content Creator | Writes launch posts, Twitter threads, Reddit posts |
| Community Manager | Triages GitHub issues, manages PRs, tracks community health |
| Growth Tracker | Monitors npm downloads, GitHub stars, generates weekly growth reports |

Workflow: Dogfood Tester → (Docs Writer + Community Manager in parallel) → Content Creator → Growth Tracker

Run both teams: `python scripts/orchestrator.py --team all`

Scan Lattice's own folder to see both harnesses visualized with team grouping.

## License

MIT

## Contributing

Lattice is open source and welcomes contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and coding standards.

High-impact areas right now:
- Additional framework parsers
- Execution replay
- Parser accuracy improvements
- UI polish and accessibility
