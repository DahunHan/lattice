"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ProjectData } from "@/lib/types";
import { exportJSON, exportMermaid, exportPNG, exportSVG, generateMermaidContent } from "@/lib/export/exportGraph";
import { useProjectStore } from "@/store/useProjectStore";

interface ExportMenuProps {
  project: ProjectData;
  graphElement: HTMLElement | null;
}

const EXPORT_OPTIONS = [
  { id: 'json', label: 'JSON', icon: '{ }', desc: 'Full project data' },
  { id: 'mermaid', label: 'Mermaid', icon: '◇', desc: 'Diagram syntax' },
  { id: 'png', label: 'PNG', icon: '▣', desc: 'Current viewport' },
  { id: 'svg', label: 'SVG', icon: '◈', desc: 'Current viewport' },
  { id: 'readme', label: 'Update README', icon: '▤', desc: 'Inject Mermaid diagram' },
] as const;

export function ExportMenu({ project, graphElement }: ExportMenuProps) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const handleExport = useCallback(async (format: string) => {
    const name = project.metadata.name;
    setExporting(format);
    try {
      switch (format) {
        case 'json':
          exportJSON(project, name);
          break;
        case 'mermaid':
          exportMermaid(project, name);
          break;
        case 'png':
          if (graphElement) await exportPNG(graphElement, name);
          break;
        case 'svg':
          if (graphElement) await exportSVG(graphElement, name);
          break;
        case 'readme':
          if (projectPath) {
            const mermaid = generateMermaidContent(project);
            const res = await fetch('/api/readme', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: projectPath, mermaid }),
            });
            const json = await res.json();
            if (json.success) {
              console.log('[HailMary] README.md updated:', json.path);
            }
          }
          break;
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  }, [project, graphElement, projectPath]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium
          transition-all duration-200
          ${open
            ? 'bg-[#4A9EE0]/15 text-[#4A9EE0] border border-[#4A9EE0]/30'
            : 'bg-[#1E1E3A] text-[#7777A0] border border-[#1E1E3A] hover:border-[#2E2E52] hover:text-[#9999BB]'
          }
        `}
        aria-label="Export graph"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 glass-strong rounded-xl border border-[#1E1E3A] shadow-xl shadow-black/30 overflow-hidden z-50">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleExport(opt.id)}
              disabled={exporting !== null || ((opt.id === 'png' || opt.id === 'svg') && !graphElement) || (opt.id === 'readme' && !projectPath)}
              className="
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                text-[11px] text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#1E1E3A]/50
                transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              <span className="w-5 text-center text-[#7777A0] font-mono text-[10px]">
                {exporting === opt.id ? (
                  <span className="inline-block animate-spin">⟳</span>
                ) : (
                  opt.icon
                )}
              </span>
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-[9px] text-[#7777A0]">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
