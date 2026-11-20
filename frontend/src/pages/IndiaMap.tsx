import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import * as d3Geo from "d3-geo";
import {
  Layers,
  X,
  ExternalLink,
  AlertCircle
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
  const [selectedIndicator, setSelectedIndicator] = useState<string>("group");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictSummary | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<any | null>(null);

  // SVG ref
  const svgRef = useRef<SVGSVGElement>(null);

  const indicatorsList = [
    { key: "group", label: "Districts with a similar nutrition pattern" },
    { key: "stunting", label: "Child Stunting (under 5 years)" },
    { key: "wasting", label: "Child Wasting (under 5 years)" },
    { key: "underweight", label: "Child Underweight (under 5 years)" },
    { key: "anaemia_children", label: "Child Anaemia (6–59 months)" },
    { key: "anaemia_women", label: "Women Anaemia (15–49 years)" },
    { key: "low_bmi_women", label: "Women with Low BMI" },
    { key: "overweight_women", label: "Women Overweight or Obese" },
  ];

  // Load geojson & district data
  useEffect(() => {
    async function init() {
      try {
        // Fetch simplified geojson from static public or API
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

  // Quick lookup dictionary for districts by district_id
  const districtsById = useMemo(() => {
    const map = new Map<string, DistrictSummary>();
    districts.forEach((d) => {
      map.set(d.district_id, d);
    });
    return map;
  }, [districts]);

  // Unmatched districts (no shape)
  const unshapedDistricts = useMemo(() => {
    return districts.filter((d) => !d.has_boundary);
  }, [districts]);

  // D3 Projection and Path Generator
  const { paths, width, height } = useMemo(() => {
    const w = 700;
    const h = 750;
    if (!geoData || !geoData.features) {
      return { paths: [], width: w, height: h };
    }

    // Centered on India
    const projection = d3Geo
      .geoMercator()
      .center([82.5, 22.5])
      .scale(1050)
      .translate([w / 2, h / 2]);

    const pathGenerator = d3Geo.geoPath().projection(projection);

    const generated = geoData.features.map((feature: GeoFeature, idx: number) => {
      const dPath = pathGenerator(feature as any);
      return {
        d: dPath,
        feature,
        idx
      };
    });

    return { paths: generated, width: w, height: h };
  }, [geoData]);

  // Color determination function
  const getColor = (dist: DistrictSummary | undefined) => {
    if (!dist) {
      return "#cbd5e1"; // Slate 300 neutral for unmatched / no data
    }

    if (selectedIndicator === "group") {
      // Color by Group ID: Group 1, 2, 3
      if (dist.group_id === "1") return "#f97316"; // Orange
      if (dist.group_id === "2") return "#3b82f6"; // Blue
      if (dist.group_id === "3") return "#10b981"; // Emerald
      return "#94a3b8";
    }

    // Color by relative band: higher_than_most, about_typical, lower_than_most
    const band = dist.indicators?.[selectedIndicator]?.band;
    if (band === "higher_than_most") {
      return selectedIndicator === "overweight_women" ? "#c2410c" : "#e11d48"; // Rose / Orange-red
    } else if (band === "lower_than_most") {
      return "#15803d"; // Green
    } else if (band === "about_typical") {
      return "#f59e0b"; // Amber
    }

    return "#94a3b8";
  };

  const formatBandText = (band?: string) => {
    if (band === "higher_than_most") return "Higher than most districts";
    if (band === "lower_than_most") return "Lower than most districts";
    if (band === "about_typical") return "About typical";
    return "Not reported";
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-brand-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">
            National Family Health Survey (NFHS-5)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            India District Malnutrition Map
          </h1>
          <p className="text-xs text-brand-muted mt-1 max-w-2xl">
            Compare child and maternal health across 707 districts. Select an indicator or explore districts with a similar nutrition pattern.
          </p>
        </div>

        {/* Indicator & State Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicator Switcher */}
          <div className="relative">
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

          {/* State Filter */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All States & UTs (36)</option>
              {states.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* SVG Map Canvas */}
        <div className="lg:col-span-3 bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 bg-brand-raised/90 backdrop-blur border border-brand-border rounded-xl p-3 z-10 text-[11px] space-y-2 shadow-sm max-w-[240px]">
            <span className="font-bold text-brand-text block">
              {indicatorsList.find((i) => i.key === selectedIndicator)?.label}
            </span>

            {selectedIndicator === "group" ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#f97316] shrink-0" />
                  <span>District Group 1 (Higher undernutrition)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#3b82f6] shrink-0" />
                  <span>District Group 2 (Higher adult overweight)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#10b981] shrink-0" />
                  <span>District Group 3 (Lower overall burden)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#e11d48] shrink-0" />
                  <span>Higher than most districts (Top third)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#f59e0b] shrink-0" />
                  <span>About typical (Middle third)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#15803d] shrink-0" />
                  <span>Lower than most districts (Bottom third)</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-brand-border/60 text-brand-muted text-[10px]">
              <span className="w-3 h-3 rounded bg-[#cbd5e1] shrink-0" />
              <span>No boundary available</span>
            </div>
          </div>

          {/* SVG Elements */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-[650px] h-auto select-none"
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
                const opacity = isStateMatch ? 1 : 0.2;

                return (
                  <path
                    key={idx}
                    d={d || ""}
                    fill={fillColor}
                    opacity={opacity}
                    stroke={isSelected ? "#000000" : "#ffffff"}
                    strokeWidth={isSelected ? 1.8 : 0.4}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onMouseEnter={() => setHoveredFeature({ feature, dist })}
                    onMouseLeave={() => setHoveredFeature(null)}
                    onClick={() => {
                      if (dist) {
                        setSelectedDistrict(dist);
                      }
                    }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Tooltip Hover Pill */}
          {hoveredFeature && hoveredFeature.dist && (
            <div className="absolute bottom-4 left-4 bg-brand-surface/95 border border-brand-border px-3 py-2 rounded-xl shadow-lg pointer-events-none text-xs">
              <span className="font-bold text-brand-text block">
                {hoveredFeature.dist.district}, {hoveredFeature.dist.state}
              </span>
              <span className="text-brand-muted text-[11px] block">
                {selectedIndicator === "group"
                  ? hoveredFeature.dist.group_name
                  : `${hoveredFeature.dist.indicators?.[selectedIndicator]?.value ?? "—"}% (${formatBandText(
                      hoveredFeature.dist.indicators?.[selectedIndicator]?.band
                    )})`}
              </span>
            </div>
          )}
        </div>

        {/* Side Drawer / Detail Panel */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
          {selectedDistrict ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-brand-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-brand-text">
                    {selectedDistrict.district}
                  </h3>
                  <span className="text-xs text-brand-muted">
                    {selectedDistrict.state}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="p-1 text-brand-muted hover:text-brand-text rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pattern Summary */}
              <div className="p-3 bg-brand-raised rounded-xl text-xs space-y-1">
                <span className="font-bold text-brand-text block">
                  {selectedDistrict.group_name}
                </span>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  {selectedDistrict.group_descriptor}
                </p>
              </div>

              {/* Indicators List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-brand-text uppercase tracking-wider block">
                  Key Indicators
                </span>
                <div className="space-y-2 text-xs max-h-[300px] overflow-y-auto pr-1">
                  {Object.entries(selectedDistrict.indicators || {}).map(([key, ind]) => {
                    const label =
                      indicatorsList.find((i) => i.key === key)?.label ||
                      key.replace(/_/g, " ");
                    return (
                      <div
                        key={key}
                        className="p-2 bg-brand-raised/50 rounded-lg flex items-center justify-between"
                      >
                        <div className="max-w-[70%]">
                          <span className="font-medium text-brand-text block truncate capitalize">
                            {label}
                          </span>
                          <span className="text-[10px] text-brand-muted">
                            {formatBandText(ind.band)} (State avg: {ind.state_average ?? "—"}%)
                          </span>
                        </div>
                        <span className="font-bold text-brand-text text-sm">
                          {ind.value !== null ? `${ind.value}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Link to Full District Profile */}
              <div className="pt-2">
                <Link
                  to={`/district/${encodeURIComponent(selectedDistrict.state)}/${encodeURIComponent(
                    selectedDistrict.district
                  )}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-accent text-white rounded-xl text-xs font-semibold hover:bg-brand-accent/90 transition-all shadow-sm"
                >
                  <span>Open Full District Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-raised flex items-center justify-center text-brand-muted mx-auto">
                <Layers className="w-5 h-5" />
              </div>
              <p className="text-xs text-brand-muted max-w-[200px] mx-auto">
                Click or tap any district on the map to view its complete nutrition indicators and pattern.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unmatched / Districts with No Shape Section */}
      {unshapedDistricts.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-muted" />
            <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
              Districts with No Boundary Shape Available ({unshapedDistricts.length})
            </h3>
          </div>
          <p className="text-xs text-brand-muted">
            These districts were created after the 2011 Census boundary file (e.g. newly formed districts in Telangana,
            Chhattisgarh, Gujarat, Ladakh). Their survey factsheets are complete and fully accessible below:
          </p>

          <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
            {unshapedDistricts.map((d) => (
              <Link
                key={d.district_id}
                to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                className="px-2.5 py-1 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text hover:text-brand-accent transition-colors flex items-center gap-1.5"
              >
                <span>{d.district}</span>
                <span className="text-[10px] text-brand-muted">({d.state})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
