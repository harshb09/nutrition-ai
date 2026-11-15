import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Globe, ArrowRight } from "lucide-react";
import { CountrySummary } from "../api/types";
import { api } from "../api/client";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      api.getCountries().then(setCountries).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = query.trim()
    ? countries.filter(
        (c) =>
          c.country_name.toLowerCase().includes(query.toLowerCase()) ||
          c.iso3.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : countries.slice(0, 6);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (iso3: string) => {
    onClose();
    navigate(`/countries/${iso3}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].iso3);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-brand-border">
          <Search className="w-5 h-5 text-brand-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search country name or 3-letter ISO code..."
            className="w-full bg-transparent text-sm text-brand-text placeholder-brand-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-brand-raised rounded text-brand-muted hover:text-brand-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="ml-2 px-2 py-0.5 text-[10px] font-mono bg-brand-raised border border-brand-border rounded text-brand-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-brand-muted">
              No matching countries found for "{query}"
            </div>
          ) : (
            filtered.map((c, idx) => (
              <div
                key={c.iso3}
                onClick={() => handleSelect(c.iso3)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                  idx === selectedIndex
                    ? "bg-brand-raised text-brand-text border border-brand-accent/40"
                    : "text-brand-muted hover:bg-brand-raised hover:text-brand-text"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-brand-accent/70 shrink-0" />
                  <span className="font-medium text-brand-text">{c.country_name}</span>
                  <span className="font-mono text-[11px] text-brand-muted bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border">
                    {c.iso3}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {c.group_id ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
                      Group {c.group_id}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] text-brand-muted bg-brand-bg border border-brand-border">
                      Excluded
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-brand-bg/60 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-muted">
          <span>Navigate with <kbd className="font-mono text-[10px]">↑</kbd> <kbd className="font-mono text-[10px]">↓</kbd></span>
          <span>Press <kbd className="font-mono text-[10px]">Enter</kbd> to view profile</span>
        </div>
      </div>
    </div>
  );
};

