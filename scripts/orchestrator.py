#!/usr/bin/env python3
"""
Lattice Harness Orchestrator
Runs agent teams in sequence with structured logging for live dashboard monitoring.

Usage:
    python scripts/orchestrator.py --team dev        # Run dev harness only
    python scripts/orchestrator.py --team growth     # Run growth harness only
    python scripts/orchestrator.py --team all        # Run both teams
    python scripts/orchestrator.py                   # Same as --team all
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent

def get_version() -> str:
    """Read current version from package.json."""
    try:
        pkg = json.loads((PROJECT_ROOT / "package.json").read_text(encoding="utf-8"))
        return pkg.get("version", "unknown")
    except Exception:
        return "unknown"
LOGS_DIR = PROJECT_ROOT / "logs"
WORKSPACE_DIR = PROJECT_ROOT / "_workspace"
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"

# Team definitions: agent name → task description
TEAM_DEV = {
    "name": "Dev Harness",
    "agents": [
        {
            "id": "architect",
            "name": "Architect",
            "file": "architect.md",
            "task": "Review current architecture, identify technical debt, propose improvements",
            "phase": 1,
        },
        {
            "id": "frontend_dev",
            "name": "Frontend Dev",
            "file": "frontend-dev.md",
            "task": "Implement any pending architectural changes, fix UI bugs",
            "phase": 2,
        },
        {
            "id": "design_reviewer",
            "name": "Design Reviewer",
            "file": "design-reviewer.md",
            "task": "Review all recent UI changes, score against design system, flag issues",
            "phase": 3,
            "parallel_group": "review",
        },
        {
            "id": "code_reviewer",
            "name": "Code Reviewer",
            "file": "code-reviewer.md",
            "task": "Review all recent code changes for TypeScript correctness, security, performance",
            "phase": 3,
            "parallel_group": "review",
        },
        {
            "id": "qa_tester",
            "name": "QA Tester",
            "file": "qa-tester.md",
            "task": "Run full test suite, validate parsers against sample data, check edge cases",
            "phase": 4,
        },
    ],
}

TEAM_GROWTH = {
    "name": "Growth Harness",
    "agents": [
        {
            "id": "dogfood_tester",
            "name": "Dogfood Tester",
            "file": "dogfood-tester.md",
            "task": "Test Lattice by scanning its own project folder and the examples/sample-harness/ folder. Verify agent counts, edge counts, and group labels are correct. Check for false positives. Report accuracy scores. Do NOT clone external repos — test against local files only.",
            "phase": 1,
        },
        {
            "id": "docs_writer",
            "name": "Docs Writer",
            "file": "docs-writer.md",
            "task": f"Update README with latest features, write changelog for current version (v{get_version()})",
            "phase": 2,
            "parallel_group": "ops",
        },
        {
            "id": "community_manager",
            "name": "Community Manager",
            "file": "community-manager.md",
            "task": "Triage open GitHub issues, draft responses, generate weekly community report",
            "phase": 2,
            "parallel_group": "ops",
        },
        {
            "id": "content_creator",
            "name": "Content Creator",
            "file": "content-creator.md",
            "task": "Write launch posts for Twitter, Reddit, and Hacker News based on latest features",
            "phase": 3,
        },
        {
            "id": "growth_tracker",
            "name": "Growth Tracker",
            "file": "growth-tracker.md",
            "task": "Check npm downloads, GitHub stars, generate weekly growth report with recommendations",
            "phase": 4,
        },
    ],
}

TEAMS = {
    "dev": TEAM_DEV,
    "growth": TEAM_GROWTH,
}


# ── Logging ───────────────────────────────────────────────────────────────────

class PipelineLogger:
    """Writes structured logs that Lattice dashboard can parse in real-time."""

    def __init__(self, team_name: str):
        LOGS_DIR.mkdir(exist_ok=True)
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        self.log_path = LOGS_DIR / f"pipeline_{date_str}.log"
        self.state_path = LOGS_DIR / "pipeline_state.json"
        self.team_name = team_name
        self.state = {
            "date": date_str,
            "team": team_name,
            "phase": "starting",
            "started_at": self._now(),
        }

    def _now(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _write(self, level: str, message: str):
        line = f"[{self._now()}] [{level}] {message}\n"
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(line)
        # Use errors='replace' for console output on non-UTF-8 terminals (e.g., Korean Windows cp949)
        try:
            print(line.strip())
        except UnicodeEncodeError:
            print(line.strip().encode('ascii', errors='replace').decode('ascii'))

    def _save_state(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2)

    def start_pipeline(self):
        self._write("INFO", f"=== Lattice {self.team_name} starting === {self._now()}")
        self._save_state()

    def start_phase(self, phase_num: int, phase_name: str):
        self.state["phase"] = phase_name
        self._save_state()
        self._write("INFO", f"--- Phase {phase_num}: {phase_name} ---")

    def start_agent(self, agent_id: str, agent_name: str):
        self._write("INFO", f"Running: {agent_id}.py (agent: {agent_name})")

    def agent_success(self, agent_id: str, duration_s: float):
        self._write("SUCCESS", f"{agent_id}.py completed successfully ({duration_s:.1f}s)")

    def agent_failed(self, agent_id: str, error: str):
        self._write("ERROR", f"{agent_id}.py failed: {error}")

    def agent_output(self, agent_id: str, message: str):
        self._write("INFO", f"[{agent_id}] {message}")

    def pipeline_complete(self):
        self.state["phase"] = "complete"
        self.state["completed_at"] = self._now()
        self._save_state()
        self._write("INFO", "Pipeline complete")

    def pipeline_failed(self, error: str):
        self.state["phase"] = "failed"
        self._save_state()
        self._write("ERROR", f"Pipeline failed: {error}")


# ── Agent Runner ──────────────────────────────────────────────────────────────

def run_agent(agent: dict, logger: PipelineLogger) -> bool:
    """
    Run a single agent via Claude Code CLI.
    Returns True if successful, False if failed.
    """
    agent_id = agent["id"]
    agent_name = agent["name"]
    agent_file = AGENTS_DIR / agent["file"]
    task = agent["task"]

    logger.start_agent(agent_id, agent_name)
    start_time = datetime.now(timezone.utc)

    # Ensure workspace directories exist
    workspace_dirs = [
        WORKSPACE_DIR / "dogfood",
        WORKSPACE_DIR / "docs",
        WORKSPACE_DIR / "content",
        WORKSPACE_DIR / "community",
        WORKSPACE_DIR / "growth",
        WORKSPACE_DIR / "architecture",
        WORKSPACE_DIR / "reviews",
        WORKSPACE_DIR / "qa",
    ]
    for d in workspace_dirs:
        d.mkdir(parents=True, exist_ok=True)

    # Read agent instructions
    if not agent_file.exists():
        logger.agent_failed(agent_id, f"Agent file not found: {agent_file}")
        return False

    instructions = agent_file.read_text(encoding="utf-8")

    # Build the prompt for Claude Code
    prompt = f"""You are the {agent_name} agent for Lattice.

