"use client";

import { useProjectStore } from "@/store/useProjectStore";

export function ProjectOverview() {
  const project = useProjectStore((s) => s.project);
  const showArchived = useProjectStore((s) => s.showArchived);
  const toggleShowArchived = useProjectStore((s) => s.toggleShowArchived);

  if (!project) return null;

  const activeCount = project.agents.filter((a) => a.status === "active").length;
  const archivedCount = project.agents.filter((a) => a.status === "archived").length;
  const pipelineCount = project.pipeline.length;

  return (
    <div className="absolute top-4 left-4 z-10 glass rounded-xl px-5 py-4 shadow-lg shadow-black/20 max-w-[280px] max-h-[280px] overflow-y-auto">
      {/* Project name */}
      <h2 className="text-sm font-bold text-[#E0E0F0] mb-1">
        {project.metadata.name}
      </h2>

      {/* Goal */}
      {project.metadata.goal && (
        <p className="text-[11px] text-[#9999BB] leading-relaxed mb-3 line-clamp-3">
          {project.metadata.goal}
        </p>
      )}

      {/* Stats */}
      <div className="flex gap-4 mb-3">
        <Stat value={activeCount} label="Agents" accent />
        <Stat value={pipelineCount} label="Phases" />
        <Stat value={project.edges.length} label="Edges" />
        <Stat value={project.rawFiles.length} label="Files" />
        {project.warnings.length > 0 && (
          <Stat value={project.warnings.length} label="Warns" warn />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={toggleShowArchived}
            className="sr-only"
          />
          <div
            className={`w-8 h-4 rounded-full transition-colors duration-200 ${
              showArchived ? "bg-[#F5A623]" : "bg-[#1E1E3A]"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 mt-0.5 ${
                showArchived ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-[10px] text-[#9999BB]">
            Archived ({archivedCount})
          </span>
        </label>
      </div>
    </div>
  );
}

function Stat({ value, label, accent, warn }: { value: number; label: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${warn ? 'text-amber-400' : accent ? 'text-[#F5A623]' : 'text-[#E0E0F0]'}`}>{value}</div>
      <div className="text-[9px] text-[#7777A0] uppercase tracking-wider">{label}</div>
    </div>
  );
}
