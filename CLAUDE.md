# Lattice — Agent Workflow Visualizer

## 1. Goal
Open-source Next.js dashboard that auto-reads project folders or uploaded MD files and renders an interactive, stunning visualization of agent workflows. Replaces the FlowSight Streamlit prototype.

## 2. Orchestration
Built by a 5-agent harness:

| Agent | Role |
|-------|------|
| architect | Component structure, data models, API design |
| frontend-dev | React components, styling, animations |
| design-reviewer | Visual quality gate (>= 7/10 to pass) |
| code-reviewer | Code quality, performance, security |
| qa-tester | Parsing validation, edge cases, browser compat |

Workflow: Architect -> Frontend Dev -> (Design Reviewer + Code Reviewer in parallel) -> QA Tester

## 3. Technical Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict, no `any`)
- **Styling:** Tailwind CSS
- **Graph:** React Flow (@xyflow/react)
- **State:** Zustand
- **Animation:** Framer Motion
- **Layout:** Dagre (@dagrejs/dagre)

## 4. Coding Standards
- All files `.ts` or `.tsx`. No `.js`.
- Named exports only (except page defaults).
- One component per file, PascalCase filenames.
- Tailwind classes only — no CSS modules, no styled-components.
- Parsers are pure functions with explicit types.
- Dark theme: bg `#0A0A1B`, surface `#12122A`, border `#1E1E3A`, text `#E0E0F0`, accent `#F5A623`.

## 5. Design Principles
- **Design is KING.** Every pixel matters.
- Dark theme with glassmorphism, glows, smooth animations.
- Information density over whitespace — developer tool, not marketing site.
- Hover reveals detail. Click opens panels.
- 200ms transitions. Framer Motion for enter/exit.
- Desktop-first, min 1024px viewport.

## 6. Input Modes
1. **Upload:** Drag & drop MD files
2. **Scan:** Provide folder path, API route reads all `.md` files recursively

## 7. What Gets Parsed
- `AGENT_MAP.md` — CSV tables of agents
- `SYSTEM-ARCHITECTURE.MD` — Pipeline phases, data flow
- `CLAUDE.md` — Project goals, model allocation
- `.agents/skills/*/SKILL.md` — Agent instructions
- Any `.md` with agent-related content (heuristic detection)
