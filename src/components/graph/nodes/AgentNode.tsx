"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { AgentNodeData, RunState } from "@/lib/types";
import { getAgentColors, STATUS_COLORS } from "@/lib/theme/colors";

const RUN_STATE_COLORS: Record<RunState, string> = {
  idle: '#7777A0',
  running: '#F5A623',
  success: '#2ECC71',
  failed: '#E74C3C',
  waiting: '#F39C12',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

const DIFF_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  added: { label: 'NEW', color: '#2ECC71', bg: '#2ECC71' },
  removed: { label: 'DEL', color: '#E74C3C', bg: '#E74C3C' },
  changed: { label: 'MOD', color: '#F5A623', bg: '#F5A623' },
};

function AgentNodeComponent({ data }: NodeProps<Node<AgentNodeData>>) {
  const { agent, isPaused, liveStatus, diffStatus, hasNote, health } = data;
  const colors = getAgentColors(agent);
  const isLive = liveStatus && liveStatus.state !== 'idle';
  const isRunning = liveStatus?.state === 'running';
  const isFailed = liveStatus?.state === 'failed';

  const statusColor = isLive
    ? RUN_STATE_COLORS[liveStatus.state]
    : isPaused
      ? STATUS_COLORS.paused
      : STATUS_COLORS[agent.status] ?? STATUS_COLORS.active;

  const displayName = agent.name.replace(/_/g, " ");

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-3 !h-3" />
      <div
        className="group relative transition-smooth cursor-pointer"
        style={{
          opacity: agent.status === "archived" ? 0.4 : isPaused ? 0.6 : 1,
          filter: agent.status === "archived" ? "grayscale(0.6)" : "none",
        }}
      >
        {/* Glow layer — intensified when running */}
        <div
          className={`absolute -inset-1 rounded-2xl transition-opacity duration-300 blur-md ${
            isRunning ? "opacity-80" : isFailed ? "opacity-60" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ background: isRunning ? RUN_STATE_COLORS.running + '66' : isFailed ? RUN_STATE_COLORS.failed + '44' : colors.glow }}
        />

        {/* Running ring animation */}
        {isRunning && (
          <div
            className="absolute -inset-2 rounded-2xl animate-pulse"
            style={{
              border: `2px solid ${RUN_STATE_COLORS.running}40`,
              borderRadius: '16px',
            }}
          />
        )}

        {/* Diff badge */}
        {diffStatus && DIFF_BADGE[diffStatus] && (
          <div
            className="absolute -top-2 -right-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
            style={{
              background: DIFF_BADGE[diffStatus].bg + '25',
              color: DIFF_BADGE[diffStatus].color,
              border: `1px solid ${DIFF_BADGE[diffStatus].color}40`,
            }}
          >
            {DIFF_BADGE[diffStatus].label}
          </div>
        )}

        {/* Card */}
        <div
          className="relative glass rounded-2xl px-5 py-4 min-w-[180px] max-w-[220px]"
          style={{
            borderColor: isRunning ? `${RUN_STATE_COLORS.running}60` : isFailed ? `${RUN_STATE_COLORS.failed}60` : `${colors.border}40`,
            borderWidth: isRunning ? "2px" : "1px",
            borderStyle: agent.status === "archived" ? "dashed" : "solid",
            background: `${colors.bg}CC`,
          }}
        >
          {/* Agent name + status indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative shrink-0">
              <div
                className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
                style={{ background: statusColor }}
              />
              {isRunning && (
                <div
                  className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ background: statusColor, opacity: 0.4 }}
                />
              )}
            </div>
            <span className="text-[13px] font-semibold text-[#E0E0F0] truncate leading-tight">
              {displayName}
            </span>
          </div>

          {/* Live status line (replaces role when running) */}
          {isLive ? (
            <div className="mb-2.5">
              <p className="text-[10px] font-medium leading-snug" style={{ color: statusColor }}>
                {liveStatus.state === 'running' ? 'Running...' :
                 liveStatus.state === 'success' ? 'Completed' :
                 liveStatus.state === 'failed' ? 'Failed' :
                 liveStatus.state === 'waiting' ? 'Waiting...' : ''}
                {liveStatus.durationMs !== null && (
                  <span className="text-[#9999BB] ml-1.5">
                    {formatDuration(liveStatus.durationMs)}
                  </span>
                )}
              </p>
              {liveStatus.lastLog && (
                <p className="text-[9px] text-[#7777A0] truncate mt-0.5 font-mono">
                  {liveStatus.lastLog.slice(0, 60)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-[#9999BB] leading-snug line-clamp-2 mb-2.5">
              {agent.role}
            </p>
          )}

          {/* Bottom row: model chip + phase */}
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: `${colors.border}25`,
                color: colors.text,
                border: `1px solid ${colors.border}40`,
              }}
            >
              {agent.modelFamily === "python" ? "Python" : agent.modelFamily.charAt(0).toUpperCase() + agent.modelFamily.slice(1)}
            </span>
            {agent.phase !== null && (
              <span className="text-[9px] text-[#9999BB] font-mono">
                Phase {agent.phase}
              </span>
            )}
            {hasNote && (
              <span className="text-[9px] text-[#F5A623]/60" title="Has notes">
                &#9998;
              </span>
            )}
            {health && (
              <div
                className="w-2 h-2 rounded-full ml-auto"
                title={health.scriptExists
                  ? `Modified ${health.staleDays}d ago`
                  : 'Script not found'}
                style={{
                  background: !health.scriptExists ? '#E74C3C'
                    : (health.staleDays ?? 0) > 30 ? '#F39C12'
                    : '#2ECC71',
                }}
              />
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-3 !h-3" />
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
