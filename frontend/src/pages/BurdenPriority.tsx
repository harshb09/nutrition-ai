import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Download, SlidersHorizontal, Info, ArrowUpDown, ArrowUpRight } from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { BurdenItem, GroupSummary } from "../api/types";

export const BurdenPriority: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters
  const qRegion = searchParams.get("region") || "";
  const qIncome = searchParams.get("income") || "";
  const qGroup = searchParams.get("group") || "";
  const qDb = searchParams.get("double_burden");
  const qSortBy = searchParams.get("sort_by") || "stunting_count";
  const qSortOrder = searchParams.get("sort_order") || "desc";

  const [items, setItems] = useState<BurdenItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load groups for filter dropdown
  useEffect(() => {
    api.getGroups().then(setGroups).catch(() => {});
  }, []);

  const updateFilters = (newParams: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    setSearchParams(next);
  };

  const loadData = () => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    const dbParam = qDb === "true" ? true : qDb === "false" ? false : undefined;

    api.getBurden(
      {
        region: qRegion || undefined,
        income_group: qIncome || undefined,
        group_id: qGroup || undefined,
        double_burden: dbParam,
        sort_by: qSortBy,
        sort_order: qSortOrder
      },
      setColdStartSeconds
    )
      .then((res) => {
        setItems(res.items);
        setTotalCount(res.total_count);
        setNote(res.note);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load burden and priority data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [qRegion, qIncome, qGroup, qDb, qSortBy, qSortOrder]);

  const csvDownloadUrl = api.getBurdenCsvUrl({
    region: qRegion || undefined,
    income_group: qIncome || undefined,
    group_id: qGroup || undefined,
    double_burden: qDb === "true" ? true : qDb === "false" ? false : undefined,
    sort_by: qSortBy,
    sort_order: qSortOrder
  });

  const regions = [
    "Sub-Saharan Africa",
    "South Asia",
    "East Asia & Pacific",
    "Latin America & Caribbean",
    "Middle East & North Africa",
    "Europe & Central Asia",
    "North America"
  ];

  const incomeLevels = [
    "Low income",
    "Lower middle income",
    "Upper middle income",
    "High income"
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Header and Controls */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-brand-accent text-xs font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" />
            Epidemiological Planning
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
            Burden and Priority Assessment
          </h1>
          <p className="text-xs text-brand-muted mt-2 max-w-2xl leading-relaxed">
            Multi-indicator prioritization comparing paediatric prevalence rates alongside total numbers of children affected. Sortable for targeted programmatic and resource allocation analysis.
          </p>
        </div>

        <div>
          <a
            href={csvDownloadUrl}
            download="malnutrition_burden_priority.csv"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-brand-bg font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <Download className="w-4 h-4" />
            Export Filtered View (CSV)
          </a>
        </div>
      </div>

      {/* Important Methodological Note */}
      <div className="flex items-start gap-3 bg-brand-surface border border-brand-border/80 rounded-xl p-3.5 text-xs text-brand-muted leading-relaxed">
        <Info className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-brand-text">Population Scale Context: </span>
          {note} High prevalence rates identify concentrations of individual risk, while high absolute counts indicate where the largest aggregate populations of affected children reside.
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <BentoCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Region Filter */}
          <div>
            <label className="block text-[11px] font-medium text-brand-muted mb-1">
              Region
            </label>
            <select
              value={qRegion}
              onChange={(e) => updateFilters({ region: e.target.value })}
              className="w-full px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Income Group Filter */}
          <div>
            <label className="block text-[11px] font-medium text-brand-muted mb-1">
              Income Group
            </label>
            <select
              value={qIncome}
              onChange={(e) => updateFilters({ income: e.target.value })}
              className="w-full px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
            >
              <option value="">All Income Groups</option>
              {incomeLevels.map((inc) => (
                <option key={inc} value={inc}>
                  {inc}
                </option>
              ))}
            </select>
          </div>

          {/* Similar-Profile Group Filter */}
          <div>
            <label className="block text-[11px] font-medium text-brand-muted mb-1">
              Similar-Profile Group
            </label>
            <select
              value={qGroup}
              onChange={(e) => updateFilters({ group: e.target.value })}
              className="w-full px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Double Burden Filter */}
          <div>
            <label className="block text-[11px] font-medium text-brand-muted mb-1">
              Double Burden Flag
            </label>
            <select
              value={qDb || ""}
              onChange={(e) => updateFilters({ double_burden: e.target.value })}
              className="w-full px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
            >
              <option value="">All Countries</option>
              <option value="true">Flagged Double-Burden</option>
              <option value="false">Not Flagged</option>
            </select>
          </div>

          {/* Sort Control */}
          <div>
            <label className="block text-[11px] font-medium text-brand-muted mb-1">
              Order By
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={qSortBy}
                onChange={(e) => updateFilters({ sort_by: e.target.value })}
                className="w-full px-3 py-1.5 bg-brand-raised border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                <option value="stunting_count">Stunting Count</option>
                <option value="stunting_prev">Stunting Rate (%)</option>
                <option value="overweight_count">Overweight Count</option>
                <option value="overweight_prev">Overweight Rate (%)</option>
                <option value="country">Country Name</option>
              </select>
              <button
                onClick={() => updateFilters({ sort_order: qSortOrder === "desc" ? "asc" : "desc" })}
                title="Toggle sort direction"
                className="p-1.5 bg-brand-raised hover:bg-brand-border border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Main Table */}
      {loading || coldStartSeconds !== null || error ? (
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={loadData}
        />
      ) : (
        <BentoCard
          title={`Identified Countries (${totalCount})`}
          subtitle="Ordered strictly by selected epidemiological metric. Data year reflects 2024 JME point estimates."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Country / ISO3</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Group</th>
                  <th className="py-3 px-3 text-right">Stunting Affected (000s)</th>
                  <th className="py-3 px-3 text-right">Stunting (%)</th>
                  <th className="py-3 px-3 text-right">Overweight Affected (000s)</th>
                  <th className="py-3 px-3 text-right">Overweight (%)</th>
                  <th className="py-3 px-3 text-center">Data Year</th>
                  <th className="py-3 px-3 text-center">Double Burden</th>
                  <th className="py-3 px-3 text-center">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-brand-muted">
                      No countries matching the active filters.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.iso3} className="hover:bg-brand-raised/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-brand-text">{it.country_name}</span>
                          <span className="font-mono text-[10px] text-brand-muted bg-brand-bg px-1 rounded border border-brand-border">
                            {it.iso3}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-brand-muted truncate max-w-[140px]" title={it.region}>
                        {it.region}
                      </td>
                      <td className="py-3 px-3">
                        {it.group_id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
                            Group {it.group_id}
                          </span>
                        ) : (
                          <span className="text-brand-muted text-[10px] italic">Excluded</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-brand-text num-tabular">
                        {it.stunting_count_thousands !== null
                          ? it.stunting_count_thousands.toLocaleString(undefined, { maximumFractionDigits: 1 })
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right num-tabular text-brand-text">
                        {it.stunting_prevalence !== null ? `${it.stunting_prevalence}%` : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-brand-muted num-tabular">
                        {it.child_overweight_count_thousands !== null
                          ? it.child_overweight_count_thousands.toLocaleString(undefined, { maximumFractionDigits: 1 })
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right num-tabular text-brand-text">
                        {it.child_overweight_prevalence !== null ? `${it.child_overweight_prevalence}%` : "—"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-brand-muted">
                        {it.stunting_count_year || it.stunting_prevalence_year || 2024}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {it.double_burden ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                            Flagged
                          </span>
                        ) : (
                          <span className="text-brand-muted text-[10px]">No</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          to={`/countries/${it.iso3}`}
                          className="text-xs text-brand-accent hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}
    </div>
  );
};
