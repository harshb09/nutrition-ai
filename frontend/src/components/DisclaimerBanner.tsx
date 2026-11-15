import React from "react";
import { Info } from "lucide-react";

export const DisclaimerBanner: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`flex items-start gap-3 bg-brand-surface border border-brand-border/80 rounded-xl p-3.5 text-xs text-brand-muted leading-relaxed ${className}`}
    >
      <Info className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-brand-text">Important Notice: </span>
        Groups are exploratory similarity groupings, not official categories or rankings.
        Data years differ between indicators. Not for clinical use.
      </div>
    </div>
  );
};

