"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { getAgentColors, STATUS_COLORS } from "@/lib/theme/colors";

export function AgentDetailPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedId = useProjectStore((s) => s.selectedAgentId);
  const selectAgent = useProjectStore((s) => s.selectAgent);

  const agent = project?.agents.find((a) => a.id === selectedId) ?? null;

  // Find connected agents
  const connections = project?.edges.filter(
    (e) => e.source === selectedId || e.target === selectedId
  ) ?? [];

  const upstreamIds = connections.filter((e) => e.target === selectedId).map((e) => e.source);
  const downstreamIds = connections.filter((e) => e.source === selectedId).map((e) => e.target);

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 h-full w-[380px] glass-strong border-l border-[#1E1E3A] z-20 overflow-y-auto"
        >
          <div className="p-6">
            {/* Close button */}
            <button
              onClick={() => selectAgent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#1E1E3A] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: STATUS_COLORS[agent.status] ?? STATUS_COLORS.active }}
                />
                <span className="text-[10px] uppercase tracking-wider text-[#9999BB] font-medium">
                  {agent.status}
                </span>
              </div>
              <h2
                className="text-xl font-bold"
                style={{ color: getAgentColors(agent).text }}
              >
                {agent.name.replace(/_/g, " ")}
              </h2>
            </div>

            {/* Info grid */}
            <div className="space-y-4 mb-6">
              <InfoRow label="Role" value={agent.role} />
              <InfoRow label="Model" value={agent.model || "N/A"} />
              {agent.script && <InfoRow label="Script" value={agent.script} mono />}
              {agent.skillFile && <InfoRow label="Skill" value={agent.skillFile} mono />}
              {agent.phase !== null && <InfoRow label="Phase" value={`Phase ${agent.phase}`} />}
              {agent.schedule && <InfoRow label="Schedule" value={agent.schedule} />}
            </div>

            {/* Connections */}
            {connections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-3">
                  Connections
                </h3>
                {upstreamIds.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-[#7777A0] uppercase">Receives from</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {upstreamIds.map((id) => {
                        const a = project?.agents.find((x) => x.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => selectAgent(id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#2E2E52] transition-all"
                          >
                            {a?.name.replace(/_/g, " ") ?? id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {downstreamIds.length > 0 && (
                  <div>
                    <span className="text-[10px] text-[#7777A0] uppercase">Sends to</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {downstreamIds.map((id) => {
                        const a = project?.agents.find((x) => x.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => selectAgent(id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#2E2E52] transition-all"
                          >
                            {a?.name.replace(/_/g, " ") ?? id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {agent.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {agent.description && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Description
                </h3>
                <p className="text-[12px] text-[#B0B0CC] leading-relaxed">
                  {agent.description}
                </p>
              </div>
            )}

            {/* Instructions (SKILL.md content) */}
            {agent.instructions && (
              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Instructions
                </h3>
                <div className="text-[11px] text-[#9999BB] leading-relaxed font-mono bg-[#0A0A1B] rounded-xl p-4 border border-[#1E1E3A] max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {agent.instructions.slice(0, 2000)}
                  {agent.instructions.length > 2000 && "..."}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-[#7777A0] block mb-0.5">
        {label}
      </span>
      <span className={`text-[13px] text-[#B0B0CC] ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
