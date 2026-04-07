"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { getAgentColors, STATUS_COLORS } from "@/lib/theme/colors";

export function AgentDetailPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedId = useProjectStore((s) => s.selectedAgentId);
  const selectAgent = useProjectStore((s) => s.selectAgent);
  const agentNotes = useProjectStore((s) => s.agentNotes);
  const setAgentNote = useProjectStore((s) => s.setAgentNote);
  const manualEdges = useProjectStore((s) => s.manualEdges);
  const removeManualEdge = useProjectStore((s) => s.removeManualEdge);

  const agent = project?.agents.find((a) => a.id === selectedId) ?? null;

  // Find connected agents (parsed + manual edges)
  const allEdges = [...(project?.edges ?? []), ...manualEdges];
  const connections = allEdges.filter(
    (e) => e.source === selectedId || e.target === selectedId
  );

  const upstreamIds = connections.filter((e) => e.target === selectedId).map((e) => e.source);
  const downstreamIds = connections.filter((e) => e.source === selectedId).map((e) => e.target);

  // Manual edges for this agent (for delete buttons)
  const agentManualEdges = manualEdges.filter(
    (e) => e.source === selectedId || e.target === selectedId
  );

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 h-full w-[380px] glass-strong border-l border-[#1E1E3A] z-20 overflow-y-auto"
        >
          <div className="p-6">
            {/* Close button */}
            <button
              onClick={() => selectAgent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#1E1E3A] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: STATUS_COLORS[agent.status] ?? STATUS_COLORS.active }}
                />
                <span className="text-[10px] uppercase tracking-wider text-[#9999BB] font-medium">
                  {agent.status}
                </span>
              </div>
              <h2
                className="text-xl font-bold"
                style={{ color: getAgentColors(agent).text }}
              >
                {agent.name.replace(/_/g, " ")}
              </h2>
            </div>

            {/* Info grid */}
            <div className="space-y-4 mb-6">
              <InfoRow label="Role" value={agent.role} />
              <InfoRow label="Model" value={agent.model || "N/A"} />
              {agent.script && <InfoRow label="Script" value={agent.script} mono />}
              {agent.skillFile && <InfoRow label="Skill" value={agent.skillFile} mono />}
              {agent.phase !== null && <InfoRow label="Phase" value={`Phase ${agent.phase}`} />}
              {agent.schedule && <InfoRow label="Schedule" value={agent.schedule} />}
            </div>

            {/* Health */}
            {agent.script && agent.script !== 'N/A' && (
              <HealthIndicator agentId={agent.id} />
            )}

            {/* Git info */}
            <GitInfoDisplay agentId={agent.id} />

            {/* Connections */}
            {connections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-3">
                  Connections
                </h3>
                {upstreamIds.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-[#7777A0] uppercase">Receives from</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {upstreamIds.map((id) => {
                        const a = project?.agents.find((x) => x.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => selectAgent(id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#2E2E52] transition-all"
                          >
                            {a?.name.replace(/_/g, " ") ?? id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {downstreamIds.length > 0 && (
                  <div>
                    <span className="text-[10px] text-[#7777A0] uppercase">Sends to</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {downstreamIds.map((id) => {
                        const a = project?.agents.find((x) => x.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => selectAgent(id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] hover:bg-[#2E2E52] transition-all"
                          >
                            {a?.name.replace(/_/g, " ") ?? id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {agent.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {agent.description && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Description
                </h3>
                <p className="text-[12px] text-[#B0B0CC] leading-relaxed">
                  {agent.description}
                </p>
              </div>
            )}

            {/* Instructions (SKILL.md content) */}
            {agent.instructions && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Instructions
                </h3>
                <div className="text-[11px] text-[#9999BB] leading-relaxed font-mono bg-[#0A0A1B] rounded-xl p-4 border border-[#1E1E3A] max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {agent.instructions.slice(0, 2000)}
                  {agent.instructions.length > 2000 && "..."}
                </div>
              </div>
            )}

            {/* Manual edges */}
            {agentManualEdges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Manual Connections
                </h3>
                <div className="space-y-1.5">
                  {agentManualEdges.map((e) => {
                    const otherId = e.source === selectedId ? e.target : e.source;
                    const other = project?.agents.find((a) => a.id === otherId);
                    const direction = e.source === selectedId ? '→' : '←';
                    return (
                      <div key={e.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#9999BB]">
                          {direction} {other?.name.replace(/_/g, ' ') ?? otherId}
                        </span>
                        <button
                          onClick={() => removeManualEdge(e.id)}
                          className="text-[#7777A0] hover:text-red-400 transition-colors text-[9px] px-1.5 py-0.5 rounded bg-[#1E1E3A]"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                Notes
              </h3>
              <NoteEditor
                agentId={agent.id}
                value={agentNotes[agent.id] ?? ''}
                onChange={setAgentNote}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GitInfoDisplay({ agentId }: { agentId: string }) {
  const gitInfo = useProjectStore((s) => s.gitInfo);
  const info = gitInfo[agentId];
  if (!info) return null;

  return (
    <div className="mb-6 flex items-start gap-2">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7777A0" strokeWidth="2" className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="3" />
        <line x1="3" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="21" y2="12" />
      </svg>
      <div>
        <p className="text-[11px] text-[#9999BB]">
          Changed {info.lastModifiedRelative} by <span className="text-[#E0E0F0]">{info.lastAuthor}</span>
        </p>
        <p className="text-[10px] text-[#7777A0] truncate max-w-[280px]">
          {info.lastCommitMessage}
        </p>
      </div>
    </div>
  );
}

function HealthIndicator({ agentId }: { agentId: string }) {
  // Read health from graph page's bulk fetch (via node data injection)
  // Fall back to a direct fetch if not available
  const [health, setHealth] = useState<{ scriptExists: boolean; scriptLastModified: string | null; staleDays: number | null } | null>(null);
  const projectPath = useProjectStore((s) => s.projectPath);
  const project = useProjectStore((s) => s.project);
  const agent = project?.agents.find(a => a.id === agentId);

  useEffect(() => {
    if (!projectPath || !agent?.script || agent.script === 'N/A') return;
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, scripts: [{ agentId, scriptPath: agent.script }] }),
    })
      .then(res => res.json())
      .then(json => { if (json.data?.[agentId]) setHealth(json.data[agentId]); })
      .catch(() => {});
  }, [agentId, agent?.script, projectPath]);

  if (!health) return null;

  const color = !health.scriptExists ? '#E74C3C' : (health.staleDays ?? 0) > 30 ? '#F39C12' : '#2ECC71';
  const label = !health.scriptExists
    ? 'Script not found'
    : (health.staleDays ?? 0) > 30
      ? `Script stale — modified ${health.staleDays}d ago`
      : health.scriptLastModified
        ? `Script healthy — modified ${formatRelativeTime(health.scriptLastModified)}`
        : 'Script found';

  return (
    <div className="mb-6 flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[11px] text-[#9999BB]">{label}</span>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NoteEditor({ agentId, value, onChange }: { agentId: string; value: string; onChange: (id: string, text: string) => void }) {
  const [text, setText] = useState(value);

  // Sync when switching agents
  useEffect(() => { setText(value); }, [value]);

  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(agentId, text)}
      placeholder="Add notes about this agent..."
      className="
        w-full h-20 px-3 py-2 rounded-xl text-[12px]
        bg-[#0A0A1B] border border-[#1E1E3A] text-[#B0B0CC]
        placeholder-[#555577] resize-none
        focus:outline-none focus:border-[#F5A623]/30 focus:ring-1 focus:ring-[#F5A623]/10
        transition-all duration-200
      "
    />
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-[#7777A0] block mb-0.5">
        {label}
      </span>
      <span className={`text-[13px] text-[#B0B0CC] ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
