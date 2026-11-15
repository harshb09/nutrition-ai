import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { Overview } from "./pages/Overview";
import { CountryProfile } from "./pages/CountryProfile";
import { SimilarCountries } from "./pages/SimilarCountries";
import { BurdenPriority } from "./pages/BurdenPriority";
import { Watchlist } from "./pages/Watchlist";
import { DataGaps } from "./pages/DataGaps";
import { Groups } from "./pages/Groups";
import { UseCases } from "./pages/UseCases";
import { Methodology } from "./pages/Methodology";
import { DataSources } from "./pages/DataSources";

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global Ctrl/Cmd + K keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col md:flex-row antialiased">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          <Header
            onOpenSearch={() => setSearchOpen(true)}
            onToggleSidebar={() => setSidebarOpen(true)}
          />

          <main className="flex-1 pb-16">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/profile" element={<CountryProfile />} />
              <Route path="/countries/:iso3" element={<CountryProfile />} />
              <Route path="/similar" element={<SimilarCountries />} />
              <Route path="/burden" element={<BurdenPriority />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/gaps" element={<DataGaps />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/data" element={<DataSources />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </BrowserRouter>
  );
};

export default App;

