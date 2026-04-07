"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { getAgentColors, STATUS_COLORS } from "@/lib/theme/colors";
import { DiffPreviewModal } from "@/components/modals/DiffPreviewModal";

export function AgentDetailPanel() {
  const project = useProjectStore((s) => s.project);
  const projectPath = useProjectStore((s) => s.projectPath);
  const selectedId = useProjectStore((s) => s.selectedAgentId);
  const selectAgent = useProjectStore((s) => s.selectAgent);
  const agentNotes = useProjectStore((s) => s.agentNotes);
  const setAgentNote = useProjectStore((s) => s.setAgentNote);
  const manualEdges = useProjectStore((s) => s.manualEdges);
  const removeManualEdge = useProjectStore((s) => s.removeManualEdge);
  const pipelineStatus = useProjectStore((s) => s.pipelineStatus);
  const resolvedAgentIds = useProjectStore((s) => s.resolvedAgentIds);
  const markResolved = useProjectStore((s) => s.markResolved);
  const unmarkResolved = useProjectStore((s) => s.unmarkResolved);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);

  // Panel resize
  const [panelWidth, setPanelWidth] = useState(380);
  const isResizing = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(320, Math.min(800, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // Edit state
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [diffModal, setDiffModal] = useState<{ filePath: string; oldContent: string; newContent: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const agent = project?.agents.find((a) => a.id === selectedId) ?? null;

  // Resolve the editable file — prefer sourceFile (always a real path from parsers)
  // skillFile from AGENT_MAP is often just a directory name, not a valid file path
  const editableFile = agent?.sourceFile ?? null;

  // Reset edit state when agent changes
  useEffect(() => {
    setEditingInstructions(false);
    setStatusMessage(null);
  }, [selectedId]);

  const handleInstructionsSave = useCallback(async () => {
    if (!editableFile || !projectPath) return;
    try {
      const res = await fetch(`/api/write-agent?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(editableFile)}`);
      const json = await res.json();
      if (!json.content) return;

      const oldContent = json.content as string;
      const fmEnd = oldContent.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
      const frontmatter = fmEnd ? fmEnd[0] : '';
      const newContent = frontmatter + editedInstructions.trim() + '\n';

      setDiffModal({ filePath: editableFile, oldContent, newContent });
    } catch {
      setStatusMessage({ text: 'Failed to read file', type: 'error' });
    }
  }, [projectPath, editedInstructions, editableFile]);

  const handleStatusChange = useCallback(async (_ag: typeof agent, newStatus: 'active' | 'paused' | 'archived') => {
    if (!editableFile || !projectPath || agent?.status === newStatus) return;
    try {
      const res = await fetch(`/api/write-agent?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(editableFile)}`);
      const json = await res.json();
      if (!json.content) return;

      const oldContent = json.content as string;
      let newContent: string;

      // Update or add status in frontmatter
      if (/^---\s*\n[\s\S]*?status\s*:/m.test(oldContent)) {
        newContent = oldContent.replace(/^(status\s*:\s*).*$/m, `$1${newStatus}`);
      } else if (/^---\s*\n/.test(oldContent)) {
        newContent = oldContent.replace(/^(---\s*\n)/, `$1status: ${newStatus}\n`);
      } else {
        newContent = `---\nstatus: ${newStatus}\n---\n${oldContent}`;
      }

      setDiffModal({ filePath: editableFile, oldContent, newContent });
    } catch {
      setStatusMessage({ text: 'Failed to read file', type: 'error' });
    }
  }, [projectPath, editableFile, agent?.status]);

  const handleConfirmWrite = useCallback(async () => {
    if (!diffModal || !projectPath) return;
    setSaving(true);
    try {
      // Auto-snapshot before write
      saveSnapshot('Before edit');

      const res = await fetch('/api/write-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          filePath: diffModal.filePath,
          newContent: diffModal.newContent,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ text: 'File updated. Re-scan to see changes.', type: 'success' });
        setEditingInstructions(false);
      } else {
        setStatusMessage({ text: json.error || 'Write failed', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Failed to write file', type: 'error' });
    } finally {
      setSaving(false);
      setDiffModal(null);
    }
  }, [diffModal, projectPath, saveSnapshot]);

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
    <>
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 h-full glass-strong border-l border-[#1E1E3A] z-20 overflow-y-auto"
          style={{ width: panelWidth }}
        >
          {/* Resize handle with grip dots */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 left-0 w-3 h-full cursor-col-resize hover:bg-[#F5A623]/10 active:bg-[#F5A623]/20 transition-colors z-10 flex items-center justify-center"
          >
            <div className="flex flex-col gap-1 opacity-30 hover:opacity-60 transition-opacity">
              <div className="w-0.5 h-0.5 rounded-full bg-[#9999BB]" />
              <div className="w-0.5 h-0.5 rounded-full bg-[#9999BB]" />
              <div className="w-0.5 h-0.5 rounded-full bg-[#9999BB]" />
            </div>
          </div>
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

            {/* Manual resolve / unresolve for failed/running agents */}
            {selectedId && pipelineStatus?.agents?.[selectedId] &&
              (pipelineStatus.agents[selectedId].state === 'failed' || pipelineStatus.agents[selectedId].state === 'running') && (
              <div className="mb-6">
                {resolvedAgentIds.has(selectedId) ? (
                  <button
                    onClick={() => unmarkResolved(selectedId)}
                    className="
                      w-full px-4 py-2.5 rounded-xl text-[11px] font-medium
                      bg-[#7777A0]/10 border border-[#7777A0]/20 text-[#9999BB]
                      hover:bg-[#7777A0]/20 transition-colors
                    "
                  >
                    Undo Resolve
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => markResolved(selectedId)}
                      className="
                        w-full px-4 py-2.5 rounded-xl text-[11px] font-medium
                        bg-[#2ECC71]/10 border border-[#2ECC71]/20 text-[#2ECC71]
                        hover:bg-[#2ECC71]/20 transition-colors
                      "
                    >
                      Mark as Resolved
                    </button>
                    <p className="text-[9px] text-[#7777A0] mt-1.5 text-center">
                      Override the failed/running status — e.g. after manual intervention
                    </p>
                  </>
                )}
              </div>
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

            {/* Instructions (SKILL.md content) — editable */}
            {agent.instructions && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium">
                    Instructions
                  </h3>
                  {projectPath && editableFile && (
                    <button
                      onClick={() => {
                        if (editingInstructions) {
                          // Save: show diff preview
                          handleInstructionsSave();
                        } else {
                          setEditedInstructions(agent.instructions ?? '');
                          setEditingInstructions(true);
                        }
                      }}
                      className="text-[9px] px-2 py-0.5 rounded bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] transition-colors"
                    >
                      {editingInstructions ? 'Preview Changes' : 'Edit'}
                    </button>
                  )}
                </div>
                {editingInstructions ? (
                  <div>
                    <textarea
                      value={editedInstructions}
                      onChange={(e) => setEditedInstructions(e.target.value)}
                      className="w-full h-64 text-[11px] text-[#B0B0CC] leading-relaxed font-mono bg-[#0A0A1B] rounded-xl p-4 border border-[#F5A623]/30 resize-none focus:outline-none focus:border-[#F5A623]/60 transition-colors"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setEditingInstructions(false)}
                        className="text-[9px] px-3 py-1 rounded-lg bg-[#1E1E3A] text-[#9999BB] hover:text-[#E0E0F0] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#9999BB] leading-relaxed font-mono bg-[#0A0A1B] rounded-xl p-4 border border-[#1E1E3A] max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {agent.instructions.slice(0, 2000)}
                    {agent.instructions.length > 2000 && "..."}
                  </div>
                )}
              </div>
            )}

            {/* Status toggle — write back to file */}
            {projectPath && editableFile && (
              <div className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-[#9999BB] font-medium mb-2">
                  Status
                </h3>
                <div className="flex gap-2">
                  {(['active', 'paused', 'archived'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(agent, s)}
                      className={`
                        text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all
                        ${agent.status === s
                          ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'
                          : 'bg-[#1E1E3A] text-[#7777A0] border border-[#1E1E3A] hover:text-[#9999BB]'
                        }
                      `}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status message toast */}
            {statusMessage && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-[10px] ${
                statusMessage.type === 'success'
                  ? 'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {statusMessage.text}
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

    {/* Diff preview modal */}
    {diffModal && (
      <DiffPreviewModal
        open={true}
        filePath={diffModal.filePath}
        oldContent={diffModal.oldContent}
        newContent={diffModal.newContent}
        onConfirm={handleConfirmWrite}
        onCancel={() => setDiffModal(null)}
        saving={saving}
      />
    )}
  </>
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
