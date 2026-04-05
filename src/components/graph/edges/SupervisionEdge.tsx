"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function SupervisionEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    borderRadius: 20,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: "#F5A623",
          strokeWidth: 2,
          strokeDasharray: "6 4",
          opacity: 0.5,
        }}
      />
    </>
  );
}

export const SupervisionEdge = memo(SupervisionEdgeComponent);
