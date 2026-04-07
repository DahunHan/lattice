"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";

interface DiscoveredLog {
  directory: string;
  files: { name: string; size: number; mtime: string }[];
  pattern: string;
}

export function LogSettings() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const logDir = useProjectStore((s) => s.logDir);
  const logPattern = useProjectStore((s) => s.logPattern);
  const setLogConfig = useProjectStore((s) => s.setLogConfig);
  const monitoringEnabled = useProjectStore((s) => s.monitoringEnabled);

  const [open, setOpen] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredLog[]>([]);
  const [customDir, setCustomDir] = useState(logDir ?? '');
  const [customPattern, setCustomPattern] = useState(logPattern ?? '');
  const [loading, setLoading] = useState(false);

  // Auto-discover logs when panel opens
  useEffect(() => {
    if (!open || !projectPath) return;
    setLoading(true);
    fetch('/api/discover-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.discovered) setDiscovered(json.discovered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectPath]);

  if (!projectPath || !monitoringEnabled) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[9px] text-[#7777A0] hover:text-[#9999BB] transition-colors px-1.5 py-0.5 rounded"
        title="Configure log monitoring"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 glass-strong rounded-xl border border-[#1E1E3A] shadow-xl shadow-black/30 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#1E1E3A]">
              <h3 className="text-xs font-semibold text-[#E0E0F0]">Log Monitoring Settings</h3>
              <p className="text-[9px] text-[#7777A0] mt-0.5">Configure where Lattice looks for pipeline logs</p>
            </div>

            {/* Discovered logs */}
            {loading ? (
              <div className="px-4 py-3 text-[10px] text-[#7777A0]">Scanning for log files...</div>
            ) : discovered.length > 0 ? (
              <div className="px-4 py-3 border-b border-[#1E1E3A]">
                <span className="text-[10px] text-[#9999BB] font-medium">Detected log directories:</span>
                <div className="mt-2 space-y-1.5">
                  {discovered.map((d) => (
                    <button
                      key={d.directory}
                      onClick={() => {
                        setCustomDir(d.directory);
                        setCustomPattern(d.pattern);
                        setLogConfig(d.directory, d.pattern);
                      }}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-[10px] transition-colors
                        ${logDir === d.directory
                          ? 'bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623]'
                          : 'bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0]'
                        }
                      `}
                    >
                      <div className="font-mono font-medium">{d.directory}/</div>
                      <div className="text-[9px] text-[#7777A0] mt-0.5">
                        {d.files.length} file{d.files.length !== 1 ? 's' : ''} &middot; pattern: {d.pattern}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-[#1E1E3A] text-[10px] text-[#7777A0]">
                No log directories found automatically. Configure manually below.
              </div>
            )}

            {/* Custom config */}
            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="text-[9px] text-[#7777A0] uppercase tracking-wider block mb-1">
                  Log directory (relative to project root)
                </label>
                <input
                  type="text"
                  value={customDir}
                  onChange={(e) => setCustomDir(e.target.value)}
                  placeholder="logs"
                  className="w-full px-3 py-1.5 rounded-lg text-[11px] font-mono bg-[#0A0A1B] border border-[#1E1E3A] text-[#E0E0F0] placeholder-[#555577] focus:outline-none focus:border-[#F5A623]/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-[#7777A0] uppercase tracking-wider block mb-1">
                  File pattern
                </label>
                <input
                  type="text"
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  placeholder="pipeline_*.log"
                  className="w-full px-3 py-1.5 rounded-lg text-[11px] font-mono bg-[#0A0A1B] border border-[#1E1E3A] text-[#E0E0F0] placeholder-[#555577] focus:outline-none focus:border-[#F5A623]/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLogConfig(customDir || null, customPattern || null);
                    setOpen(false);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#F5A623]/15 text-[#F5A623] hover:bg-[#F5A623]/25 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setCustomDir('');
                    setCustomPattern('');
                    setLogConfig(null, null);
                    setOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] text-[#7777A0] bg-[#1E1E3A] hover:text-[#9999BB] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
