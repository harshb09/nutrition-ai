import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layers, Globe, DollarSign, ArrowUpRight } from "lucide-react";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { GroupSummary } from "../api/types";

const FEATURE_ORDER = [
  { key: "stunting", label: "Child Stunting (% under 5)" },
  { key: "child_overweight", label: "Child Overweight (% under 5)" },
  { key: "wasting", label: "Child Wasting (% under 5)" },
  { key: "adult_obesity", label: "Adult Obesity (%)" },
  { key: "adult_diabetes", label: "Adult Diabetes (%)" },
  { key: "anaemia_women", label: "Anaemia in Women 15-49 (%)" },
  { key: "low_birth_weight", label: "Low Birth Weight (% births)" },
];

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = () => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    api.getGroups(setColdStartSeconds)
      .then((data) => {
        setGroups(data);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load groups data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadGroups();
  }, []);

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={loadGroups}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <DisclaimerBanner />

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1 text-brand-accent text-xs font-semibold uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          Exploratory Malnutrition Profiles
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
          Provisional Country Groups
        </h1>
        <p className="text-xs text-brand-muted mt-2 max-w-3xl leading-relaxed">
          Clusters are generated using multidimensional similarity analysis over 7 malnutrition indicators, ordered strictly by descending mean child stunting. Descriptors reflect characteristic departures from the international standardized mean (|z| ≥ 0.5).
        </p>
      </div>

      {/* Sections for each group */}
      <div className="space-y-8">
        {groups.map((grp) => {
          const letter = grp.id;
          const badgeBg =
            letter === "A"
              ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
              : letter === "B"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-purple-500/10 text-purple-400 border-purple-500/30";

          return (
            <div
              key={grp.id}
              className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm space-y-6"
            >
              {/* Group Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-brand-border">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
                      {grp.name}
                    </span>
                    <span className="text-xs text-brand-muted">
                      {grp.country_count} member countries
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-brand-text">
                    {grp.provisional_name}
                  </h2>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    <span className="font-semibold text-brand-text">Distinguishing Profile: </span>
                    {grp.descriptor}. Always interpreted provisionally as mathematical similarity clusters.
                  </p>
                </div>
              </div>

              {/* Grid: Indicators vs Geography & Income */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Indicator Averages */}
                <div className="lg:col-span-2 bg-brand-raised/50 border border-brand-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-brand-text uppercase tracking-wider mb-3">
                    Average Indicator Profile &amp; Relative Departures
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border/60 text-brand-muted uppercase text-[10px]">
                          <th className="py-2 px-2">Indicator</th>
                          <th className="py-2 px-2 text-right">Group Mean</th>
                          <th className="py-2 px-2 text-right">Group Median</th>
                          <th className="py-2 px-2 text-right">Relative Departure (z)</th>
                          <th className="py-2 px-2 text-center">Departure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40">
                        {FEATURE_ORDER.map(({ key, label }) => {
                          const meanVal = grp.means[key];
                          const medVal = grp.medians[key];
                          const z = grp.centroid_z_scores[key];
                          const isHigh = z >= 0.5;
                          const isLow = z <= -0.5;

                          return (
                            <tr key={key} className="hover:bg-brand-surface/60">
                              <td className="py-2 px-2 text-brand-text font-medium">
                                {label}
                              </td>
                              <td className="py-2 px-2 text-right num-tabular font-semibold text-brand-text">
                                {meanVal}%
                              </td>
                              <td className="py-2 px-2 text-right num-tabular text-brand-muted">
                                {medVal}%
                              </td>
                              <td className="py-2 px-2 text-right num-tabular font-mono text-brand-muted">
                                {z > 0 ? `+${z.toFixed(2)}` : z.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {isHigh ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                                    Higher (z ≥ +0.5)
                                  </span>
                                ) : isLow ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    Lower (z ≤ -0.5)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-brand-muted font-normal">
                                    Moderate
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Regional & Income Composition */}
                <div className="space-y-4">
                  {/* Regions */}
                  <div className="bg-brand-raised/50 border border-brand-border rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-brand-accent" />
                      World Bank Regions
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(grp.region_distribution).map(([reg, count]) => (
                        <div key={reg} className="flex items-center justify-between">
                          <span className="text-brand-muted truncate max-w-[170px]" title={reg}>
                            {reg}
                          </span>
                          <span className="font-semibold text-brand-text num-tabular">
                            {count} ({Math.round((count / grp.country_count) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Income */}
                  <div className="bg-brand-raised/50 border border-brand-border rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-brand-accent" />
                      Income Classifications
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(grp.income_distribution).map(([inc, count]) => (
                        <div key={inc} className="flex items-center justify-between">
                          <span className="text-brand-muted truncate max-w-[170px]" title={inc}>
                            {inc}
                          </span>
                          <span className="font-semibold text-brand-text num-tabular">
                            {count} ({Math.round((count / grp.country_count) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Countries Grid */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-brand-text uppercase tracking-wider mb-3">
                  Member Countries ({grp.member_countries.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {grp.member_countries.map((c) => (
                    <Link
                      key={c.iso3}
                      to={`/countries/${c.iso3}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-brand-raised hover:bg-brand-border border border-brand-border/60 transition-colors text-xs text-brand-text group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] text-brand-accent">
                          {c.iso3}
                        </span>
                        <span className="truncate text-brand-muted group-hover:text-brand-text">
                          {c.country_name}
                        </span>
                      </div>
                      <ArrowUpRight className="w-3 h-3 text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
