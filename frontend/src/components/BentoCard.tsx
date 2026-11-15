import React from "react";

interface BentoCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = ""
}) => {
  return (
    <div
      className={`bg-brand-surface border border-brand-border rounded-2xl p-6 transition-colors shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-brand-border/60">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-brand-text tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
