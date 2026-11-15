import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserCheck,
  GitCompare,
  Layers,
  FlaskConical,
  Database,
  X
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/profile", label: "Country Profile", icon: UserCheck },
  { to: "/similar", label: "Similar Countries", icon: GitCompare },
  { to: "/groups", label: "Groups", icon: Layers },
  { to: "/methodology", label: "Methodology & Validation", icon: FlaskConical },
  { to: "/data", label: "Data & Sources", icon: Database },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-brand-surface border-r border-brand-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-6 border-b border-brand-border">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent" />
            </div>
            <span className="font-bold text-sm tracking-tight text-brand-text">
              Nutrition Atlas
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 md:hidden text-brand-muted hover:text-brand-text rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-brand-raised text-brand-text border border-brand-accent/30 shadow-sm"
                      : "text-brand-muted hover:text-brand-text hover:bg-brand-raised/50"
                  }`
                }
              >
                <Icon className="w-4 h-4 text-brand-accent/80" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-border/60">
          <div className="bg-brand-raised/50 border border-brand-border/60 rounded-xl p-3 text-[11px] text-brand-muted">
            <span className="font-semibold text-brand-text block mb-1">Health Analytics Engine</span>
            Standardized multi-source malnutrition profiling with statistical similarity clustering.
          </div>
        </div>
      </aside>
    </>
  );
};
