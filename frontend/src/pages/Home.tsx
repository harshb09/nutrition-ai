import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Building2,
  Upload,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { api } from "../api/client";
import { StateSummary, DistrictSummary } from "../api/types";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [states, setStates] = useState<StateSummary[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allDistricts, setAllDistricts] = useState<DistrictSummary[]>([]);
  const [searchResults, setSearchResults] = useState<DistrictSummary[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const [statesData, distsData] = await Promise.all([
          api.getIndiaStates(),
          api.getIndiaDistricts()
        ]);
        setStates(statesData);
        setAllDistricts(distsData);
      } catch (err) {
        console.error("Failed to load initial India datasets", err);
      }
    }
    init();
  }, []);

  // Update districts when state changes
  useEffect(() => {
    if (selectedState) {
      const filtered = allDistricts.filter(
        (d) => d.state.toLowerCase() === selectedState.toLowerCase()
      );
      setDistricts(filtered);
      setSelectedDistrict("");
    } else {
      setDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedState, allDistricts]);

  // Handle direct typeahead search
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase().trim();
      const matches = allDistricts.filter(
        (d) =>
          d.district.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
      );
      setSearchResults(matches.slice(0, 8));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, allDistricts]);

  const handleNavigateToDistrict = (stateName: string, districtName: string) => {
    navigate(`/district/${encodeURIComponent(stateName)}/${encodeURIComponent(districtName)}`);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-brand-border bg-gradient-to-b from-brand-surface/40 to-brand-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Family Health Survey (NFHS-5, 2019–2021)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-text max-w-4xl mx-auto leading-tight">
            Understand Child & Maternal Nutrition in Your District
          </h1>

          <p className="text-sm sm:text-base text-brand-muted max-w-2xl mx-auto leading-relaxed">
            Explore local nutrition patterns across 707 Indian districts and 200+ countries.
            Compare indicators with peer districts and access actionable insights for local health planning.
          </p>

          {/* District Finder Search Box */}
          <div className="max-w-2xl mx-auto pt-4 text-left">
            <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-xl space-y-4">
              <span className="text-xs font-bold text-brand-text uppercase tracking-wider block">
                Find Your District
              </span>

              {/* State & District Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-brand-muted mb-1">
                    1. Select State / UT
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-brand-raised border border-brand-border rounded-xl px-3 py-2.5 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  >
                    <option value="">Choose State / UT...</option>
                    {states.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state} ({s.district_count} districts)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-brand-muted mb-1">
                    2. Select District
                  </label>
                  <select
                    disabled={!selectedState}
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      if (e.target.value) {
                        handleNavigateToDistrict(selectedState, e.target.value);
                      }
                    }}
                    className="w-full bg-brand-raised border border-brand-border rounded-xl px-3 py-2.5 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent disabled:opacity-40"
                  >
                    <option value="">
                      {selectedState ? "Choose District..." : "Select state first"}
                    </option>
                    {districts.map((d) => (
                      <option key={d.district_id} value={d.district}>
                        {d.district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Direct Search Bar with Live Suggestions */}
              <div className="relative pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-brand-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Or type district name directly (e.g. Varanasi, Patna, Pune)..."
                    className="w-full bg-brand-raised border border-brand-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-brand-border/60">
                    {searchResults.map((d) => (
                      <button
                        key={d.district_id}
                        onClick={() => handleNavigateToDistrict(d.state, d.district)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-brand-raised flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-brand-text group-hover:text-brand-accent">
                            {d.district}
                          </span>
                          <span className="text-brand-muted text-[11px] ml-1.5">
                            • {d.state}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Survey & Medical Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-brand-muted max-w-lg mx-auto">
            <ShieldAlert className="w-4 h-4 text-amber-500/80 shrink-0" />
            <span>Based on NFHS-5 (2019-21) survey estimates. Not medical advice.</span>
          </div>
        </div>
      </section>

      {/* Core Capability Cards */}
      <section className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">
            Explore Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-text">
            Nutrition Intelligence for the Public & Health Teams
          </h2>
          <p className="text-xs text-brand-muted max-w-xl mx-auto">
            Three simple ways to explore data without complex statistical terminology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand-accent/50 transition-all shadow-sm group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">
                District Nutrition Profiles
              </h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Review child growth, anaemia, and maternal health estimates for any district. See if rates are
                higher than most districts, about typical, or lower than most.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/my-district"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                <span>View My District</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand-accent/50 transition-all shadow-sm group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">
                Districts With Similar Patterns
              </h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Discover peer districts across India facing similar challenges. Learn what they share in common
                to share program solutions and lessons.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/india-map"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                <span>Explore Interactive Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand-accent/50 transition-all shadow-sm group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">
                For Organisations & Planners
              </h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Compare 2 to 4 districts side-by-side, view state-wide distributions, download 1-page administrative
                PDF briefs, and export clean data tables for reports.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/organisations"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                <span>Open Organisation Tools</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Footer Banner */}
      <section className="border-t border-brand-border bg-brand-surface/60 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-sm font-bold text-brand-text">
                Working with your own district survey or local field dataset?
              </h4>
              <p className="text-xs text-brand-muted mt-1">
                Upload your area data to discover nutrition patterns in real time without storing any data on disk.
              </p>
            </div>
            <Link
              to="/upload"
              className="px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-medium hover:bg-brand-accent/90 transition-all flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Your Data</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
