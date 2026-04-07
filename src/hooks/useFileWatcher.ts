import { useEffect, useRef, useCallback, useState } from 'react';

interface UseFileWatcherOptions {
  projectPath: string | null;
  enabled: boolean;
  intervalMs?: number;
  onChanged: () => void;
}

/** Polls for file changes and fires callback when detected */
export function useFileWatcher({ projectPath, enabled, intervalMs = 5000, onChanged }: UseFileWatcherOptions) {
  const lastHash = useRef<string | null>(null);
  const [watching, setWatching] = useState(false);

  const checkChanges = useCallback(async () => {
    if (!projectPath) return;
    try {
      const res = await fetch('/api/check-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });
      const json = await res.json();
      if (!json.hash) return;

      if (lastHash.current !== null && lastHash.current !== json.hash) {
        onChanged();
      }
      lastHash.current = json.hash;
    } catch {
      // ignore network errors
    }
  }, [projectPath, onChanged]);

  useEffect(() => {
    if (!enabled || !projectPath) {
      setWatching(false);
      return;
    }

    setWatching(true);
    // Initial hash capture
    checkChanges();

    const interval = setInterval(checkChanges, intervalMs);
    return () => {
      clearInterval(interval);
      setWatching(false);
    };
  }, [enabled, projectPath, intervalMs, checkChanges]);

  return { watching };
}
