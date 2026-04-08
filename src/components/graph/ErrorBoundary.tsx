"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React rendering errors so a single broken component
 * doesn't crash the entire dashboard. Wraps the graph canvas.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="h-full w-full flex items-center justify-center bg-[#0A0A1B]">
          <div className="glass-strong rounded-2xl p-8 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-[#E0E0F0] mb-2">
              Something went wrong
            </h2>
            <p className="text-[11px] text-[#9999BB] mb-4">
              The graph encountered an error. Your data is safe — try refreshing.
            </p>
            <p className="text-[10px] text-[#7777A0] font-mono mb-4 bg-[#0A0A1B] rounded-lg p-3 text-left break-all">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl text-[11px] font-medium bg-[#F5A623]/15 text-[#F5A623] hover:bg-[#F5A623]/25 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
