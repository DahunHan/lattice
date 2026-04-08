import { toPng, toSvg } from 'html-to-image';
import type { ProjectData } from '../types';

/** Export project data as formatted JSON */
export function exportJSON(project: ProjectData, projectName: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    project: {
      metadata: project.metadata,
      agents: project.agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        model: a.model,
        modelFamily: a.modelFamily,
        status: a.status,
        isOrchestrator: a.isOrchestrator,
        phase: a.phase,
        tags: a.tags,
      })),
      edges: project.edges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label,
      })),
      pipeline: project.pipeline,
      stats: {
        totalAgents: project.agents.length,
        activeAgents: project.agents.filter(a => a.status === 'active').length,
        totalEdges: project.edges.length,
        totalPhases: project.pipeline.length,
      },
    },
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `${slugName(projectName)}-agents.json`,
    'application/json'
  );
}

/** Export graph as Mermaid diagram syntax */
export function exportMermaid(project: ProjectData, projectName: string): void {
  const lines: string[] = ['graph TD'];

  // Add node definitions
  for (const agent of project.agents) {
    if (agent.status === 'archived') continue;
    const id = mermaidId(agent.id);
    const label = agent.name.replace(/"/g, "'");
    const shape = agent.isOrchestrator ? `${id}{{"${label}"}}` : `${id}["${label}"]`;
    lines.push(`  ${shape}`);
  }

  lines.push('');

  // Add edges
  for (const edge of project.edges) {
    const src = mermaidId(edge.source);
    const tgt = mermaidId(edge.target);
    const label = edge.label ? `|${edge.label}|` : '';

    if (edge.type === 'supervision') {
      lines.push(`  ${src} -.->${label} ${tgt}`);
    } else if (edge.type === 'data-flow') {
      lines.push(`  ${src} ==>${label} ${tgt}`);
    } else {
      lines.push(`  ${src} -->${label} ${tgt}`);
    }
  }

  lines.push('');

  // Add styling
  const orchestrators = project.agents.filter(a => a.isOrchestrator && a.status !== 'archived');
  if (orchestrators.length > 0) {
    lines.push(`  classDef orchestrator fill:#F5A623,stroke:#F5A623,color:#000`);
    lines.push(`  class ${orchestrators.map(a => mermaidId(a.id)).join(',')} orchestrator`);
  }

  const content = lines.join('\n');
  downloadFile(content, `${slugName(projectName)}-agents.mmd`, 'text/plain');
}

/** Export graph viewport as PNG */
export async function exportPNG(
  element: HTMLElement,
  projectName: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#0A0A1B',
    pixelRatio: 2,
    filter: (node) => {
      // Exclude controls and minimap from screenshot
      const cls = node.classList?.toString() ?? '';
      return !cls.includes('react-flow__controls') && !cls.includes('react-flow__minimap');
    },
  });

  const link = document.createElement('a');
  link.download = `${slugName(projectName)}-agents.png`;
  link.href = dataUrl;
  link.click();
}

/** Export graph viewport as SVG */
export async function exportSVG(
  element: HTMLElement,
  projectName: string
): Promise<void> {
  const dataUrl = await toSvg(element, {
    backgroundColor: '#0A0A1B',
    filter: (node) => {
      const cls = node.classList?.toString() ?? '';
      return !cls.includes('react-flow__controls') && !cls.includes('react-flow__minimap');
    },
  });

  const link = document.createElement('a');
  link.download = `${slugName(projectName)}-agents.svg`;
  link.href = dataUrl;
  link.click();
}

/** Export agent list as Markdown table */
export function exportMarkdownTable(project: ProjectData, projectName: string): void {
  const lines: string[] = [
    `# ${project.metadata.name} — Agent Overview`,
    '',
    '| Agent | Role | Model | Status | Team |',
    '|-------|------|-------|--------|------|',
  ];

  for (const agent of project.agents) {
    const name = agent.name.replace(/_/g, ' ');
    const role = agent.role.replace(/\|/g, '/').slice(0, 60);
    const model = agent.modelFamily;
    const status = agent.status;
    const team = agent.group ?? '—';
    lines.push(`| ${name} | ${role} | ${model} | ${status} | ${team} |`);
  }

  lines.push('');
  lines.push(`*${project.agents.length} agents, ${project.edges.length} connections*`);

  downloadFile(lines.join('\n'), `${slugName(projectName)}-agents-table.md`, 'text/markdown');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/** Generate raw Mermaid syntax (no file download) */
export function generateMermaidContent(project: ProjectData): string {
  const lines: string[] = ['graph TD'];

  for (const agent of project.agents) {
    if (agent.status === 'archived') continue;
    const id = mermaidId(agent.id);
    const label = agent.name.replace(/"/g, "'");
    const shape = agent.isOrchestrator ? `${id}{{"${label}"}}` : `${id}["${label}"]`;
    lines.push(`  ${shape}`);
  }

  lines.push('');

  for (const edge of project.edges) {
    const src = mermaidId(edge.source);
    const tgt = mermaidId(edge.target);
    const label = edge.label ? `|${edge.label}|` : '';

    if (edge.type === 'supervision') {
      lines.push(`  ${src} -.->${label} ${tgt}`);
    } else if (edge.type === 'data-flow') {
      lines.push(`  ${src} ==>${label} ${tgt}`);
    } else {
      lines.push(`  ${src} -->${label} ${tgt}`);
    }
  }

  const orchestrators = project.agents.filter(a => a.isOrchestrator && a.status !== 'archived');
  if (orchestrators.length > 0) {
    lines.push('');
    lines.push(`  classDef orchestrator fill:#F5A623,stroke:#F5A623,color:#000`);
    lines.push(`  class ${orchestrators.map(a => mermaidId(a.id)).join(',')} orchestrator`);
  }

  return lines.join('\n');
}

function slugName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}

function mermaidId(id: string): string {
  // Mermaid IDs can't start with numbers and have limited chars
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}
