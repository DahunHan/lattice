"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { parseProject, type RawFile } from "@/lib/parser";
import { useProjectStore } from "@/store/useProjectStore";

export default function LandingPage() {
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const existingProject = useProjectStore((s) => s.project);
  const hasHydrated = useProjectStore((s) => s._hasHydrated);
  const [folderPath, setFolderPath] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesCount, setFilesCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: RawFile[]) => {
      if (files.length === 0) {
        setError("No parseable files found (.md, .py, .yaml, .json)");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const project = parseProject(files);
        if (project.agents.length === 0) {
          setError("No agents detected in the provided files");
          return;
        }
        setProject(project);
        router.push("/graph");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse files");
      } finally {
        setIsLoading(false);
      }
    },
    [setProject, router]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const items = Array.from(e.target.files ?? []);
      const validExts = ['.md', '.py', '.yaml', '.yml', '.json'];
      const validFiles = items.filter((f) => validExts.some(ext => f.name.endsWith(ext)));
      const rawFiles: RawFile[] = await Promise.all(
        validFiles.map(async (f) => ({
          name: f.name,
          content: await f.text(),
        }))
      );
      setFilesCount(rawFiles.length);
      handleFiles(rawFiles);
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = Array.from(e.dataTransfer.files);
      const validExts = ['.md', '.py', '.yaml', '.yml', '.json'];
      const validFiles = items.filter((f) => validExts.some(ext => f.name.endsWith(ext)));
      const rawFiles: RawFile[] = await Promise.all(
        validFiles.map(async (f) => ({
          name: f.name,
          content: await f.text(),
        }))
      );
      setFilesCount(rawFiles.length);
      handleFiles(rawFiles);
    },
    [handleFiles]
  );

  const handleScan = useCallback(async () => {
    if (!folderPath.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Scan failed");
        return;
      }
      setFilesCount(json.filesScanned);
      setProject(json.data, folderPath.trim());
      router.push("/graph");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan folder");
    } finally {
      setIsLoading(false);
    }
  }, [folderPath, setProject, router]);

  return (
    <div className="animated-gradient min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F5A623]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4A9EE0]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#9B59B6]/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-[#F5A623] pulse-glow" />
            <span className="text-xs font-medium text-[#9999BB] uppercase tracking-wider">
              Agent Workflow Visualizer
            </span>
          </motion.div>

          <h1 className="text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-[#F5A623] via-[#E0E0F0] to-[#4A9EE0] bg-clip-text text-transparent">
              HailMary
            </span>
          </h1>
          <p className="text-[#9999BB] text-lg max-w-md mx-auto leading-relaxed">
            Drop your project files or point to a folder.
            <br />
            We&apos;ll map every agent and their connections.
          </p>
        </div>

        {/* Main card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/20">
          {/* Drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.py,.yaml,.yml,.json"
            multiple
            onChange={handleFileInput}
            className="sr-only"
            aria-label="Upload markdown files"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center
              transition-all duration-200 cursor-pointer mb-6
              focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12122A]
              ${
                isDragging
                  ? "border-[#F5A623] bg-[#F5A623]/5 scale-[1.01]"
                  : "border-[#2E2E52] hover:border-[#F5A623]/40 hover:bg-[#F5A623]/[0.02]"
              }
            `}
            aria-label="Drop markdown files or click to browse"
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={`
                w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200
                ${isDragging ? "bg-[#F5A623]/20 scale-110" : "bg-[#1E1E3A]"}
              `}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDragging ? "#F5A623" : "#9999BB"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#E0E0F0]">
                  Drop project files here
                </p>
                <p className="text-xs text-[#9999BB] mt-1">
                  .md, .py, .yaml, .json — any agent framework
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#1E1E3A]" />
            <span className="text-xs text-[#9999BB] uppercase tracking-wider font-medium">
              or scan a folder
            </span>
            <div className="flex-1 h-px bg-[#1E1E3A]" />
          </div>

          {/* Folder input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="C:\path\to\your\project"
              className="
                flex-1 px-4 py-3 rounded-xl text-sm
                bg-[#0A0A1B] border border-[#1E1E3A]
                text-[#E0E0F0] placeholder-[#7777A0]
                focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/20
                transition-all duration-200
                font-mono
              "
            />
            <button
              onClick={handleScan}
              disabled={isLoading || !folderPath.trim()}
              className="
                px-6 py-3 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-[#F5A623] to-[#E8941E]
                text-[#0A0A1B] hover:shadow-lg hover:shadow-[#F5A623]/20
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                whitespace-nowrap
              "
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      strokeDasharray="31.4"
                      strokeDashoffset="10"
                    />
                  </svg>
                  Scanning...
                </span>
              ) : (
                "Scan"
              )}
            </button>
          </div>

          {/* Supported formats — collapsible */}
          <FormatHints showInitially={false} />

          {/* Error / Status */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
            {filesCount !== null && !error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 px-4 py-3 rounded-xl bg-[#2ECC71]/10 border border-[#2ECC71]/20 text-[#2ECC71] text-sm"
              >
                Found {filesCount} markdown files. Building graph...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Continue with existing project */}
        {hasHydrated && existingProject && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={() => router.push("/graph")}
              className="
                w-full px-5 py-4 rounded-xl text-left
                glass-strong border border-[#1E1E3A] hover:border-[#F5A623]/30
                transition-all duration-200 group
              "
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E0E0F0]">
                      Continue with {existingProject.metadata.name}
                    </p>
                    <p className="text-xs text-[#7777A0]">
                      {existingProject.agents.length} agents &middot; {existingProject.edges.length} connections
                    </p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7777A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#F5A623] transition-colors">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-[#7777A0]">
            Open source &middot; Built for agentic builders
          </p>
        </div>
      </motion.div>
    </div>
  );
}

const FORMATS = [
  { name: 'AGENT_MAP.md', desc: 'Agent definitions (CSV or markdown table)' },
  { name: '.claude/agents/*.md', desc: 'Claude Code agent definitions' },
  { name: 'SYSTEM-ARCHITECTURE.md', desc: 'Pipeline phases & data flow' },
  { name: 'CLAUDE.md', desc: 'Project metadata & goals' },
  { name: 'SKILL.md', desc: 'Agent skill instructions' },
  { name: 'agents.yaml / tasks.yaml', desc: 'CrewAI agent & task configs' },
  { name: '*.py (CrewAI)', desc: '@CrewBase crews, Process type detection' },
  { name: '*.py (LangGraph)', desc: 'StateGraph nodes, edges, conditional routing' },
  { name: '*.py (AutoGen)', desc: 'AssistantAgent, GroupChat, Swarm handoffs' },
  { name: '*.py (OpenAI Agents)', desc: 'Agent definitions with handoff graphs' },
  { name: 'Any .md', desc: 'Heuristic detection of agents & relationships' },
];

function FormatHints({ showInitially }: { showInitially: boolean }) {
  const [open, setOpen] = useState(showInitially);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[11px] text-[#7777A0] hover:text-[#9999BB] transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Supported formats
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-4 space-y-1.5">
              {FORMATS.map((f) => (
                <div key={f.name} className="flex items-baseline gap-2">
                  <code className="text-[10px] text-[#F5A623]/70 font-mono whitespace-nowrap">{f.name}</code>
                  <span className="text-[10px] text-[#9999BB]">{f.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
