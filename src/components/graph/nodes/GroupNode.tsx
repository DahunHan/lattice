"use client";

import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";

function GroupNodeComponent({ data }: NodeProps<Node<{ label: string }>>) {
  return (
    <div className="w-full h-full relative">
      <span className="absolute top-2 left-3 text-[10px] font-semibold text-[#F5A623]/40 uppercase tracking-wider">
        {data.label}
      </span>
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
