import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import * as d3Geo from "d3-geo";
import {
  AlertTriangle,
  Search,
  ArrowRight
} from "lucide-react";
import { api } from "../api/client";
import { CountrySummary } from "../api/types";

export const WorldMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<string>("stunting");
  const [searchQuery, setSearchQuery] = useState("");

  // Hover cursor state for floating tooltip
  const [hoveredCountry, setHoveredCountry] = useState<CountrySummary | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string>("");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const indicatorsList = [
    { key: "stunting", label: "Child Stunting", desc: "Low height for age" },
    { key: "child_overweight", label: "Child Overweight", desc: "High weight for height" },
    { key: "wasting", label: "Child Wasting", desc: "Acute undernutrition" },
    { key: "adult_obesity", label: "Adult Obesity", desc: "BMI ≥ 30" },
    { key: "adult_diabetes", label: "Adult Diabetes", desc: "Fasting blood glucose" },
    { key: "anaemia_women", label: "Anaemia in Women", desc: "Hb < 12 g/dl" },
    { key: "low_birth_weight", label: "Low Birth Weight", desc: "Birth weight < 2500g" },
    { key: "group", label: "Countries with a similar nutrition pattern", desc: "Global patterns" },
  ];

  // Load simplified world GeoJSON (20ms load time)
  useEffect(() => {
    async function init() {
      try {
        const [geoRes, countriesRes] = await Promise.all([
          fetch("/geo/world_simplified.json")
            .then((r) => r.json())
            .catch(() => api.getWorldMap(selectedIndicator)),
          api.getCountries()
        ]);
        setGeoData(geoRes);
        setCountries(countriesRes);
      } catch (err) {
        console.error("Failed to load world map data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const countriesByIso = useMemo(() => {
    const map = new Map<string, CountrySummary>();
    countries.forEach((c) => map.set(c.iso3.toUpperCase(), c));
    return map;
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase();
    return countries.filter(
      (c) =>
        c.country_name.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  // D3 Projection and Path Generator
  const { paths, width, height } = useMemo(() => {
    const w = 920;
    const h = 500;
    if (!geoData || !geoData.features) {
      return { paths: [], width: w, height: h };
    }

    const projection = d3Geo
      .geoNaturalEarth1()
      .scale(155)
      .translate([w / 2, h / 2]);

    const pathGenerator = d3Geo.geoPath().projection(projection);

    const generated = geoData.features.map((feature: any, idx: number) => {
      const dPath = pathGenerator(feature);
      return { d: dPath, feature, idx };
    });

    return { paths: generated, width: w, height: h };
  }, [geoData]);

  const getColor = (iso3?: string) => {
    if (!iso3) return "#E2E8F0";
    const c = countriesByIso.get(iso3.toUpperCase());
    if (!c) return "#E2E8F0";

    if (selectedIndicator === "group") {
      const gid = c.group_id;
      if (gid === "1") return "#0284C7"; // Sky
      if (gid === "2") return "#EA580C"; // Orange
      if (gid === "3") return "#16A34A"; // Emerald
      if (gid === "4") return "#8B5CF6"; // Violet
      if (gid === "5") return "#EC4899"; // Pink
      return "#CBD5E1";
    }

    const val = c.indicators?.[selectedIndicator];
    if (val === null || val === undefined) return "#E2E8F0";

    if (val > 30) return "#E11D48";
    if (val > 15) return "#F59E0B";
    return "#16A34A";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading global country dataset...</p>
        </div>
      </div>
    );
  }

  const activeIndObj = indicatorsList.find((i) => i.key === selectedIndicator);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" onMouseMove={handleMouseMove}>
      {/* Floating Cursor Tooltip */}
      {(hoveredCountry || hoveredCountryName) && (
        <div
          style={{
            left: `${cursorPos.x + 16}px`,
            top: `${cursorPos.y + 16}px`,
          }}
          className="fixed z-50 pointer-events-none bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs max-w-xs transition-opacity duration-75 animate-in fade-in"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 mb-1.5">
            <div>
              <span className="font-bold text-slate-900 block text-sm leading-tight">
                {hoveredCountry ? hoveredCountry.country_name : hoveredCountryName}
              </span>
              {hoveredCountry && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {hoveredCountry.region} ({hoveredCountry.iso3})
                </span>
              )}
            </div>
            {hoveredCountry?.group_name && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {hoveredCountry.group_name}
              </span>
            )}
          </div>

          {hoveredCountry && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{activeIndObj?.label}:</span>
                <span className="font-extrabold text-slate-900 text-sm font-mono">
                  {hoveredCountry.indicators?.[selectedIndicator] !== null &&
                  hoveredCountry.indicators?.[selectedIndicator] !== undefined
                    ? `${hoveredCountry.indicators[selectedIndicator]}%`
                    : "Not reported"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-2 pt-1 border-t border-slate-100 text-[10px] text-sky-600 font-medium flex items-center gap-1">
            <span>Click to open full analysis profile</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-md">
              UN JME (2024 Edition) & WHO
            </span>
            <span className="text-xs text-slate-500">202 Countries Analyzed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Global Malnutrition Map
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Hover over any country for instant cursor data. Click a country to open its full profile in the Analysis section.
          </p>
        </div>

        {/* Indicator Switcher */}
        <div className="flex items-center gap-3">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          >
            {indicatorsList.map((ind) => (
              <option key={ind.key} value={ind.key}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fast SVG Choropleth Map */}
      {paths.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 z-10 text-[11px] space-y-1.5 shadow-md">
            <span className="font-bold text-slate-900 block">{activeIndObj?.label}</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] shrink-0" />
              <span>&gt; 30% (High burden)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0" />
              <span>15% – 30% (Moderate burden)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0" />
              <span>&lt; 15% (Lower burden)</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[880px] h-auto select-none transition-transform"
          >
            <g>
              {paths.map(({ d, feature, idx }: { d: string | null; feature: any; idx: number }) => {
                const iso = feature.properties?.iso3;
                const country = iso ? countriesByIso.get(iso.toUpperCase()) : null;
                const fill = getColor(iso);

                return (
                  <path
                    key={idx}
                    d={d || ""}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={0.6}
                    className="cursor-pointer transition-colors hover:brightness-90"
                    onMouseEnter={() => {
                      if (country) {
                        setHoveredCountry(country);
                        setHoveredCountryName(country.country_name);
                      } else {
                        setHoveredCountry(null);
                        setHoveredCountryName(feature.properties?.country_name || "");
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null);
                      setHoveredCountryName("");
                    }}
                    onClick={() => {
                      if (country?.iso3) {
                        window.location.href = `/analysis/countries/${country.iso3.toLowerCase()}`;
                      }
                    }}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Boundary Map File Not Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            World map boundaries could not be rendered. All country nutrition estimates remain fully accessible in the directory below.
          </p>
        </div>
      )}

      {/* Country Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Country Nutrition Profiles ({filteredCountries.length})
            </h3>
            <span className="text-xs text-slate-500">
              Click any country to open its detailed profile in the Analysis section
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or region..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Nutrition Pattern</th>
                <th className="py-2.5 px-3">Child Stunting</th>
                <th className="py-2.5 px-3">Child Overweight</th>
                <th className="py-2.5 px-3">Child Wasting</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCountries.map((c) => (
                <tr key={c.iso3} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    {c.country_name} ({c.iso3})
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{c.region}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-800 border border-slate-200">
                      {c.group_name || "Insufficient data"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                    {c.indicators?.stunting !== null ? `${c.indicators?.stunting}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.indicators?.child_overweight !== null ? `${c.indicators?.child_overweight}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.indicators?.wasting !== null ? `${c.indicators?.wasting}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      to={`/analysis/countries/${c.iso3.toLowerCase()}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800"
                    >
                      <span>Analysis</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
