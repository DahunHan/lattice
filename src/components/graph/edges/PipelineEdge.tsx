"use client";

import { memo, useMemo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

const PIPELINE_COLOR = "#4A9EE0";

// Check prefers-reduced-motion (safe for SSR)
function usePrefersReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

function PipelineEdgeComponent(props: EdgeProps) {
  const reducedMotion = usePrefersReducedMotion();

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
          stroke: PIPELINE_COLOR,
          strokeWidth: 6,
          opacity: 0.15,
          filter: "blur(4px)",
        }}
      />
      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: PIPELINE_COLOR,
          strokeWidth: 2,
          opacity: 0.8,
        }}
      />
      {/* Animated flow dots */}
      <path
        d={edgePath}
        fill="none"
        stroke={PIPELINE_COLOR}
        strokeWidth="2"
        strokeDasharray="6 8"
        className={reducedMotion ? "" : "animated-edge"}
        style={{ opacity: 0.6 }}
      />
      {/* Orbiting dot — hidden when reduced motion preferred */}
      {!reducedMotion && (
        <circle r="3" fill={PIPELINE_COLOR} opacity="0.8">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

export const PipelineEdge = memo(PipelineEdgeComponent);
