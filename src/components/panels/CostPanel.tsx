"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";

// Rough cost estimates per model per minute of runtime (based on typical token throughput)
const MODEL_COST_PER_MIN: Record<string, number> = {
  'haiku': 0.003,
  'sonnet': 0.015,
  'opus': 0.075,
  'gemini': 0.01,
  'python': 0,
  'unknown': 0.01,
};

export function CostPanel() {
  const project = useProjectStore((s) => s.project);
  const pipelineStatus = useProjectStore((s) => s.pipelineStatus);
  const [expanded, setExpanded] = useState(false);

  if (!project) return null;

  // Calculate costs from live pipeline data
  const agentCosts: { name: string; model: string; durationMs: number; estimatedCost: number }[] = [];
  let totalCost = 0;

  if (pipelineStatus?.agents) {
    for (const agent of project.agents) {
      const status = pipelineStatus.agents[agent.id];
      if (status?.durationMs && status.durationMs > 0) {
        const minutes = status.durationMs / 60000;
        const rate = MODEL_COST_PER_MIN[agent.modelFamily] ?? MODEL_COST_PER_MIN['unknown'];
        const cost = minutes * rate;
        totalCost += cost;
        agentCosts.push({
          name: agent.name.replace(/_/g, ' '),
          model: agent.modelFamily,
          durationMs: status.durationMs,
          estimatedCost: cost,
        });
      }
    }
  }

  agentCosts.sort((a, b) => b.estimatedCost - a.estimatedCost);

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all
          ${expanded
            ? 'glass-strong border border-[#2ECC71]/30 text-[#2ECC71]'
            : 'glass border border-transparent text-[#9999BB] hover:text-[#E0E0F0]'
          }
        `}
      >
        <span className="text-[13px]">$</span>
        {totalCost > 0 ? `~$${totalCost.toFixed(3)}` : 'Cost'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 glass-strong rounded-xl border border-[#1E1E3A] shadow-xl shadow-black/30 w-72 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#1E1E3A]">
              <h3 className="text-xs font-semibold text-[#E0E0F0]">Estimated Run Cost</h3>
              <p className="text-[9px] text-[#7777A0] mt-0.5">Based on model rates &times; runtime duration</p>
            </div>

            {agentCosts.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[11px] text-[#7777A0]">No cost data yet</p>
                <p className="text-[10px] text-[#555577] mt-1">Enable live monitoring to track pipeline costs</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {agentCosts.map((ac) => (
                  <div key={ac.name} className="px-4 py-2 border-b border-[#1E1E3A]/50 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#E0E0F0] truncate">{ac.name}</p>
                      <p className="text-[9px] text-[#7777A0]">
                        {ac.model} &middot; {formatDuration(ac.durationMs)}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#2ECC71] font-mono ml-2">
                      ${ac.estimatedCost.toFixed(4)}
                    </span>
                  </div>
                ))}
                <div className="px-4 py-2.5 flex items-center justify-between bg-[#1E1E3A]/30">
                  <span className="text-[11px] text-[#9999BB] font-medium">Total</span>
                  <span className="text-[12px] text-[#2ECC71] font-mono font-bold">
                    ~${totalCost.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            <div className="px-4 py-2 border-t border-[#1E1E3A]">
              <p className="text-[8px] text-[#555577]">
                Estimates based on approximate model pricing. Actual costs depend on token count.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}
