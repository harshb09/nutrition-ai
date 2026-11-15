import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { Overview } from "./pages/Overview";
import { CountryProfile } from "./pages/CountryProfile";
import { SimilarCountries } from "./pages/SimilarCountries";
import { Groups } from "./pages/Groups";
import { Methodology } from "./pages/Methodology";
import { DataSources } from "./pages/DataSources";

export const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl/Cmd + K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-bg text-brand-text flex">
        {/* Left Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          <Header
            onOpenSearch={() => setIsSearchOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/profile" element={<Navigate to="/countries/IND" replace />} />
              <Route path="/countries/:iso3" element={<CountryProfile />} />
              <Route path="/similar" element={<SimilarCountries />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/data" element={<DataSources />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </BrowserRouter>
  );
};

export default App;
