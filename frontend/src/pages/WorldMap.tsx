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
  const [mapResponse, setMapResponse] = useState<any>(null);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<string>("group");
  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const indicatorsList = [
    { key: "group", label: "Countries with a similar nutrition pattern" },
    { key: "stunting", label: "Child Stunting" },
    { key: "child_overweight", label: "Child Overweight" },
    { key: "wasting", label: "Child Wasting" },
    { key: "adult_obesity", label: "Adult Obesity" },
    { key: "adult_diabetes", label: "Adult Diabetes" },
    { key: "anaemia_women", label: "Anaemia in Women" },
    { key: "low_birth_weight", label: "Low Birth Weight" },
  ];

  useEffect(() => {
    async function init() {
      try {
        const [mapRes, countriesRes] = await Promise.all([
          api.getWorldMap(selectedIndicator),
          api.getCountries()
        ]);
        setMapResponse(mapRes);
        setCountries(countriesRes);
      } catch (err) {
        console.error("Failed to load world map data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [selectedIndicator]);

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
    const w = 900;
    const h = 500;
    if (!mapResponse?.available || !mapResponse?.features) {
      return { paths: [], width: w, height: h };
    }

    const projection = d3Geo
      .geoNaturalEarth1()
      .scale(150)
      .translate([w / 2, h / 2]);

    const pathGenerator = d3Geo.geoPath().projection(projection);

    const generated = mapResponse.features.map((feature: any, idx: number) => {
      const dPath = pathGenerator(feature);
      return {
        d: dPath,
        feature,
        idx
      };
    });

    return { paths: generated, width: w, height: h };
  }, [mapResponse]);

  const getColor = (iso3?: string) => {
    if (!iso3) return "#e2e8f0";
    const c = countriesByIso.get(iso3.toUpperCase());
    if (!c) return "#e2e8f0";

    if (selectedIndicator === "group") {
      const gid = c.group_id;
      if (gid === "1") return "#3b82f6";
      if (gid === "2") return "#f97316";
      if (gid === "3") return "#10b981";
      if (gid === "4") return "#8b5cf6";
      if (gid === "5") return "#ec4899";
      return "#cbd5e1";
    }

    const val = c.indicators?.[selectedIndicator];
    if (val === null || val === undefined) return "#e2e8f0";

    // Simple 3-step color threshold
    if (val > 30) return "#e11d48";
    if (val > 15) return "#f59e0b";
    return "#15803d";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-brand-muted">Loading global country dataset...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-brand-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">
            UN Joint Child Malnutrition Estimates (JME 2024)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Global Malnutrition Map
          </h1>
          <p className="text-xs text-brand-muted mt-1 max-w-2xl">
            Explore national nutrition profiles across 200+ countries. Click any country to view its complete profile in the Analysis section.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            {indicatorsList.map((ind) => (
              <option key={ind.key} value={ind.key}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map or Missing Boundary Notice */}
      {mapResponse?.available ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[850px] h-auto select-none"
          >
            <g>
              {paths.map(({ d, feature, idx }: { d: string | null; feature: any; idx: number }) => {
                const iso = feature.properties?.iso3 || feature.properties?.["ISO3166-1-Alpha-3"];
                const country = iso ? countriesByIso.get(iso.toUpperCase()) : null;
                const fill = getColor(iso);

                return (
                  <path
                    key={idx}
                    d={d || ""}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onMouseEnter={() => setHoveredCountry(country || { country_name: feature.properties?.name })}
                    onMouseLeave={() => setHoveredCountry(null)}
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

          {hoveredCountry && (
            <div className="absolute bottom-4 left-4 bg-brand-surface/95 border border-brand-border px-3 py-2 rounded-xl shadow-lg pointer-events-none text-xs">
              <span className="font-bold text-brand-text block">
                {hoveredCountry.country_name}
              </span>
              <span className="text-brand-muted text-[11px] block">
                {selectedIndicator === "group"
                  ? hoveredCountry.group_name || "Insufficient data"
                  : `${hoveredCountry.indicators?.[selectedIndicator] ?? "—"}%`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-brand-text">
              World Map Boundary File Missing
            </h3>
            <p className="text-xs text-brand-muted max-w-md mx-auto">
              The world map boundary file (<code className="text-brand-text">world.geojson</code>) is currently missing from <code className="text-brand-text">data/geo/</code>. Geometry is not faked.
              All country nutrition estimates remain fully accessible in the table below and in the Analysis section.
            </p>
          </div>
        </div>
      )}

      {/* Country Directory Table */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
              Country Nutrition Profiles ({filteredCountries.length})
            </h3>
            <span className="text-[11px] text-brand-muted">
              Click any country to open its detailed profile in the Analysis section
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or region..."
              className="w-full bg-brand-raised border border-brand-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-brand-raised border-b border-brand-border text-brand-muted">
              <tr>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Nutrition Pattern</th>
                <th className="py-2.5 px-3">Child Stunting</th>
                <th className="py-2.5 px-3">Child Overweight</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {filteredCountries.map((c) => (
                <tr key={c.iso3} className="hover:bg-brand-raised/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-brand-text">
                    {c.country_name} ({c.iso3})
                  </td>
                  <td className="py-2.5 px-3 text-brand-muted">{c.region}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-brand-raised rounded text-[11px] text-brand-text border border-brand-border">
                      {c.group_name || "Insufficient data"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.indicators?.stunting !== null ? `${c.indicators?.stunting}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.indicators?.child_overweight !== null ? `${c.indicators?.child_overweight}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      to={`/analysis/countries/${c.iso3.toLowerCase()}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-accent hover:underline"
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
