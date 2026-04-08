"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { MODEL_COLORS, ORCHESTRATOR_COLORS } from "@/lib/theme/colors";
import { useProjectStore } from "@/store/useProjectStore";
import type { ModelFamily } from "@/lib/types";

const MODEL_LABELS: Record<ModelFamily, string> = {
  haiku: 'Haiku',
  sonnet: 'Sonnet',
  opus: 'Opus',
  gpt: 'GPT',
  'o-series': 'o-series',
  gemini: 'Gemini',
  llama: 'Llama',
  mistral: 'Mistral',
  deepseek: 'Deepseek',
  python: 'Python',
  unknown: 'Other',
};

const edgeItems = [
  { label: "Pipeline", style: "solid", color: "#4A9EE0" },
  { label: "Supervision", style: "dashed", color: "#F5A623" },
  { label: "Data Flow", style: "solid", color: "#7F8C8D" },
];

export function Legend() {
  const project = useProjectStore((s) => s.project);
  const [pos, setPos] = useState({ x: 16, y: -80 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Only show model colors that are actually used in this project
  const activeItems = useMemo(() => {
    if (!project) return [];
    const usedFamilies = new Set<string>();
    let hasOrchestrator = false;

    for (const agent of project.agents) {
      if (agent.status === 'archived') continue;
      if (agent.isOrchestrator) hasOrchestrator = true;
      usedFamilies.add(agent.modelFamily);
    }

    const items: { label: string; color: string }[] = [];
    if (hasOrchestrator) {
      items.push({ label: 'Orchestrator', color: ORCHESTRATOR_COLORS.border });
    }
    for (const family of usedFamilies) {
      if (family === 'unknown' && usedFamilies.size > 1) continue; // Skip 'unknown' if other models exist
      const colors = MODEL_COLORS[family as ModelFamily];
      if (colors) {
        items.push({ label: MODEL_LABELS[family as ModelFamily] ?? family, color: colors.border });
      }
    }
    return items;
  }, [project]);

  // Only show edge types that exist in the project
  const activeEdgeItems = useMemo(() => {
    if (!project) return edgeItems;
    const usedTypes = new Set(project.edges.map(e => e.type));
    return edgeItems.filter(item => {
      if (item.label === 'Pipeline') return usedTypes.has('pipeline');
      if (item.label === 'Supervision') return usedTypes.has('supervision');
      if (item.label === 'Data Flow') return usedTypes.has('data-flow');
      return true;
    });
  }, [project]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  if (activeItems.length === 0) return null;

  return (
    <div
      className="absolute z-10 glass rounded-xl px-4 py-3 shadow-lg shadow-black/20 cursor-grab active:cursor-grabbing select-none"
      style={{ left: pos.x, bottom: -pos.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-3 flex-wrap mb-2">
        {activeItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-[#9999BB]">{item.label}</span>
          </div>
        ))}
      </div>
      {activeEdgeItems.length > 0 && (
        <div className="flex items-center gap-3">
          {activeEdgeItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-5 h-0"
                style={{
                  borderTop: `2px ${item.style} ${item.color}`,
                  opacity: item.style === "dashed" ? 0.5 : 0.8,
                }}
              />
              <span className="text-[10px] text-[#9999BB]">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
