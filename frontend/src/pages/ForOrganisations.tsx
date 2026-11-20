import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Building2,
  GitCompare,
  Download,
  Bookmark,
  Share2,
  Trash2,
  Check
} from "lucide-react";
import { api } from "../api/client";
import { DistrictSummary, StateSummary } from "../api/types";

export const ForOrganisations: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [allDistricts, setAllDistricts] = useState<DistrictSummary[]>([]);
  const [states, setStates] = useState<StateSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: "compare", "state-view", or "watchlist"
  const [activeTab, setActiveTab] = useState<"compare" | "state-view" | "watchlist">(
    (searchParams.get("tab") as any) || "compare"
  );

  // Multi-district comparison selection (2 to 4 districts)
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<string[]>(() => {
    const fromUrl = searchParams.get("compare");
    return fromUrl ? fromUrl.split(",") : ["Uttar Pradesh::Varanasi", "Bihar::Patna"];
  });

  // State view selection
  const [selectedStateName, setSelectedStateName] = useState<string>(
    searchParams.get("state") || "Uttar Pradesh"
  );

  // Watchlist stored in browser localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("nutrition_district_watchlist");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [dists, sts] = await Promise.all([
          api.getIndiaDistricts(),
          api.getIndiaStates()
        ]);
        setAllDistricts(dists);
        setStates(sts);
      } catch (err) {
        console.error("Failed to load organisation data", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Sync state to URL search parameters
  const updateUrlParams = (tab: string, compareIds: string[], stateName: string) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (compareIds.length > 0) params.set("compare", compareIds.join(","));
    if (stateName) params.set("state", stateName);
    setSearchParams(params, { replace: true });
  };

  const handleTabChange = (t: "compare" | "state-view" | "watchlist") => {
    setActiveTab(t);
    updateUrlParams(t, selectedDistrictIds, selectedStateName);
  };

  const handleAddCompare = (districtId: string) => {
    if (selectedDistrictIds.includes(districtId) || selectedDistrictIds.length >= 4) return;
    const next = [...selectedDistrictIds, districtId];
    setSelectedDistrictIds(next);
    updateUrlParams(activeTab, next, selectedStateName);
  };

  const handleRemoveCompare = (districtId: string) => {
    const next = selectedDistrictIds.filter((id) => id !== districtId);
    setSelectedDistrictIds(next);
    updateUrlParams(activeTab, next, selectedStateName);
  };

  // Watchlist persistence
  const toggleWatchlist = (districtId: string) => {
    try {
      let updated: string[];
      if (watchlist.includes(districtId)) {
        updated = watchlist.filter((id) => id !== districtId);
      } else {
        if (watchlist.length >= 8) {
          alert("Watchlist can hold up to 8 districts.");
          return;
        }
        updated = [...watchlist, districtId];
      }
      setWatchlist(updated);
      localStorage.setItem("nutrition_district_watchlist", JSON.stringify(updated));
    } catch (e) {
      console.warn("localStorage is not available.");
    }
  };

  const handleShareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Filtered districts for comparison
  const comparedDistricts = useMemo(() => {
    return selectedDistrictIds
      .map((id) => allDistricts.find((d) => d.district_id === id))
      .filter(Boolean) as DistrictSummary[];
  }, [selectedDistrictIds, allDistricts]);

  // Districts for selected state
  const stateDistricts = useMemo(() => {
    return allDistricts.filter(
      (d) => d.state.toLowerCase() === selectedStateName.toLowerCase()
    );
  }, [allDistricts, selectedStateName]);

  // Priority lists for state (higher than most relative to India)
  const stateHigherStunting = useMemo(() => {
    return [...stateDistricts]
      .filter((d) => d.indicators?.stunting?.band === "higher_than_most")
      .sort((a, b) => (b.indicators?.stunting?.value ?? 0) - (a.indicators?.stunting?.value ?? 0));
  }, [stateDistricts]);

  const stateHigherAnaemia = useMemo(() => {
    return [...stateDistricts]
      .filter((d) => d.indicators?.anaemia_children?.band === "higher_than_most")
      .sort((a, b) => (b.indicators?.anaemia_children?.value ?? 0) - (a.indicators?.anaemia_children?.value ?? 0));
  }, [stateDistricts]);

  // CSV Export handler
  const handleExportCsv = () => {
    const rows = stateDistricts.map((d) => ({
      District: d.district,
      State: d.state,
      Pattern_Group: d.group_name,
      Stunting_Percent: d.indicators?.stunting?.value ?? "",
      Stunting_Relative_Band: d.indicators?.stunting?.band ?? "",
      Wasting_Percent: d.indicators?.wasting?.value ?? "",
      Underweight_Percent: d.indicators?.underweight?.value ?? "",
      Child_Anaemia_Percent: d.indicators?.anaemia_children?.value ?? "",
      Women_Anaemia_Percent: d.indicators?.anaemia_women?.value ?? "",
      Women_Low_BMI_Percent: d.indicators?.low_bmi_women?.value ?? "",
      Women_Overweight_Percent: d.indicators?.overweight_women?.value ?? "",
    }));

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(",");
    const csvContent = [
      headers,
      ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStateName}_Districts_Nutrition_Summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-brand-muted">Loading organisation workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="border-b border-brand-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">
            Health Systems & Program Planning
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            For Health Organisations & Planners
          </h1>
          <p className="text-xs text-brand-muted mt-1 max-w-2xl">
            Side-by-side district benchmarking, state distribution lists relative to national patterns, custom watchlists, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareUrl}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-text transition-colors shadow-sm"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-brand-muted" />
                <span>Share View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border">
        {[
          { id: "compare", label: "Multi-District Comparison (2–4)", icon: GitCompare },
          { id: "state-view", label: "State Focus & Priority Lists", icon: Building2 },
          { id: "watchlist", label: `Saved Watchlist (${watchlist.length}/8)`, icon: Bookmark },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                isActive
                  ? "border-brand-accent text-brand-accent bg-brand-surface font-semibold"
                  : "border-transparent text-brand-muted hover:text-brand-text hover:bg-brand-surface/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Multi-District Comparison */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          {/* Add District Bar */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <span className="text-xs font-bold text-brand-text">
              Select up to 4 districts to compare side-by-side:
            </span>

            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddCompare(e.target.value);
                    e.target.value = "";
                  }
                }}
                disabled={selectedDistrictIds.length >= 4}
                className="bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent disabled:opacity-40"
              >
                <option value="">+ Add a district to comparison...</option>
                {allDistricts
                  .filter((d) => !selectedDistrictIds.includes(d.district_id))
                  .map((d) => (
                    <option key={d.district_id} value={d.district_id}>
                      {d.district} ({d.state})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Side by side comparison table */}
          {comparedDistricts.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center space-y-2">
              <p className="text-xs text-brand-muted">
                No districts selected. Choose 2 to 4 districts above to compare them side-by-side.
              </p>
            </div>
          ) : (
            <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-brand-raised border-b border-brand-border text-brand-muted">
                      <th className="py-3 px-4 font-semibold w-56">Indicator</th>
                      {comparedDistricts.map((d) => (
                        <th key={d.district_id} className="py-3 px-4 min-w-[200px]">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-brand-text text-sm block">
                                {d.district}
                              </span>
                              <span className="text-[11px] text-brand-muted block">{d.state}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleWatchlist(d.district_id)}
                                className="p-1 text-brand-muted hover:text-amber-500 rounded"
                                title="Add to watchlist"
                              >
                                <Bookmark
                                  className={`w-3.5 h-3.5 ${
                                    watchlist.includes(d.district_id)
                                      ? "fill-amber-500 text-amber-500"
                                      : ""
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleRemoveCompare(d.district_id)}
                                className="p-1 text-brand-muted hover:text-rose-500 rounded"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60">
                    {/* Pattern Group */}
                    <tr className="bg-brand-raised/20 font-medium">
                      <td className="py-2.5 px-4 font-semibold text-brand-text">Nutrition Pattern</td>
                      {comparedDistricts.map((d) => (
                        <td key={d.district_id} className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-brand-accent/15 text-brand-accent font-semibold text-[11px]">
                            {d.group_name}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Child Stunting */}
                    {[
                      { key: "stunting", label: "Child Stunting (under 5)" },
                      { key: "wasting", label: "Child Wasting (under 5)" },
                      { key: "underweight", label: "Child Underweight (under 5)" },
                      { key: "anaemia_children", label: "Child Anaemia (6-59m)" },
                      { key: "anaemia_women", label: "Women Anaemia (15-49y)" },
                      { key: "low_bmi_women", label: "Women Low BMI (< 18.5)" },
                      { key: "overweight_women", label: "Women Overweight (≥ 25)" },
                      { key: "improved_drinking_water", label: "Improved Drinking Water" },
                      { key: "improved_sanitation", label: "Improved Sanitation" },
                      { key: "clean_cooking_fuel", label: "Clean Cooking Fuel" },
                      { key: "immunization", label: "Full Immunization (12-23m)" },
                    ].map(({ key, label }) => (
                      <tr key={key} className="hover:bg-brand-raised/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-brand-text">{label}</td>
                        {comparedDistricts.map((d) => {
                          const ind = d.indicators?.[key];
                          return (
                            <td key={d.district_id} className="py-2.5 px-4 font-mono">
                              <span className="font-bold text-brand-text text-sm">
                                {ind?.value !== null && ind?.value !== undefined ? `${ind.value}%` : "—"}
                              </span>
                              {ind?.band && (
                                <span className="block text-[10px] text-brand-muted">
                                  {ind.band.replace(/_/g, " ")}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: State Focus & Priority Lists */}
      {activeTab === "state-view" && (
        <div className="space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-wider block">
                State Distribution
              </span>
              <h3 className="text-base font-bold text-brand-text">
                Focus on {selectedStateName} ({stateDistricts.length} Districts)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStateName}
                onChange={(e) => {
                  setSelectedStateName(e.target.value);
                  updateUrlParams(activeTab, selectedDistrictIds, e.target.value);
                }}
                className="bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
              >
                {states.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} ({s.district_count} districts)
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportCsv}
                className="px-3 py-2 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-text flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-brand-accent" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Priority Focus Sections (Higher than most relative to India) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* List 1: Higher Child Stunting */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="border-b border-brand-border pb-2">
                <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                  Districts with Higher Child Stunting Relative to India ({stateHigherStunting.length})
                </h4>
                <p className="text-[11px] text-brand-muted mt-0.5">
                  Districts in the top third across all surveyed districts in India. (Not ranked as worst or best).
                </p>
              </div>

              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {stateHigherStunting.map((d) => (
                  <div
                    key={d.district_id}
                    className="p-2.5 bg-brand-raised/50 rounded-xl flex items-center justify-between text-xs hover:bg-brand-raised"
                  >
                    <div>
                      <Link
                        to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                        className="font-bold text-brand-text hover:text-brand-accent"
                      >
                        {d.district}
                      </Link>
                      <span className="text-[10px] text-brand-muted block">
                        {d.group_name}
                      </span>
                    </div>
                    <span className="font-bold text-rose-500 font-mono text-sm">
                      {d.indicators?.stunting?.value}%
                    </span>
                  </div>
                ))}
                {stateHigherStunting.length === 0 && (
                  <p className="text-xs text-brand-muted py-4 text-center">
                    No districts in {selectedStateName} fall in the higher-than-most stunting band.
                  </p>
                )}
              </div>
            </div>

            {/* List 2: Higher Child Anaemia */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="border-b border-brand-border pb-2">
                <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                  Districts with Higher Child Anaemia Relative to India ({stateHigherAnaemia.length})
                </h4>
                <p className="text-[11px] text-brand-muted mt-0.5">
                  Districts in the top third for anaemia among children aged 6–59 months.
                </p>
              </div>

              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {stateHigherAnaemia.map((d) => (
                  <div
                    key={d.district_id}
                    className="p-2.5 bg-brand-raised/50 rounded-xl flex items-center justify-between text-xs hover:bg-brand-raised"
                  >
                    <div>
                      <Link
                        to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                        className="font-bold text-brand-text hover:text-brand-accent"
                      >
                        {d.district}
                      </Link>
                      <span className="text-[10px] text-brand-muted block">
                        {d.group_name}
                      </span>
                    </div>
                    <span className="font-bold text-amber-500 font-mono text-sm">
                      {d.indicators?.anaemia_children?.value}%
                    </span>
                  </div>
                ))}
                {stateHigherAnaemia.length === 0 && (
                  <p className="text-xs text-brand-muted py-4 text-center">
                    No districts in {selectedStateName} fall in the higher-than-most anaemia band.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Saved Watchlist */}
      {activeTab === "watchlist" && (
        <div className="space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-brand-text">
                Saved District Watchlist ({watchlist.length} / 8 districts)
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Districts saved locally in your browser for monitoring. Up to 8 districts can be saved.
              </p>
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center space-y-2">
              <Bookmark className="w-8 h-8 text-brand-muted mx-auto" />
              <p className="text-xs text-brand-muted">
                Your watchlist is currently empty. Bookmark districts on the comparison or profile pages to save them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchlist.map((id) => {
                const d = allDistricts.find((item) => item.district_id === id);
                if (!d) return null;
                return (
                  <div
                    key={d.district_id}
                    className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <Link
                        to={`/district/${encodeURIComponent(d.state)}/${encodeURIComponent(d.district)}`}
                        className="font-bold text-sm text-brand-text hover:text-brand-accent block"
                      >
                        {d.district}, {d.state}
                      </Link>
                      <span className="text-[11px] text-brand-muted block">
                        {d.group_name}
                      </span>
                      <div className="flex items-center gap-3 text-xs pt-1">
                        <span>
                          Stunting:{" "}
                          <strong className="font-mono text-brand-text">
                            {d.indicators?.stunting?.value}%
                          </strong>
                        </span>
                        <span>
                          Anaemia:{" "}
                          <strong className="font-mono text-brand-text">
                            {d.indicators?.anaemia_children?.value}%
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleWatchlist(d.district_id)}
                      className="p-1.5 text-brand-muted hover:text-rose-500 rounded"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
