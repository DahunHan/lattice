"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineStatus } from '@/lib/types';

const POLL_INTERVAL_MS = 8000; // 8 seconds
const POLL_INTERVAL_ACTIVE_MS = 3000; // 3 seconds when pipeline is running

interface UseAgentStatusOptions {
  projectPath: string | null;
  enabled?: boolean;
}

interface UseAgentStatusResult {
  status: PipelineStatus | null;
  isPolling: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useAgentStatus({ projectPath, enabled = true }: UseAgentStatusOptions): UseAgentStatusResult {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectPath) return;

    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to fetch status');
        return;
      }

      const json = await res.json();
      setStatus(json.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    }
  }, [projectPath]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (!enabled || !projectPath) {
      setStatus(null);
      return;
    }

    setIsPolling(true);
    fetchStatus();

    const interval = status?.isRunning ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_MS;
    intervalRef.current = setInterval(fetchStatus, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPolling(false);
    };
  }, [enabled, projectPath, fetchStatus, status?.isRunning]);

  return { status, isPolling, error, lastUpdated, refresh: fetchStatus };
}
