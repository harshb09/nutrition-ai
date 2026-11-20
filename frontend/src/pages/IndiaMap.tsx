import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import * as d3Geo from "d3-geo";
import {
  Layers,
  Search,
  X,
  ExternalLink,
  AlertCircle,
  BarChart2,
  Map as MapIcon,
  ArrowRight
} from "lucide-react";
import { api } from "../api/client";
import { DistrictSummary, StateSummary } from "../api/types";

interface GeoFeature {
  type: string;
  properties: {
    district_id?: string;
    district?: string;
    state?: string;
    matched?: boolean;
    Dist_name?: string;
    ST_NM?: string;
  };
  geometry: any;
}

export const IndiaMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [states, setStates] = useState<StateSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedIndicator, setSelectedIndicator] = useState<string>("stunting");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictSummary | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
  const [searchQuery, setSearchQuery] = useState("");

  // Cursor Hover Tooltip State
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictSummary | null>(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });

  const svgRef = useRef<SVGSVGElement>(null);

  const indicatorsList = [
    { key: "stunting", label: "Child Stunting (under 5 years)", unit: "%", desc: "Low height for age" },
    { key: "wasting", label: "Child Wasting (under 5 years)", unit: "%", desc: "Low weight for height" },
    { key: "underweight", label: "Child Underweight (under 5 years)", unit: "%", desc: "Low weight for age" },
    { key: "anaemia_children", label: "Child Anaemia (6–59 months)", unit: "%", desc: "Hb < 11.0 g/dl" },
    { key: "anaemia_women", label: "Women Anaemia (15–49 years)", unit: "%", desc: "Hb < 12.0 g/dl" },
    { key: "low_bmi_women", label: "Women Low BMI (< 18.5)", unit: "%", desc: "Chronic thinness" },
    { key: "overweight_women", label: "Women Overweight / Obese", unit: "%", desc: "BMI ≥ 25.0" },
    { key: "group", label: "Districts with a similar nutrition pattern", unit: "", desc: "Group patterns" },
  ];

  // Fetch GeoJSON and datasets
  useEffect(() => {
    async function init() {
      try {
        const [geoRes, distsRes, statesRes] = await Promise.all([
          fetch("/geo/districts_simplified.json")
            .then((r) => r.json())
            .catch(() => api.getIndiaMap()),
          api.getIndiaDistricts(),
          api.getIndiaStates()
        ]);
        setGeoData(geoRes);
        setDistricts(distsRes);
        setStates(statesRes);
      } catch (err) {
        console.error("Failed to load map data", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const districtsById = useMemo(() => {
    const map = new Map<string, DistrictSummary>();
    districts.forEach((d) => map.set(d.district_id, d));
    return map;
  }, [districts]);

  const filteredDistricts = useMemo(() => {
    let list = districts;
    if (selectedState) {
      list = list.filter((d) => d.state.toLowerCase() === selectedState.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) => d.district.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
      );
    }
    return list;
  }, [districts, selectedState, searchQuery]);

  const unshapedDistricts = useMemo(() => {
    return districts.filter((d) => !d.has_boundary);
  }, [districts]);

  // Distribution counts for the selected indicator
  const distributionData = useMemo(() => {
    if (selectedIndicator === "group") {
      const g1 = districts.filter((d) => d.group_id === "1").length;
      const g2 = districts.filter((d) => d.group_id === "2").length;
      const g3 = districts.filter((d) => d.group_id === "3").length;
      return [
        { name: "Group 1", count: g1, color: "#EA580C", label: "Higher undernutrition" },
        { name: "Group 2", count: g2, color: "#0284C7", label: "Higher adult overweight" },
        { name: "Group 3", count: g3, color: "#16A34A", label: "Lower overall burden" },
      ];
    }

    let higher = 0, typical = 0, lower = 0;
    districts.forEach((d) => {
      const band = d.indicators?.[selectedIndicator]?.band;
      if (band === "higher_than_most") higher++;
      else if (band === "about_typical") typical++;
      else if (band === "lower_than_most") lower++;
    });

    return [
      { name: "Higher than most", count: higher, color: "#E11D48", label: "Top third of districts" },
      { name: "About typical", count: typical, color: "#F59E0B", label: "Middle third of districts" },
      { name: "Lower than most", count: lower, color: "#16A34A", label: "Bottom third of districts" },
    ];
  }, [districts, selectedIndicator]);

  // D3 Projection and Path Generator
  const { paths, width, height } = useMemo(() => {
    const w = 720;
    const h = 760;
    if (!geoData || !geoData.features) {
      return { paths: [], width: w, height: h };
    }

    const projection = d3Geo
      .geoMercator()
      .fitExtent([[20, 20], [w - 20, h - 20]], geoData);

    const pathGenerator = d3Geo.geoPath().projection(projection);

    const generated = geoData.features.map((feature: GeoFeature, idx: number) => {
      const dPath = pathGenerator(feature as any);
      return { d: dPath, feature, idx };
    });

    return { paths: generated, width: w, height: h };
  }, [geoData]);

  // Color determination function
  const getColor = (dist: DistrictSummary | undefined) => {
    if (!dist) return "#E2E8F0"; // Slate 200 for unmatched

    if (selectedIndicator === "group") {
      if (dist.group_id === "1") return "#EA580C"; // Orange
      if (dist.group_id === "2") return "#0284C7"; // Sky blue
      if (dist.group_id === "3") return "#16A34A"; // Emerald
      return "#94A3B8";
    }

    const band = dist.indicators?.[selectedIndicator]?.band;
    if (band === "higher_than_most") {
      return selectedIndicator === "overweight_women" ? "#EA580C" : "#E11D48";
    } else if (band === "lower_than_most") {
      return "#16A34A";
    } else if (band === "about_typical") {
      return "#F59E0B";
    }

    return "#94A3B8";
  };

  const formatBandText = (band?: string) => {
    if (band === "higher_than_most") return "Higher than most districts";
    if (band === "lower_than_most") return "Lower than most districts";
    if (band === "about_typical") return "About typical";
    return "Not reported";
  };

  // Track cursor position for floating tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-brand-muted">Rendering India district boundaries...</p>
        </div>
      </div>
    );
  }

  const activeIndObj = indicatorsList.find((i) => i.key === selectedIndicator);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" onMouseMove={handleMouseMove}>
      {/* Floating Cursor Tooltip */}
      {hoveredDistrict && (
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
                {hoveredDistrict.district}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {hoveredDistrict.state}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {hoveredDistrict.group_name}
            </span>
          </div>

          {selectedIndicator !== "group" ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{activeIndObj?.label}:</span>
                <span className="font-extrabold text-slate-900 text-sm font-mono">
                  {hoveredDistrict.indicators?.[selectedIndicator]?.value ?? "—"}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-700">
                  {formatBandText(hoveredDistrict.indicators?.[selectedIndicator]?.band)}
                </span>
                <span className="text-slate-500 text-[10px]">
                  State avg: {hoveredDistrict.indicators?.[selectedIndicator]?.state_average ?? "—"}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {hoveredDistrict.group_descriptor}
            </p>
          )}

          <div className="mt-2 pt-1 border-t border-slate-100 text-[10px] text-sky-600 font-medium flex items-center gap-1">
            <span>Click to inspect full details</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-md">
              NFHS-5 Factsheets (707 Districts)
            </span>
            <span className="text-xs text-slate-500">Ministry of Health & Family Welfare</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            India District Malnutrition Atlas
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Hover over any district to instantly view local rates at your cursor. Compare indicators against state averages and relative national patterns.
          </p>
        </div>

        {/* View Switcher & Indicator Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>All 707 Districts</span>
            </button>
          </div>

          {/* Indicator Switcher */}
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

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          >
            <option value="">All States & UTs (36)</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.district_count} dists)
              </option>
            ))}
          </select>

          {/* Quick District Finder Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find any district..."
              className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm w-full"
            />
            {searchQuery.trim().length >= 2 && (
              <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {districts
                  .filter(
                    (d) =>
                      d.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.state.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((d) => (
                    <button
                      key={d.district_id}
                      onClick={() => {
                        setSelectedDistrict(d);
                        setSelectedState(d.state);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{d.district}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">• {d.state}</span>
                      </div>
                      <span className="text-[10px] text-sky-600 font-semibold">Select</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Distribution Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              National Distribution for {activeIndObj?.label}
            </span>
            <span className="text-xs text-slate-600">
              Proportion of 707 districts falling into each comparative band
            </span>
          </div>
          <span className="text-xs font-bold text-slate-900">Total: 707 Districts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {distributionData.map((d, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{d.name}</span>
                  <span className="text-[10px] text-slate-500">{d.label}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-slate-900 text-sm font-mono block">
                  {d.count}
                </span>
                <span className="text-[10px] text-slate-500">
                  {((d.count / 707) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main View: Map or 707 Districts Grid */}
      {viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Interactive SVG Choropleth */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
            {/* Quick Map Legend */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 z-10 text-[11px] space-y-2 shadow-md max-w-[240px]">
              <span className="font-bold text-slate-900 block">
                {activeIndObj?.label}
              </span>

              {selectedIndicator === "group" ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EA580C] shrink-0" />
                    <span>Group 1: Higher undernutrition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0284C7] shrink-0" />
                    <span>Group 2: Higher adult overweight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0" />
                    <span>Group 3: Lower overall burden</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#E11D48] shrink-0" />
                    <span>Higher than most districts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0" />
                    <span>About typical across India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0" />
                    <span>Lower than most districts</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-slate-500 text-[10px]">
                <span className="w-3 h-3 rounded-full bg-[#E2E8F0] shrink-0" />
                <span>No Census 2011 shape (accessible below)</span>
              </div>
            </div>

            {/* SVG Map Canvas */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-[680px] h-auto select-none transition-transform"
            >
              <g>
                {paths.map(({ d, feature, idx }: { d: string | null; feature: any; idx: number }) => {
                  const distId = feature.properties?.district_id;
                  const dist = distId ? districtsById.get(distId) : undefined;
                  const isSelected = selectedDistrict?.district_id === distId;
                  const isStateMatch =
                    !selectedState ||
                    (dist && dist.state.toLowerCase() === selectedState.toLowerCase());

                  const fillColor = getColor(dist);
                  const opacity = isStateMatch ? 1 : 0.25;

                  return (
                    <path
                      key={idx}
                      d={d || ""}
                      fill={fillColor}
                      opacity={opacity}
                      stroke={
                        isSelected
                          ? "#0F172A"
                          : hoveredDistrictId && distId && hoveredDistrictId === distId
                          ? "#0F172A"
                          : "#64748B"
                      }
                      strokeWidth={
                        isSelected
                          ? 2
                          : hoveredDistrictId && distId && hoveredDistrictId === distId
                          ? 1.8
                          : 0.6
                      }
                      className="cursor-pointer transition-colors hover:brightness-95"
                      onMouseEnter={() => {
                        setHoveredDistrictId(distId || null);
                        if (dist) {
                          setHoveredDistrict(dist);
                        } else {
                          const fallbackName =
                            feature.properties?.Dist_name ||
                            feature.properties?.DISTRICT ||
                            "District";
                          const fallbackState = feature.properties?.ST_NM || "";
                          setHoveredDistrict({
                            district_id: distId || "",
                            district: fallbackName,
                            state: fallbackState,
                            group_id: "",
                            group_name: "No Boundary Factsheet",
                            indicators: {},
                            has_boundary: true
                          } as any);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredDistrictId(null);
                        setHoveredDistrict(null);
                      }}
                      onClick={() => {
                        if (dist) setSelectedDistrict(dist);
                      }}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* District Detail Drawer / Inspector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            {selectedDistrict ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedDistrict.district}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedDistrict.state}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDistrict(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pattern Box */}
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-1">
                  <span className="font-bold text-xs text-sky-900 block">
                    {selectedDistrict.group_name}
                  </span>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    {selectedDistrict.group_descriptor}
                  </p>
                </div>

                {/* Comparison Indicators */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    District Indicators (NFHS-5)
                  </span>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {indicatorsList
                      .filter((i) => i.key !== "group")
                      .map((ind) => {
                        const info = selectedDistrict.indicators?.[ind.key];
                        return (
                          <div
                            key={ind.key}
                            className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                          >
                            <div className="max-w-[65%]">
                              <span className="font-semibold text-xs text-slate-800 block truncate">
                                {ind.label}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {formatBandText(info?.band)} • State avg: {info?.state_average ?? "—"}%
                              </span>
                            </div>
                            <span className="font-extrabold text-slate-900 text-sm font-mono">
                              {info?.value !== null && info?.value !== undefined ? `${info.value}%` : "—"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Link to Dedicated District Page */}
                <Link
                  to={`/district/${encodeURIComponent(selectedDistrict.state)}/${encodeURIComponent(
                    selectedDistrict.district
                  )}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-all shadow-sm"
                >
                  <span>Open Full District Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-14 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Select Any District</h4>
                  <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                    Hover on the map for instant data, or click a district to inspect all 7 child and maternal indicators.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid View: All 707 Districts */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                All 707 Districts in NFHS-5 Survey ({filteredDistricts.length} displayed)
              </h3>
              <span className="text-xs text-slate-500">
                Includes all 619 mapped boundaries and 88 post-2014 reorganized districts
              </span>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search district or state..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3">State / UT</th>
                  <th className="py-2.5 px-3">Nutrition Pattern</th>
                  <th className="py-2.5 px-3">Child Stunting</th>
                  <th className="py-2.5 px-3">Child Wasting</th>
                  <th className="py-2.5 px-3">Child Anaemia</th>
                  <th className="py-2.5 px-3">Women Overweight</th>
                  <th className="py-2.5 px-3">Boundary Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDistricts.map((d) => (
                  <tr key={d.district_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900">{d.district}</td>
                    <td className="py-2 px-3 text-slate-600">{d.state}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {d.group_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {d.indicators?.stunting?.value ?? "—"}%
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {d.indicators?.wasting?.value ?? "—"}%
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {d.indicators?.anaemia_children?.value ?? "—"}%
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {d.indicators?.overweight_women?.value ?? "—"}%
                    </td>
                    <td className="py-2 px-3">
                      {d.has_boundary ? (
                        <span className="text-[11px] text-emerald-600 font-medium">Mapped shape</span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">Post-2014 district</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Link
                        to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prominent Section for Districts Created After Census 2011 Boundary File */}
      {unshapedDistricts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {unshapedDistricts.length} Post-2014 Districts (Complete NFHS-5 Survey Factsheets Available)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These districts were created after the 2011 Census boundary baseline (e.g. newly formed districts in Telangana, Gujarat, Assam, Punjab).
                Their NFHS-5 factsheet indicators are 100% complete and verified. Click any district below to view its profile:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-52 overflow-y-auto pt-1">
            {unshapedDistricts.map((d) => (
              <Link
                key={d.district_id}
                to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl text-xs transition-colors block text-left"
              >
                <span className="font-semibold text-slate-900 block truncate">{d.district}</span>
                <span className="text-[10px] text-slate-500 block truncate">{d.state}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
