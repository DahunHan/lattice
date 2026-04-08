# Lattice — AI Agent Visualization Dashboard

**See every agent, connection, model, and cost in your multi-agent project. One command, full visibility.**

[![npm version](https://img.shields.io/npm/v/lattice-agents)](https://www.npmjs.com/package/lattice-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-88%20passing-brightgreen)]()

![Lattice Dashboard](docs/demo.gif)

```bash
npx lattice-agents ./your-project
```

> **Zero config. No API keys. No cloud. No AI models used. Your code never leaves your machine.**

---

## Why AI Agent Visualization Matters

Modern AI projects run 5-50+ agents with complex handoffs, supervision chains, and shared memory. Without visualization, teams:

- Can't see which agent feeds into which
- Don't know what models each agent uses (or what they cost)
- Miss broken connections and orphan agents
- Waste hours manually mapping architecture in draw.io
- Lose track of changes as agents multiply

**Lattice solves this automatically.** Point it at your project folder and it parses your existing files — no SDK integration, no code changes, no manual diagramming.

---

## How It Works

```
Your project folder          Lattice

  AGENT_MAP.md ──────┐        ┌──────────────────────┐
  .claude/agents/ ───┤        │                      │
  CLAUDE.md ─────────┤        │  11 parsers with     │
  SYSTEM-ARCH.md ────┼──────> │  heuristic fallback  │ ────> Interactive
  SKILL.md ──────────┤        │                      │       node graph
  *.py (any framework)┤       │  Pure regex — no AI  │
  *.yaml ────────────┘        └──────────────────────┘
```

1. **Scan** — Point Lattice at your project folder, or drag-and-drop files (.md, .py, .yaml, .json)
2. **Parse** — 11 specialized parsers detect agents from structured and unstructured files
3. **Visualize** — Interactive node graph with color-coded models, team grouping, and workflow patterns
4. **Work** — Edit agents, monitor pipelines, export graphs, track changes — all from the dashboard

---

## Multi-Agent Framework Support

Lattice includes **11 specialized parsers** — no AI models required, only fast regex-based scanning:

| Framework | What's Parsed | Status |
|-----------|--------------|--------|
| **Claude Code** | `AGENT_MAP.md`, `.claude/agents/*.md`, `CLAUDE.md`, `SKILL.md` | Stable |
| **CrewAI** | `agents.yaml`, `tasks.yaml`, `@CrewBase` crews, `@task` decorators | Stable |
| **LangGraph** | `StateGraph` nodes, `add_edge`, conditional routing, `langgraph.json` | Stable |
| **AutoGen** | `AssistantAgent`, `GroupChat` transitions, `Swarm` handoffs | Stable |
| **OpenAI Agents SDK** | `Agent` definitions, multiline `handoffs` graphs | Stable |
| **Heuristic** | Bold names, arrow patterns, verbal cues in any `.md` file | Stable |

---

## Features

### Interactive Agent Workflow Graph
- Hierarchical Dagre layout — orchestrators above, pipeline flows left-to-right
- Color-coded nodes by model family (10 families: Claude, GPT, Gemini, Llama, Mistral, and more)
- Three edge types: pipeline flow (blue), supervision (orange), data flow (gray)
- **Team grouping** — visual containers with labels and agent counts
- **Workflow pattern detection** — identifies Sequential, Split & Merge, Operator, Agent Teams, and Headless patterns with confidence scores
- **Selected agent highlighting** — subtle glow when navigating with Tab or clicking
- Resizable detail panel with role, model, script, connections, instructions, health, and git info
- **Draw manual edges** — drag between nodes to add missing connections
- **Agent notes** — annotate any agent with persisted notes
- **Keyboard shortcuts** — `Esc` (close panel), `Tab` (cycle agents), `/` (search), `M` (monitor), `A` (archived)
- **Dark/Light theme** — toggle with sun/moon button, preference persisted

### Bidirectional Editing
- **Edit agent instructions** — modify in-place from the dashboard, preview diff before writing back to file
- **Toggle agent status** — switch between active/paused/archived, writes to source file
- **Diff preview modal** — every file write shows before/after comparison
- **Auto-snapshot** — saved automatically before every write (safety net)
- **Mark as Resolved** — override failed/running pipeline status after manual intervention, with undo

### Live Agent Monitoring
- Real-time status polling with pulsing node animations
- Progress tracking, duration per agent, streaming log viewer
- **Resizable timeline** — drag to expand or shrink the log panel
- **Configurable log paths** — gear icon for custom directory and file pattern
- **Auto-discover** — scans for `logs/`, `output/`, `runs/` including nested subdirectories
- Works out of the box if your project writes structured logs

### Agent Health & Git Integration
- **Health dots** — green (healthy), amber (stale 30+ days), red (script missing) on every node
- **Git info** — "Changed 2 hours ago by @han — Fix sourcing timeout" per agent
- Detailed health and git data in the agent detail panel

### Agent Cost Tracking
- Estimated cost per agent based on model rates and runtime duration
- Per-agent breakdown sorted by highest cost
- Total pipeline cost estimate
- Identify expensive agents that need optimization

### Auto-Sync
- File watcher polls every 5 seconds for changes
- Graph auto-rescans when `.md`, `.py`, or `.yaml` files change
- Green "sync" indicator in the header
- No manual re-scan needed after editing files

### Export & Documentation
- **JSON** — Full project data for programmatic use
- **Mermaid** — Diagram syntax for GitHub, Notion, mermaid.live
- **Markdown Table** — Agent list for pasting into docs, Slack, issues
- **PNG / SVG** — High-resolution images for presentations
- **Update README** — One click to inject a Mermaid diagram into your project's README.md

### Architecture Snapshots & Diff
- Save architecture snapshots at any point
- Compare snapshots with visual diff badges: NEW (green), MOD (amber), DEL (red)
- Track how your agent architecture evolves over time
- Snapshots persist across sessions (capped at 20)

### Security & Privacy
- **100% local** — no external API calls, no telemetry, no cloud dependencies, no AI models
- Server binds to `127.0.0.1` only
- CSRF protection on all write endpoints, symlink validation, path traversal guards
- Sensitive directory blocking (`.ssh`, `.aws`, `.config`, system dirs)
- File size limits (1MB for .md, 50KB for .py, 200 files max)

---

## Use Cases

- **AI teams** building multi-agent pipelines who need visibility into agent topology
- **Solo developers** running CrewAI or LangGraph projects who want a quick architecture overview
- **Engineering managers** reviewing agent costs and workflow complexity
- **Open-source maintainers** documenting agent architectures in their READMEs
- **Security teams** auditing which models and APIs agents are accessing

---

## Lattice vs. Alternatives

| Feature | Lattice | Manual Diagrams | LangSmith | Custom Scripts |
|---------|---------|----------------|-----------|---------------|
| Auto-generates from code | Yes | No | Partial | No |
| Works offline / local-only | Yes | Yes | No | Yes |
| Multi-framework support | 11 parsers | N/A | LangChain only | Custom |
| Live monitoring | Yes | No | Yes | Custom |
| Cost tracking | Yes | No | Yes | No |
| Bidirectional editing | Yes | N/A | No | No |
| Free & open source | Yes | Yes | Freemium | Yes |
| One-command setup | Yes | N/A | No | No |

---

## Quick Start

```bash
# Run directly (recommended)
npx lattice-agents

# Scan a specific project
npx lattice-agents ./my-project

# Custom port
npx lattice-agents -p 4000

# All options
npx lattice-agents --help
```

Or clone and run locally:

```bash
git clone https://github.com/DahunHan/lattice.git
cd lattice/HailMary
npm install
npm run dev
```

### Try the Example

Scan `examples/sample-harness/` to see a multi-agent pipeline with orchestrator supervision, pipeline phases, and log-based monitoring.

Scan Lattice's own folder to see a 10-agent system visualized with team grouping and workflow patterns.

---

## Tech Stack

Built with Next.js 16, React Flow, Dagre, Zustand, Framer Motion, Tailwind CSS v4, and TypeScript. 88 tests via Vitest.

<details>
<summary>Project Structure</summary>

```
src/
  app/                          # Next.js pages + 9 API routes
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
    graph/                      #   FlowCanvas, ExportMenu, ErrorBoundary
      nodes/                    #   AgentNode, OrchestratorNode, GroupNode
      edges/                    #   PipelineEdge, SupervisionEdge, DataFlowEdge
    modals/                     #   DiffPreviewModal
    panels/                     #   AgentDetail, ProjectOverview, Legend, LiveTimeline,
                                #   MonitoringToggle, LogSettings, SnapshotPanel, CostPanel, PatternBadge
  lib/
    parser/                     #   11 parsers + orchestrator
    patterns/                   #   Workflow pattern detector (5 patterns)
    graph/                      #   Graph builder + Dagre layout engine
    theme/                      #   Color palette (10 model families)
    export/                     #   JSON, Mermaid, Markdown, PNG, SVG export
    snapshot/                   #   Snapshot types + diff engine
  store/                        #   Zustand with localStorage persistence
  hooks/                        #   useAgentStatus, useFileWatcher, useKeyboardShortcuts
scripts/
  orchestrator.py               #   Pipeline runner for agent harnesses
vscode-extension/               #   VS Code extension (side panel webview)
```

</details>

<details>
<summary>Model Family Colors</summary>

| Model | Color | Hex |
|-------|-------|-----|
| Haiku | Blue | `#4A9EE0` |
| Sonnet | Green | `#2ECC71` |
| Opus | Purple | `#9B59B6` |
| GPT | Teal | `#1ABC9C` |
| o-series | Cyan | `#00BCD4` |
| Gemini | Yellow | `#F1C40F` |
| Llama | Orange | `#E67E22` |
| Mistral | Red | `#E74C3C` |
| Deepseek | Blue | `#3498DB` |
| Python/No LLM | Gray | `#7F8C8D` |

</details>

---

## VS Code Extension

Lattice includes a VS Code extension that opens the dashboard as a side panel.

```bash
cd vscode-extension && npm install && npm run build
```

Then: `Ctrl+Shift+P` → "Lattice: Scan Current Workspace"

---

## Built With Two Agent Harnesses

Lattice itself is built and maintained by a 10-agent system — two teams working in sequence.

**Dev Harness** — Architect → Frontend Dev → (Design Reviewer + Code Reviewer) → QA Tester

**Growth Harness** — Dogfood Tester → (Docs Writer + Community Manager) → Content Creator → Growth Tracker

Run both teams: `python scripts/orchestrator.py --team all`

---

## Roadmap

- [x] 11 framework parsers (Claude, CrewAI, LangGraph, AutoGen, OpenAI Agents)
- [x] Bidirectional editing with diff preview
- [x] Live monitoring with configurable log paths
- [x] Cost tracking, health checks, git integration
- [x] Export (JSON, Mermaid, Markdown, PNG, SVG, README injection)
- [x] Workflow pattern detection (5 patterns)
- [x] Team grouping, keyboard shortcuts, dark/light theme
- [x] VS Code extension, CLI distribution
- [ ] Execution replay — record and step through full pipeline runs
- [ ] Tauri desktop app — native experience with system tray

---

## Contributing

Lattice is open source and welcomes contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

High-impact areas: execution replay, parser accuracy, new framework parsers, UI accessibility.

## License

MIT — use it however you want.

---

**Lattice** is an open-source AI agent visualization and monitoring dashboard. Built for teams running multi-agent AI workflows with CrewAI, LangGraph, AutoGen, OpenAI Agents SDK, and more.

[GitHub](https://github.com/DahunHan/lattice) · [npm](https://www.npmjs.com/package/lattice-agents) · [Report Bug](https://github.com/DahunHan/lattice/issues) · [Request Feature](https://github.com/DahunHan/lattice/issues)
