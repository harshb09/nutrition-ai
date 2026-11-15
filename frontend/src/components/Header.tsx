import React from "react";
import { Search, Menu } from "lucide-react";

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-8 bg-brand-bg/90 backdrop-blur border-b border-brand-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 md:hidden text-brand-muted hover:text-brand-text hover:bg-brand-surface rounded-lg transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-accent tracking-wider uppercase">
            Nutrition Atlas
          </span>
          <span className="text-brand-muted text-xs hidden sm:inline">•</span>
          <span className="text-xs text-brand-muted hidden sm:inline">
            Global Health Profiler
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-muted hover:text-brand-text transition-all focus:outline-none focus:ring-1 focus:ring-brand-accent"
        >
          <Search className="w-3.5 h-3.5 text-brand-accent" />
          <span className="hidden sm:inline">Search countries...</span>
          <span className="sm:hidden">Search</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-brand-raised border border-brand-border rounded text-brand-muted">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};

