import React from "react";
import { AlertCircle, RefreshCw, Server, Inbox } from "lucide-react";

interface StatusNoticeProps {
  loading?: boolean;
  coldStartSeconds?: number | null;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyMessage?: string;
}

export const StatusNotice: React.FC<StatusNoticeProps> = ({
  loading,
  coldStartSeconds,
  error,
  onRetry,
  empty,
  emptyMessage = "No records found matching your criteria."
}) => {
  if (coldStartSeconds !== null && coldStartSeconds !== undefined && coldStartSeconds > 0) {
    return (
      <div className="bg-brand-raised border border-brand-border rounded-2xl p-8 text-center max-w-lg mx-auto my-12 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mx-auto mb-4 text-brand-accent">
          <Server className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-semibold text-brand-text mb-1">
          Starting the server ({coldStartSeconds}s / 60s)
        </h3>
        <p className="text-xs text-brand-muted mb-4 max-w-sm mx-auto leading-relaxed">
          The cloud backend is spinning up from a cold start. Your request will automatically resolve once the service is ready.
        </p>
        <div className="w-48 bg-brand-surface rounded-full h-1.5 mx-auto overflow-hidden">
          <div
            className="bg-brand-accent h-1.5 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${Math.min(100, (coldStartSeconds / 60) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-28 bg-brand-surface border border-brand-border rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-brand-surface border border-brand-border rounded-2xl" />
          <div className="h-44 bg-brand-surface border border-brand-border rounded-2xl" />
          <div className="h-44 bg-brand-surface border border-brand-border rounded-2xl" />
        </div>
        <div className="h-64 bg-brand-surface border border-brand-border rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-brand-surface border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-brand-text mb-1">
          Data Loading Failed
        </h3>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-raised hover:bg-brand-border text-brand-text text-xs font-medium rounded-lg border border-brand-border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Request
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center max-w-md mx-auto my-12">
        <div className="w-10 h-10 rounded-full bg-brand-raised flex items-center justify-center mx-auto mb-3 text-brand-muted">
          <Inbox className="w-5 h-5" />
        </div>
        <p className="text-xs text-brand-muted">{emptyMessage}</p>
      </div>
    );
  }

  return null;
};
