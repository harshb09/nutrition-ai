import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  MapPin,
  Globe2,
  Building2,
  Upload,
  LineChart,
  Info,
  Menu,
  X,
  Search,
  Sparkles
} from "lucide-react";

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onOpenChat }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/india-map", label: "India Map", icon: MapPin },
    { to: "/world-map", label: "World Map", icon: Globe2 },
    { to: "/my-district", label: "My District", icon: MapPin },
    { to: "/organisations", label: "For Organisations", icon: Building2 },
    { to: "/upload", label: "Upload Your Data", icon: Upload },
    { to: "/analysis", label: "Analysis", icon: LineChart, badge: "For Evaluators" },
    { to: "/about", label: "About", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand-surface/95 backdrop-blur border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-brand-accent" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-brand-text block leading-tight">
                Nutrition Atlas
              </span>
              <span className="text-[10px] text-brand-muted tracking-wide uppercase block">
                District & Global Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-brand-raised text-brand-accent font-semibold border border-brand-border shadow-sm"
                      : "text-brand-muted hover:text-brand-text hover:bg-brand-raised/50"
                  }`
                }
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-brand-accent/15 text-brand-accent rounded font-semibold border border-brand-accent/30">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-muted hover:text-brand-text transition-all focus:outline-none"
              title="Search Districts or Countries (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-brand-accent" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-brand-surface border border-brand-border rounded text-brand-muted">
                ⌘K
              </kbd>
            </button>

            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-white rounded-xl text-xs font-medium hover:bg-brand-accent/90 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden text-brand-muted hover:text-brand-text rounded-lg hover:bg-brand-raised"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-brand-border bg-brand-surface px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-raised text-brand-accent font-semibold"
                    : "text-brand-muted hover:text-brand-text hover:bg-brand-raised/50"
                }`
              }
            >
              <div className="flex items-center justify-between">
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-brand-accent/20 text-brand-accent rounded">
                    {link.badge}
                  </span>
                )}
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};
