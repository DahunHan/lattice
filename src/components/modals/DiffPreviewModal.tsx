"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DiffPreviewModalProps {
  open: boolean;
  filePath: string;
  oldContent: string;
  newContent: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function DiffPreviewModal({
  open,
  filePath,
  oldContent,
  newContent,
  onConfirm,
  onCancel,
  saving,
}: DiffPreviewModalProps) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);
  const diffLines: { type: 'same' | 'removed' | 'added' | 'changed'; old: string; new: string }[] = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] ?? '';
    const newLine = newLines[i] ?? '';
    if (oldLine === newLine) {
      diffLines.push({ type: 'same', old: oldLine, new: newLine });
    } else if (i >= oldLines.length) {
      diffLines.push({ type: 'added', old: '', new: newLine });
    } else if (i >= newLines.length) {
      diffLines.push({ type: 'removed', old: oldLine, new: '' });
    } else {
      diffLines.push({ type: 'changed', old: oldLine, new: newLine });
    }
  }

  const changeCount = diffLines.filter(d => d.type !== 'same').length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="glass-strong rounded-2xl border border-[#1E1E3A] shadow-2xl shadow-black/40 w-[90vw] max-w-4xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1E1E3A] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#E0E0F0]">Review Changes</h2>
                <p className="text-[11px] text-[#7777A0] mt-0.5 font-mono">{filePath}</p>
              </div>
              <span className="text-[10px] text-[#F5A623] px-2 py-1 rounded-lg bg-[#F5A623]/10">
                {changeCount} line{changeCount !== 1 ? 's' : ''} changed
              </span>
            </div>

            {/* Diff view — interleaved */}
            <div className="flex-1 overflow-auto p-4">
              <div className="font-mono text-[11px] leading-relaxed">
                {diffLines.map((line, i) => {
                  if (line.type === 'same') {
                    return (
                      <div key={i} className="flex">
                        <span className="w-10 text-right text-[#555577] select-none pr-3 shrink-0">{i + 1}</span>
                        <span className="text-[#9999BB] whitespace-pre-wrap break-all">{line.old}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i}>
                      {(line.type === 'removed' || line.type === 'changed') && (
                        <div className="flex bg-red-500/5">
                          <span className="w-10 text-right text-red-400/60 select-none pr-3 shrink-0">-</span>
                          <span className="text-red-400/80 whitespace-pre-wrap break-all">{line.old}</span>
                        </div>
                      )}
                      {(line.type === 'added' || line.type === 'changed') && (
                        <div className="flex bg-[#2ECC71]/5">
                          <span className="w-10 text-right text-[#2ECC71]/60 select-none pr-3 shrink-0">+</span>
                          <span className="text-[#2ECC71]/80 whitespace-pre-wrap break-all">{line.new}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1E1E3A] flex items-center justify-between shrink-0">
              <p className="text-[10px] text-[#7777A0]">
                This will write directly to the file. A snapshot will be saved automatically.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-[11px] font-medium text-[#9999BB] bg-[#1E1E3A] hover:bg-[#2E2E52] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-[11px] font-medium text-[#0A0A1B] bg-[#F5A623] hover:bg-[#E8941E] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Writing...' : 'Write to File'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
