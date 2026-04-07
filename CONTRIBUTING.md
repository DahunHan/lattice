# Contributing to Lattice

Thanks for your interest in contributing! Lattice is an open source agent workflow visualizer and we welcome contributions of all kinds.

## Quick Start

```bash
git clone https://github.com/DahunHan/lattice.git
cd lattice
npm install
npm run dev
```

Open http://localhost:3000 and scan a project folder or the `examples/sample-harness/` directory.

## Development

```bash
npm run dev        # Start dev server
npm test           # Run tests (88 tests)
npm run build      # Production build
npm run lint       # Lint check
```

## What to Work On

Check the [issues page](https://github.com/DahunHan/lattice/issues) for `good-first-issue` labels. High-impact areas:

- **New framework parsers** — Add support for more agent frameworks
- **Parser accuracy** — Fix false positives in heuristic detection
- **UI polish** — Improve graph layout, animations, accessibility
- **Tests** — Add integration tests for the edit/write flow

## Code Style

- TypeScript strict mode, no `any`
- React components: one per file, PascalCase filenames
- Tailwind CSS only — no CSS modules or styled-components
- Named exports (except page defaults)
- Tests in `__tests__/` directories using Vitest

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm test` and `npm run build` — both must pass
4. Write a clear PR description explaining what and why
5. Submit the PR

We review PRs within a few days. For large changes, open an issue first to discuss the approach.

## Project Structure

```
src/
  app/           # Next.js pages + API routes
  components/    # React components (graph, panels, modals)
  hooks/         # Custom React hooks
  lib/           # Core logic (parsers, graph, export, snapshot)
  store/         # Zustand state management
```

## License

MIT — your contributions will be under the same license.
