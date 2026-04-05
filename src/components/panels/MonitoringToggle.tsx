"use client";

import { useProjectStore } from "@/store/useProjectStore";

export function MonitoringToggle() {
  const monitoringEnabled = useProjectStore((s) => s.monitoringEnabled);
  const toggle = useProjectStore((s) => s.toggleMonitoring);

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium
        transition-all duration-200
        ${monitoringEnabled
          ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
          : 'bg-[#1E1E3A] text-[#7777A0] border border-[#1E1E3A] hover:border-[#2E2E52] hover:text-[#9999BB]'
        }
      `}
      aria-label={monitoringEnabled ? 'Disable live monitoring' : 'Enable live monitoring'}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${monitoringEnabled ? 'bg-[#F5A623] animate-pulse' : 'bg-[#7777A0]'}`} />
      {monitoringEnabled ? 'Live' : 'Monitor'}
    </button>
  );
}
