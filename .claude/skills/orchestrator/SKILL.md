---
name: orchestrator
description: "Development orchestrator. Coordinates 5 agents through design -> build -> review -> validate pipeline with quality gates."
---

# Orchestrator — Lattice Development Pipeline

## Agent Team

| Agent | Phase | Gate |
|-------|-------|------|
| architect | 1 (Sequential) | Spec complete with types + component tree |
| frontend-dev | 2 (Sequential) | Build passes, tests pass |
| design-reviewer | 3 (Parallel) | Score >= 7/10 |
| code-reviewer | 3 (Parallel) | Approve verdict |
| qa-tester | 4 (Sequential) | PASS verdict |

## Workflow

```
User Request
    ↓
[Phase 1: Architect] → _workspace/architecture/
    ↓
[Phase 2: Frontend Dev] → _workspace/reviews/impl-*
    ↓
[Phase 3: Design + Code Review] (parallel) → _workspace/reviews/
    ↓
  Gate: Both pass? → NO → Frontend Dev fixes → Phase 3 again (max 3 iterations)
    ↓ YES
[Phase 4: QA Tester] → _workspace/qa/
    ↓
  Gate: PASS? → NO → Frontend Dev fixes → Phase 3 + 4 again
    ↓ YES
  DONE → Report to User
```

## Task Decomposition

| Request | Approach |
|---------|----------|
| Full dashboard build | Split: Parsers → Store → Canvas+Nodes → Panels → Polish |
| New feature | Full Phase 1-4 |
| Bug fix | Skip Phase 1 if architecture unchanged |
| Styling improvement | Skip Phase 1, Design Reviewer leads Phase 3 |

## Error Handling

- Review iteration limit: 3. Then escalate to user.
- Conflicting reviews: Code Reviewer technical findings override Design Reviewer aesthetics.
- Spec unclear: Architect clarifies before Frontend Dev starts.
