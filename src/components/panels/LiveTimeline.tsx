"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineStatus, LogEntry } from "@/lib/types";

interface LiveTimelineProps {
  status: PipelineStatus | null;
  isPolling: boolean;
  lastUpdated: Date | null;
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: '#9999BB',
  SUCCESS: '#2ECC71',
  WARN: '#F39C12',
  ERROR: '#E74C3C',
};

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return timestamp.slice(11, 19);
  }
}

export function LiveTimeline({ status, isPolling, lastUpdated }: LiveTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!status) return null;

  const agentEntries = Object.entries(status.agents);
  const successCount = agentEntries.filter(([, s]) => s.state === 'success').length;
  const totalCount = agentEntries.length;
  const runningAgent = agentEntries.find(([, s]) => s.state === 'running');
  const failedAgent = agentEntries.find(([, s]) => s.state === 'failed');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full glass-strong border-t border-[#1E1E3A] px-6 py-2.5 flex items-center justify-between hover:bg-[#12122A]/80 transition-colors focus-visible:ring-2 focus-visible:ring-[#F5A623]"
      >
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'animate-pulse' : ''}`}
              style={{ background: status.isRunning ? '#F5A623' : failedAgent ? '#E74C3C' : '#2ECC71' }}
            />
            <span className="text-[11px] font-medium text-[#E0E0F0]">
              {status.isRunning ? 'Pipeline Running' :
               status.currentPhase === 'pipeline_complete' ? 'Pipeline Complete' :
               failedAgent ? 'Pipeline Failed' : `Phase: ${status.currentPhase}`}
            </span>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-[#1E1E3A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(successCount / totalCount) * 100}%`,
                    background: failedAgent ? '#E74C3C' : '#2ECC71',
                  }}
                />
              </div>
              <span className="text-[10px] text-[#7777A0] font-mono">
                {successCount}/{totalCount}
              </span>
            </div>
          )}

          {/* Currently running agent */}
          {runningAgent && (
            <span className="text-[10px] text-[#F5A623] font-mono">
              {runningAgent[0].replace(/_/g, ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Polling indicator */}
          {isPolling && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse" />
              <span className="text-[9px] text-[#7777A0]">
                Live
              </span>
            </div>
          )}

          {lastUpdated && (
            <span className="text-[9px] text-[#7777A0] font-mono">
              {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          )}

          {/* Expand chevron */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#7777A0" strokeWidth="2"
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
      </button>

      {/* Expanded log viewer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 240 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-strong border-t border-[#1E1E3A] overflow-hidden"
          >
            <div className="h-full overflow-y-auto px-6 py-3">
              {/* Agent status pills */}
              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-[#1E1E3A]">
                {agentEntries.map(([id, s]) => (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{
                      background: s.state === 'running' ? 'rgba(245,166,35,0.1)' :
                                  s.state === 'success' ? 'rgba(46,204,113,0.08)' :
                                  s.state === 'failed' ? 'rgba(231,76,60,0.1)' : 'rgba(30,30,58,0.5)',
                      border: `1px solid ${
                        s.state === 'running' ? 'rgba(245,166,35,0.2)' :
                        s.state === 'success' ? 'rgba(46,204,113,0.15)' :
                        s.state === 'failed' ? 'rgba(231,76,60,0.2)' : 'rgba(30,30,58,0.8)'
                      }`,
                    }}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${s.state === 'running' ? 'animate-pulse' : ''}`}
                      style={{
                        background: s.state === 'running' ? '#F5A623' :
                                    s.state === 'success' ? '#2ECC71' :
                                    s.state === 'failed' ? '#E74C3C' : '#7777A0',
                      }}
                    />
                    <span className="text-[10px] text-[#B0B0CC]">
                      {id.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Log lines */}
              <div className="font-mono text-[10px] leading-relaxed space-y-0.5">
                {status.recentLogs.map((log, i) => (
                  <LogLine key={i} log={log} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  return (
    <div className="flex gap-2 py-0.5 hover:bg-[#1E1E3A]/30 rounded px-1">
      <span className="text-[#7777A0] shrink-0">{formatTime(log.timestamp)}</span>
      <span
        className="shrink-0 w-[52px] text-right"
        style={{ color: LEVEL_COLORS[log.level] ?? '#9999BB' }}
      >
        [{log.level}]
      </span>
      <span className="text-[#B0B0CC] break-all">{log.message}</span>
    </div>
  );
}
