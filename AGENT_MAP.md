Agent Name,Role,Primary Model,Skill File,Script,Status,Team
Architect,Component structure & data models & API design,claude-sonnet-4-6,architect.md,scripts/orchestrator.py --agent architect,Active,Dev
Frontend_Dev,React components & styling & animations,claude-sonnet-4-6,frontend-dev.md,scripts/orchestrator.py --agent frontend_dev,Active,Dev
Design_Reviewer,Visual quality gate (>= 7/10 to pass),claude-sonnet-4-6,design-reviewer.md,scripts/orchestrator.py --agent design_reviewer,Active,Dev
Code_Reviewer,Code quality & performance & security,claude-sonnet-4-6,code-reviewer.md,scripts/orchestrator.py --agent code_reviewer,Active,Dev
QA_Tester,Parser validation & edge cases & cross-reference,claude-sonnet-4-6,qa-tester.md,scripts/orchestrator.py --agent qa_tester,Active,Dev
Dogfood_Tester,Tests Lattice against real open source agent projects,claude-sonnet-4-6,dogfood-tester.md,scripts/orchestrator.py --agent dogfood_tester,Active,Growth
Docs_Writer,README & guides & changelogs & onboarding content,claude-sonnet-4-6,docs-writer.md,scripts/orchestrator.py --agent docs_writer,Active,Growth
Content_Creator,Twitter threads & Reddit posts & dev.to articles,claude-sonnet-4-6,content-creator.md,scripts/orchestrator.py --agent content_creator,Active,Growth
Community_Manager,GitHub issue triage & PR management & community health,claude-sonnet-4-6,community-manager.md,scripts/orchestrator.py --agent community_manager,Active,Growth
Growth_Tracker,npm downloads & GitHub stars & weekly growth reports,claude-sonnet-4-6,growth-tracker.md,scripts/orchestrator.py --agent growth_tracker,Active,Growth
