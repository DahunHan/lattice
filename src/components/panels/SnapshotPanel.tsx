"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { hasDiffChanges } from "@/lib/snapshot/diffEngine";

export function SnapshotPanel() {
  const project = useProjectStore((s) => s.project);
  const snapshots = useProjectStore((s) => s.snapshots);
  const activeComparisonId = useProjectStore((s) => s.activeComparisonId);
  const diffResult = useProjectStore((s) => s.diffResult);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);
  const deleteSnapshot = useProjectStore((s) => s.deleteSnapshot);
  const compareWith = useProjectStore((s) => s.compareWith);
  const clearComparison = useProjectStore((s) => s.clearComparison);

  const [expanded, setExpanded] = useState(false);

  if (!project) return null;

  const isComparing = activeComparisonId !== null && diffResult !== null;
  const hasChanges = diffResult ? hasDiffChanges(diffResult) : false;

  return (
    <div className="absolute top-4 right-4 z-10">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium
          transition-all duration-200
          ${isComparing
            ? 'glass-strong border border-[#F5A623]/30 text-[#F5A623]'
            : 'glass border border-transparent text-[#9999BB] hover:text-[#E0E0F0]'
          }
        `}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {isComparing ? 'Comparing' : `Snapshots${snapshots.length > 0 ? ` (${snapshots.length})` : ''}`}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mt-2 glass-strong rounded-xl border border-[#1E1E3A] shadow-xl shadow-black/30 w-72 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1E1E3A] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E0E0F0]">Snapshots</span>
              <button
                onClick={() => saveSnapshot()}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#F5A623]/15 text-[#F5A623] hover:bg-[#F5A623]/25 transition-colors font-medium"
              >
                Save Current
              </button>
            </div>

            {/* Comparison summary */}
            {isComparing && diffResult && (
              <div className="px-4 py-3 border-b border-[#1E1E3A] bg-[#F5A623]/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-[#F5A623]">
                    {hasChanges ? 'Changes detected' : 'No changes'}
                  </span>
                  <button
                    onClick={clearComparison}
                    className="text-[9px] text-[#7777A0] hover:text-[#E0E0F0] transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {hasChanges && (
                  <div className="flex gap-3 text-[10px]">
                    {diffResult.added.length > 0 && (
                      <span className="text-[#2ECC71]">+{diffResult.added.length} added</span>
                    )}
                    {diffResult.removed.length > 0 && (
                      <span className="text-red-400">-{diffResult.removed.length} removed</span>
                    )}
                    {diffResult.changed.length > 0 && (
                      <span className="text-amber-400">~{diffResult.changed.length} changed</span>
                    )}
                    {(diffResult.edgesAdded.length > 0 || diffResult.edgesRemoved.length > 0) && (
                      <span className="text-[#4A9EE0]">
                        {diffResult.edgesAdded.length + diffResult.edgesRemoved.length} edge{diffResult.edgesAdded.length + diffResult.edgesRemoved.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Snapshot list */}
            <div className="max-h-48 overflow-y-auto">
              {snapshots.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] text-[#7777A0]">No snapshots yet</p>
                  <p className="text-[10px] text-[#555577] mt-1">Save a snapshot to track changes over time</p>
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className={`
                      px-4 py-2.5 border-b border-[#1E1E3A]/50 flex items-center justify-between
                      ${activeComparisonId === snap.id ? 'bg-[#F5A623]/5' : 'hover:bg-[#1E1E3A]/30'}
                      transition-colors
                    `}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#E0E0F0] truncate">{snap.label}</p>
                      <p className="text-[9px] text-[#7777A0]">
                        {formatTimestamp(snap.timestamp)} &middot; {snap.projectData.agents.length} agents
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      {activeComparisonId === snap.id ? (
                        <button
                          onClick={clearComparison}
                          className="text-[9px] px-2 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623]"
                        >
                          Active
                        </button>
                      ) : (
                        <button
                          onClick={() => compareWith(snap.id)}
                          className="text-[9px] px-2 py-0.5 rounded bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] transition-colors"
                        >
                          Compare
                        </button>
                      )}
                      <button
                        onClick={() => deleteSnapshot(snap.id)}
                        className="text-[#7777A0] hover:text-red-400 transition-colors p-0.5"
                        aria-label={`Delete ${snap.label}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
