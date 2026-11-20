import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { CommandPalette } from "./components/CommandPalette";
import { ChatbotWidget } from "./components/ChatbotWidget";

// Public Pages
import { Home } from "./pages/Home";
import { IndiaMap } from "./pages/IndiaMap";
import { WorldMap } from "./pages/WorldMap";
import { MyDistrict } from "./pages/MyDistrict";
import { ForOrganisations } from "./pages/ForOrganisations";
import { UploadData } from "./pages/UploadData";
import { About } from "./pages/About";

// Analysis Workbench & Layout
import { AnalysisLayout } from "./pages/analysis/AnalysisLayout";
import { IndiaDistrictsAnalysis } from "./pages/analysis/IndiaDistrictsAnalysis";
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

const LegacyCountryRedirect: React.FC = () => {
  const { iso3 } = useParams<{ iso3: string }>();
  return <Navigate to={`/analysis/countries/${iso3 || ""}`} replace />;
};

export const App: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string>("");

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

  // Custom event listener to trigger chatbot from buttons with preset prompt
  useEffect(() => {
    const handleAssistantTrigger = (e: any) => {
      const prompt = e.detail || "";
      setChatPrompt(prompt);
      setChatOpen(true);
    };
    window.addEventListener("open-assistant", handleAssistantTrigger);
    return () => window.removeEventListener("open-assistant", handleAssistantTrigger);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col antialiased">
        {/* Universal Top Navigation Bar */}
        <Navbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenChat={() => {
            setChatPrompt("");
            setChatOpen(true);
          }}
        />

        {/* Routes */}
        <div className="flex-1">
          <Routes>
            {/* Public Domain Routes (Plain Language, Zero Model Jargon) */}
            <Route path="/" element={<Home />} />
            <Route path="/india-map" element={<IndiaMap />} />
            <Route path="/world-map" element={<WorldMap />} />
            <Route path="/my-district" element={<MyDistrict />} />
            <Route path="/district/:state/:district" element={<MyDistrict />} />
            <Route path="/organisations" element={<ForOrganisations />} />
            <Route path="/upload" element={<UploadData />} />
            <Route path="/about" element={<About />} />

            {/* Analysis Domain Routes (With Dedicated Sidebar for Evaluators) */}
            <Route path="/analysis" element={<AnalysisLayout />}>
              <Route index element={<Navigate to="/analysis/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="india" element={<IndiaDistrictsAnalysis />} />
              <Route path="profile" element={<CountryProfile />} />
              <Route path="countries/:iso3" element={<CountryProfile />} />
              <Route path="similar" element={<SimilarCountries />} />
              <Route path="burden" element={<BurdenPriority />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="gaps" element={<DataGaps />} />
              <Route path="groups" element={<Groups />} />
              <Route path="use-cases" element={<UseCases />} />
              <Route path="methodology" element={<Methodology />} />
              <Route path="data" element={<DataSources />} />
            </Route>

            {/* Legacy URL Backward-Compatibility Redirects */}
            <Route path="/overview" element={<Navigate to="/analysis/overview" replace />} />
            <Route path="/profile" element={<Navigate to="/analysis/profile" replace />} />
            <Route path="/countries/:iso3" element={<LegacyCountryRedirect />} />
            <Route path="/similar" element={<Navigate to="/analysis/similar" replace />} />
            <Route path="/burden" element={<Navigate to="/analysis/burden" replace />} />
            <Route path="/watchlist" element={<Navigate to="/analysis/watchlist" replace />} />
            <Route path="/gaps" element={<Navigate to="/analysis/gaps" replace />} />
            <Route path="/groups" element={<Navigate to="/analysis/groups" replace />} />
            <Route path="/use-cases" element={<Navigate to="/analysis/use-cases" replace />} />
            <Route path="/methodology" element={<Navigate to="/analysis/methodology" replace />} />
            <Route path="/data" element={<Navigate to="/analysis/data" replace />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Floating Bilingual Chatbot */}
        <ChatbotWidget
          isOpenExternal={chatOpen}
          initialPrompt={chatPrompt}
          onCloseExternal={() => setChatOpen(false)}
        />

        {/* Global Command Palette */}
        <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </BrowserRouter>
  );
};

export default App;
