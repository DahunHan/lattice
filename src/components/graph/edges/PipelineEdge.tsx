"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function PipelineEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: "#4A9EE0",
          strokeWidth: 6,
          opacity: 0.15,
          filter: "blur(4px)",
        }}
      />
      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: "#4A9EE0",
          strokeWidth: 2,
          opacity: 0.8,
        }}
      />
      {/* Animated flow dots */}
      <path
        d={edgePath}
        fill="none"
        stroke="#4A9EE0"
        strokeWidth="2"
        strokeDasharray="6 8"
        className="animated-edge"
        style={{ opacity: 0.6 }}
      />
      {/* Arrow marker at end */}
      <circle r="3" fill="#4A9EE0" opacity="0.8">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}

export const PipelineEdge = memo(PipelineEdgeComponent);
