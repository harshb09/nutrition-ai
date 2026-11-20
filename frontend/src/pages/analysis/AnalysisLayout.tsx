import React, { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  UserCheck,
  GitCompare,
  BarChart3,
  Bookmark,
  HelpCircle,
  Layers,
  Compass,
  FlaskConical,
  Database,
  Menu,
  X,
  ChevronLeft
} from "lucide-react";

export const AnalysisLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const analysisNav = [
    { to: "/analysis/overview", label: "Global Overview", icon: LayoutDashboard },
    { to: "/analysis/india", label: "India Districts Workbench", icon: MapPin, highlight: true },
    { to: "/analysis/profile", label: "Country Profile", icon: UserCheck },
    { to: "/analysis/similar", label: "Similar Countries", icon: GitCompare },
    { to: "/analysis/burden", label: "Burden & Priority", icon: BarChart3 },
    { to: "/analysis/watchlist", label: "Watchlist", icon: Bookmark },
    { to: "/analysis/gaps", label: "Data Gaps", icon: HelpCircle },
    { to: "/analysis/groups", label: "Groups", icon: Layers },
    { to: "/analysis/use-cases", label: "Use Cases", icon: Compass },
    { to: "/analysis/methodology", label: "Methodology & Validation", icon: FlaskConical },
    { to: "/analysis/data", label: "Data & Sources", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col md:flex-row antialiased">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Analysis Dedicated Sidebar */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-brand-surface border-r border-brand-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header Badge */}
        <div className="p-4 border-b border-brand-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-brand-accent px-2 py-0.5 bg-brand-accent/10 border border-brand-accent/30 rounded-md">
              For Analysts & Evaluators
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 md:hidden text-brand-muted hover:text-brand-text rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-brand-muted mt-2 leading-relaxed">
            Full methodological controls, model metrics (WCSS, Silhouette, DB, ARI), PCA loadings, and district workbenches.
          </p>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {analysisNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-brand-raised text-brand-text border border-brand-accent/30 shadow-sm"
                      : "text-brand-muted hover:text-brand-text hover:bg-brand-raised/50"
                  } ${item.highlight ? "font-semibold" : ""}`
                }
              >
                <Icon
                  className={`w-4 h-4 ${
                    item.highlight ? "text-amber-500" : "text-brand-accent/80"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {item.highlight && (
                  <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-500 font-bold rounded">
                    NEW
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Return to Public Portal */}
        <div className="p-3 border-t border-brand-border/60">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-brand-muted hover:text-brand-text hover:bg-brand-raised rounded-xl transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Analysis Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Mobile toggle button bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-brand-surface border-b border-brand-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-xs font-medium text-brand-muted hover:text-brand-text"
          >
            <Menu className="w-4 h-4 text-brand-accent" />
            <span>Analysis Menu</span>
          </button>
          <span className="text-[11px] text-brand-accent font-semibold">
            Analyst Workbench
          </span>
        </div>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
