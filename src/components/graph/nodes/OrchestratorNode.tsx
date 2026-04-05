"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { AgentNodeData } from "@/lib/types";
import { ORCHESTRATOR_COLORS, STATUS_COLORS } from "@/lib/theme/colors";

function OrchestratorNodeComponent({ data }: NodeProps<Node<AgentNodeData>>) {
  const { agent, isPaused } = data;
  const statusColor = isPaused ? STATUS_COLORS.paused : STATUS_COLORS.active;
  const displayName = agent.name.replace(/_/g, " ");

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-3 !h-3" />
      <div
        className="group relative transition-smooth cursor-pointer"
        style={{ opacity: isPaused ? 0.6 : 1 }}
      >
        {/* Strong glow */}
        <div
          className="absolute -inset-2 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 blur-lg"
          style={{ background: ORCHESTRATOR_COLORS.glow }}
        />

        {/* Card */}
        <div
          className="relative glass rounded-2xl px-6 py-5 min-w-[220px] max-w-[260px]"
          style={{
            borderColor: `${ORCHESTRATOR_COLORS.border}50`,
            borderWidth: "2px",
            borderStyle: "solid",
            background: `${ORCHESTRATOR_COLORS.bg}DD`,
          }}
        >
          {/* Crown indicator */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]"
              style={{
                background: ORCHESTRATOR_COLORS.bg,
                border: `2px solid ${ORCHESTRATOR_COLORS.border}`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={ORCHESTRATOR_COLORS.border} stroke="none">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center gap-2 mb-2 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 pulse-glow"
              style={{ background: statusColor }}
            />
            <span
              className="text-[14px] font-bold truncate leading-tight"
              style={{ color: ORCHESTRATOR_COLORS.text }}
            >
              {displayName}
            </span>
          </div>

          {/* Role */}
          <p className="text-[11px] text-[#9999BB] leading-snug line-clamp-2 mb-3">
            {agent.role}
          </p>

          {/* Model chip */}
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: `${ORCHESTRATOR_COLORS.border}20`,
              color: ORCHESTRATOR_COLORS.text,
              border: `1px solid ${ORCHESTRATOR_COLORS.border}40`,
            }}
          >
            Orchestrator
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-3 !h-3" />
    </>
  );
}

export const OrchestratorNode = memo(OrchestratorNodeComponent);