Your instructions:
{instructions}

Your task for this run:
{task}

Work in the project directory: {PROJECT_ROOT}
Save your output to the _workspace/ directory as specified in your instructions.
Be thorough but concise. Complete the task and report what you did."""

    try:
        # Run via Claude Code CLI
        result = subprocess.run(
            ["claude", "--print", "-p", prompt],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=900,  # 15 minute timeout per agent
            cwd=str(PROJECT_ROOT),
        )

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        if result.returncode == 0:
            # Log a summary of what the agent produced
            output = (result.stdout or '').strip()
            if output:
                # Sanitize for safe logging (remove chars that crash non-UTF-8 consoles)
                summary = output[:200].replace("\n", " ").encode('ascii', errors='replace').decode('ascii')
                logger.agent_output(agent_id, summary)
            logger.agent_success(agent_id, duration)
            return True
        else:
            stderr = (result.stderr or '').strip()
            error = (stderr[:200] if stderr else f"Exit code {result.returncode}").encode('ascii', errors='replace').decode('ascii')
            logger.agent_failed(agent_id, error)
            return False

    except subprocess.TimeoutExpired:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.agent_failed(agent_id, f"Timed out after {duration:.0f}s")
        return False
    except FileNotFoundError:
        logger.agent_failed(agent_id, "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code")
        return False
    except Exception as e:
        logger.agent_failed(agent_id, str(e)[:200])
        return False


# ── Pipeline Runner ───────────────────────────────────────────────────────────

def run_team(team: dict, logger: PipelineLogger) -> bool:
    """Run all agents in a team, respecting phases and parallel groups."""
    agents = team["agents"]
    team_name = team["name"]

    logger.start_pipeline()

    # Group agents by phase
    phases: dict[int, list[dict]] = {}
    for agent in agents:
        phase = agent["phase"]
        if phase not in phases:
            phases[phase] = []
        phases[phase].append(agent)

    all_passed = True

    for phase_num in sorted(phases.keys()):
        phase_agents = phases[phase_num]

        # Name the phase
        if len(phase_agents) == 1:
            phase_name = phase_agents[0]["name"]
        else:
            names = " + ".join(a["name"] for a in phase_agents)
            phase_name = f"{names} (parallel)"

        logger.start_phase(phase_num, phase_name)

        # Run agents in this phase
        # Note: true parallel execution would need threading,
        # but for Claude Code CLI, sequential is safer
        for agent in phase_agents:
            success = run_agent(agent, logger)
            if not success:
                all_passed = False
                logger.agent_output(
                    agent["id"],
                    f"WARNING: {agent['name']} failed, continuing pipeline..."
                )

    if all_passed:
        logger.pipeline_complete()
    else:
        logger.pipeline_complete()  # Still mark complete, but with failures logged

    return all_passed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Lattice Harness Orchestrator")
    parser.add_argument(
        "--team",
        choices=["dev", "growth", "all"],
        default="all",
        help="Which team to run (default: all)",
    )
    parser.add_argument(
        "--agent",
        type=str,
        help="Run a single agent by ID (e.g., dogfood_tester)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be run without executing",
    )
    args = parser.parse_args()

    # Single agent mode
    if args.agent:
        all_agents = TEAM_DEV["agents"] + TEAM_GROWTH["agents"]
        agent = next((a for a in all_agents if a["id"] == args.agent), None)
        if not agent:
            print(f"Agent '{args.agent}' not found. Available:")
            for a in all_agents:
                print(f"  {a['id']} — {a['name']}")
            sys.exit(1)

        team_name = "Dev" if agent in TEAM_DEV["agents"] else "Growth"
        logger = PipelineLogger(f"Single Agent ({agent['name']})")

        if args.dry_run:
            print(f"Would run: {agent['name']} ({agent['id']})")
            print(f"Task: {agent['task']}")
            return

        logger.start_pipeline()
        logger.start_phase(1, agent["name"])
        success = run_agent(agent, logger)
        logger.pipeline_complete()
        sys.exit(0 if success else 1)

    # Team mode
    teams_to_run = []
    if args.team == "all":
        teams_to_run = [TEAM_DEV, TEAM_GROWTH]
    else:
        teams_to_run = [TEAMS[args.team]]

    if args.dry_run:
        for team in teams_to_run:
            print(f"\n{'='*60}")
            print(f"Team: {team['name']}")
            print(f"{'='*60}")
            for agent in team["agents"]:
                parallel = f" [parallel: {agent.get('parallel_group', '')}]" if "parallel_group" in agent else ""
                print(f"  Phase {agent['phase']}: {agent['name']} ({agent['id']}){parallel}")
                print(f"           Task: {agent['task']}")
        return

    all_passed = True
    for team in teams_to_run:
        logger = PipelineLogger(team["name"])
        success = run_team(team, logger)
        if not success:
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
