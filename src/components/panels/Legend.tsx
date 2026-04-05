"use client";

import { MODEL_COLORS, ORCHESTRATOR_COLORS } from "@/lib/theme/colors";

const items = [
  { label: "Orchestrator", color: ORCHESTRATOR_COLORS.border },
  { label: "Haiku", color: MODEL_COLORS.haiku.border },
  { label: "Sonnet", color: MODEL_COLORS.sonnet.border },
  { label: "Opus", color: MODEL_COLORS.opus.border },
  { label: "Gemini", color: MODEL_COLORS.gemini.border },
  { label: "Python", color: MODEL_COLORS.python.border },
];

const edgeItems = [
  { label: "Pipeline", style: "solid", color: "#6BB0E8" },
  { label: "Supervision", style: "dashed", color: "#F5A623" },
  { label: "Data Flow", style: "solid", color: "#7F8C8D" },
];

export function Legend() {
  return (
    <div className="absolute bottom-20 left-4 z-10 glass rounded-xl px-4 py-3 shadow-lg shadow-black/20">
      <div className="flex items-center gap-4 mb-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-[#9999BB]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {edgeItems.map((item) => (
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
    </div>
  );
}
