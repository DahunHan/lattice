"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PATTERN_META, type PatternInfo, type PatternGroup } from "@/lib/patterns/patternDetector";

interface PatternBadgeProps {
  overall: PatternInfo;
  groups: PatternGroup[];
}

export function PatternBadge({ overall, groups }: PatternBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = PATTERN_META[overall.pattern];

  return (
    <div className="absolute top-16 left-4 z-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-medium glass transition-all hover:scale-[1.02]"
        style={{ borderColor: `${meta.color}30`, borderWidth: 1 }}
      >
        <span style={{ color: meta.color }} className="text-sm">{meta.icon}</span>
        <span style={{ color: meta.color }}>{meta.label}</span>
        <span className="text-[#7777A0]">
          {Math.round(overall.confidence * 100)}%
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mt-2 glass-strong rounded-xl border border-[#1E1E3A] shadow-xl shadow-black/30 w-80 overflow-hidden"
          >
            {/* Overall pattern */}
            <div className="px-4 py-3 border-b border-[#1E1E3A]">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: meta.color }} className="text-lg">{meta.icon}</span>
                <span className="text-xs font-bold text-[#E0E0F0]">{meta.label} Pattern</span>
              </div>
              <p className="text-[10px] text-[#9999BB]">{overall.description}</p>
              <p className="text-[9px] text-[#7777A0] mt-1">{overall.details}</p>
            </div>

            {/* Pattern descriptions */}
            <div className="px-4 py-3 border-b border-[#1E1E3A]">
              <span className="text-[9px] text-[#7777A0] uppercase tracking-wider">What this means</span>
              <div className="mt-2 text-[10px] text-[#9999BB] space-y-1.5">
                {overall.pattern === 'sequential' && (
                  <p>Tasks flow linearly from one agent to the next. Each agent builds on the previous output. Simple and predictable.</p>
                )}
                {overall.pattern === 'split-merge' && (
                  <p>A hub agent distributes work to multiple specialists, then collects results. Efficient for parallel independent tasks.</p>
                )}
                {overall.pattern === 'operator' && (
                  <p>Multiple isolated workflows running in parallel. No shared context between groups — like separate terminal windows.</p>
                )}
                {overall.pattern === 'agent-teams' && (
                  <p>Agents collaborate directly, sharing findings through a task list. Higher token cost but better for complex coordination.</p>
                )}
                {overall.pattern === 'headless' && (
                  <p>Autonomous execution on schedule — no human in the loop. Best for repetitive tasks where output is easy to verify.</p>
                )}
                {overall.pattern === 'hybrid' && (
                  <p>Mix of patterns — an orchestrator supervises agents that may run sequentially or in parallel.</p>
                )}
              </div>
            </div>

            {/* Per-group patterns */}
            {groups.length > 1 && (
              <div className="px-4 py-3">
                <span className="text-[9px] text-[#7777A0] uppercase tracking-wider">Per-team patterns</span>
                <div className="mt-2 space-y-1.5">
                  {groups.map((g) => {
                    const gMeta = PATTERN_META[g.pattern];
                    return (
                      <div key={g.name} className="flex items-center justify-between text-[10px]">
                        <span className="text-[#E0E0F0]">{g.name}</span>
                        <span className="flex items-center gap-1.5" style={{ color: gMeta.color }}>
                          <span>{gMeta.icon}</span>
                          <span>{gMeta.label}</span>
                          <span className="text-[#7777A0]">({g.agentIds.length})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
