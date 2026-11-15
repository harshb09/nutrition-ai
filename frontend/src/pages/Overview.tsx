import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Users, AlertTriangle, Layers, ArrowUpRight, Search } from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { DatasetMetadata, GroupSummary, CountrySummary } from "../api/types";

export const Overview: React.FC = () => {
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");

  const loadData = () => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    Promise.all([
      api.getMetadata(setColdStartSeconds),
      api.getGroups(setColdStartSeconds),
      api.getCountries(undefined, setColdStartSeconds)
    ])
      .then(([metaRes, grpRes, cRes]) => {
        setMetadata(metaRes);
        setGroups(grpRes);
        setCountries(cRes);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load overview data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCountries = countries.filter((c) => {
    const matchesSearch =
      c.country_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.iso3.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesGroup =
      selectedGroupFilter === "ALL" ||
      (selectedGroupFilter === "EXCLUDED" && c.status === "insufficient_data") ||
      c.group_id === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  const counts = metadata?.counts;
  const doubleBurdenCount = countries.filter((c) => c.double_burden).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Disclaimer */}
      <DisclaimerBanner />

      {/* Summary KPI Cards in Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs font-medium">Countries Analysed</span>
            <Globe className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="text-3xl font-bold text-brand-text num-tabular">
            {counts?.analyzed_countries}
          </div>
          <p className="text-[11px] text-brand-muted mt-1">
            Out of {counts?.country_universe} in country universe
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs font-medium">Exploratory Clusters</span>
            <Layers className="w-4 h-4 text-group-a" />
          </div>
          <div className="text-3xl font-bold text-brand-text num-tabular">
            {groups.length}
          </div>
          <p className="text-[11px] text-brand-muted mt-1">
            Provisional similarity groupings
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs font-medium">Double-Burden Flagged</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-brand-text num-tabular">
            {doubleBurdenCount}
          </div>
          <p className="text-[11px] text-brand-muted mt-1">
            High under- and overnutrition (relative to dataset)
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs font-medium">Data Completeness</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-brand-text num-tabular">
            {counts?.complete_cases}
          </div>
          <p className="text-[11px] text-brand-muted mt-1">
            Complete cases; {counts?.single_gap_imputed} single gap imputed
          </p>
        </div>
      </div>

      {/* Provisional Groups Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
            Exploratory Groups (Ordered by Mean Stunting)
          </h2>
          <Link
            to="/groups"
            className="text-xs text-brand-accent hover:underline inline-flex items-center gap-1 font-medium"
          >
            Detailed Group Profiles <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {groups.map((grp) => {
            const letter = grp.id;
            const borderColor =
              letter === "A"
                ? "border-sky-500/40"
                : letter === "B"
                ? "border-amber-500/40"
                : "border-purple-500/40";
            const badgeBg =
              letter === "A"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : letter === "B"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-purple-500/10 text-purple-400 border-purple-500/30";

            return (
              <div
                key={grp.id}
                className={`bg-brand-surface border ${borderColor} rounded-2xl p-5 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
                      {grp.name}
                    </span>
                    <span className="text-xs text-brand-muted font-medium num-tabular">
                      {grp.country_count} countries
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-brand-text leading-snug mt-2">
                    {grp.descriptor}
                  </h4>
                  <p className="text-[11px] text-brand-muted mt-2 italic">
                    Provisional label based on centroid z-scores (|z| ≥ 0.5)
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-brand-muted block">Stunting</span>
                    <span className="font-semibold text-brand-text num-tabular">
                      {grp.means.stunting}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-muted block">Obesity</span>
                    <span className="font-semibold text-brand-text num-tabular">
                      {grp.means.adult_obesity}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-muted block">Anaemia</span>
                    <span className="font-semibold text-brand-text num-tabular">
                      {grp.means.anaemia_women}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Country Search & Explorer Table */}
      <BentoCard
        title="Global Country Directory"
        subtitle="Search and filter all 202 countries and territories in the dataset"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter country or ISO3..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent w-48 sm:w-60"
              />
            </div>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="EXCLUDED">Excluded (Insufficient data)</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">ISO3</th>
                <th className="py-2.5 px-3">Country / Territory</th>
                <th className="py-2.5 px-3">Provisional Group</th>
                <th className="py-2.5 px-3 text-right">Stunting (%)</th>
                <th className="py-2.5 px-3 text-right">Overweight (%)</th>
                <th className="py-2.5 px-3 text-right">Wasting (%)</th>
                <th className="py-2.5 px-3 text-right">Adult Obesity (%)</th>
                <th className="py-2.5 px-3 text-center">Double Burden</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {filteredCountries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-brand-muted">
                    No countries matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCountries.slice(0, 50).map((c) => (
                  <tr
                    key={c.iso3}
                    className="hover:bg-brand-raised/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-brand-accent">
                      {c.iso3}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-brand-text">
                      {c.country_name}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.group_id ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
                          Group {c.group_id}
                        </span>
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">
                          Insufficient data
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      {c.indicators.stunting !== null ? `${c.indicators.stunting}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      {c.indicators.child_overweight !== null
                        ? `${c.indicators.child_overweight}%`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      {c.indicators.wasting !== null ? `${c.indicators.wasting}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      {c.indicators.adult_obesity !== null
                        ? `${c.indicators.adult_obesity}%`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.double_burden ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                          Yes
                        </span>
                      ) : (
                        <span className="text-brand-muted text-[11px]">No</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Link
                        to={`/countries/${c.iso3}`}
                        className="text-xs text-brand-accent hover:underline font-medium"
                      >
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredCountries.length > 50 && (
            <div className="py-2 px-3 text-center text-[11px] text-brand-muted border-t border-brand-border">
              Showing first 50 of {filteredCountries.length} countries. Use search to refine.
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
};

