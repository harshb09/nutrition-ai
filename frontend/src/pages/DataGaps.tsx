import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HelpCircle,
  Search,
  Download,
  Info,
  ChevronDown,
  ArrowUpRight
} from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { CountrySummary } from "../api/types";

const INDICATOR_KEYS = [
  { key: "stunting", label: "Child Stunting" },
  { key: "child_overweight", label: "Child Overweight" },
  { key: "wasting", label: "Child Wasting" },
  { key: "adult_obesity", label: "Adult Obesity" },
  { key: "adult_diabetes", label: "Adult Diabetes" },
  { key: "anaemia_women", label: "Anaemia in Women" },
  { key: "low_birth_weight", label: "Low Birth Weight" }
];

export const DataGaps: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const qRegion = searchParams.get("region") || "";
  const qIncome = searchParams.get("income") || "";
  const qStatus = searchParams.get("status") || "all";
  const qIndicator = searchParams.get("missing_indicator") || "";
  const qSearch = searchParams.get("search") || "";

  useEffect(() => {
    setLoading(true);
    api.getCountries()
      .then((data) => {
        setCountries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load countries.");
        setLoading(false);
      });
  }, []);

  const updateFilters = (newParams: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === "all") {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    setSearchParams(next);
  };

  // Derive unique filter options
  const regions = useMemo(() => {
    return Array.from(new Set(countries.map((c) => c.region))).filter(Boolean).sort();
  }, [countries]);

  const incomeGroups = useMemo(() => {
    return Array.from(new Set(countries.map((c) => c.income_group))).filter(Boolean).sort();
  }, [countries]);

  // Filtered countries
  const filtered = useMemo(() => {
    return countries.filter((c) => {
      if (qRegion && c.region !== qRegion) return false;
      if (qIncome && c.income_group !== qIncome) return false;
      if (qStatus === "complete" && c.missing_feature_count !== 0) return false;
      if (qStatus === "imputed" && (c.missing_feature_count !== 1 || c.status !== "analyzed")) return false;
      if (qStatus === "excluded" && c.status !== "insufficient_data") return false;
      if (qIndicator) {
        const rawVal = c.indicators_raw ? c.indicators_raw[qIndicator] : null;
        if (rawVal !== null && rawVal !== undefined) return false;
      }
      if (qSearch) {
        const term = qSearch.toLowerCase();
        return (
          c.country_name.toLowerCase().includes(term) ||
          c.iso3.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [countries, qRegion, qIncome, qStatus, qIndicator, qSearch]);

  // Overall missingness breakdown by indicator
  const indicatorStats = useMemo(() => {
    if (countries.length === 0) return [];
    return INDICATOR_KEYS.map((ind) => {
      let missingCount = 0;
      let imputedCount = 0;
      countries.forEach((c) => {
        const isMissing = c.indicators_raw ? c.indicators_raw[ind.key] == null : c.indicators[ind.key] == null;
        if (isMissing) {
          missingCount += 1;
          if (c.is_imputed && c.is_imputed[ind.key]) {
            imputedCount += 1;
          }
        }
      });
      return {
        ...ind,
        missingCount,
        missingPct: ((missingCount / countries.length) * 100).toFixed(1),
        imputedCount,
        reportedCount: countries.length - missingCount
      };
    });
  }, [countries]);

  // Export CSV of the filtered view
  const exportCsv = () => {
    const headers = [
      "ISO3",
      "Country",
      "Region",
      "Income Group",
      "Status",
      "Missing Count",
      ...INDICATOR_KEYS.map((k) => `${k.label} (Value)`),
      ...INDICATOR_KEYS.map((k) => `${k.label} (Year)`),
      ...INDICATOR_KEYS.map((k) => `${k.label} (Imputed)`)
    ];

    const rows = filtered.map((c) => {
      const vals = INDICATOR_KEYS.map((k) => (c.indicators[k.key] != null ? c.indicators[k.key] : ""));
      const years = INDICATOR_KEYS.map((k) => (c.data_years[k.key] != null ? c.data_years[k.key] : ""));
      const imputed = INDICATOR_KEYS.map((k) => (c.is_imputed && c.is_imputed[k.key] ? "YES" : "NO"));
      return [
        c.iso3,
        `"${c.country_name}"`,
        `"${c.region}"`,
        `"${c.income_group}"`,
        c.status,
        c.missing_feature_count,
        ...vals,
        ...years,
        ...imputed
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "malnutrition_data_gaps.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-5 h-5 text-brand-accent" />
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">
              Data Gap Explorer
            </h1>
          </div>
          <p className="text-xs text-brand-muted">
            Survey coverage, reporting years, and missingness audit across the 7 malnutrition dimensions.
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-raised rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-brand-accent" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />

      {/* Analytical Callout: Why data gaps occur */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-brand-text text-xs font-semibold">
          <Info className="w-4 h-4 text-brand-accent shrink-0" />
          <span>Understanding Malnutrition Data Gaps</span>
        </div>
        <p className="text-xs text-brand-muted leading-relaxed">
          Data gaps are disproportionately concentrated in <strong className="text-brand-text">high-income countries</strong> (where household health surveys such as DHS and MICS measuring child wasting, stunting, or maternal anaemia are rarely conducted because malnutrition prevalence is generally assumed low) and <strong className="text-brand-text">small island nations or conflict-affected territories</strong> with limited national statistical infrastructure. A data gap reflects the absence of recent standardized survey reporting, not an absence of population health need.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[11px] text-brand-muted font-medium mb-1">Country Universe</div>
          <div className="text-2xl font-bold text-brand-text font-mono num-tabular">202</div>
          <div className="text-[10px] text-brand-muted mt-1">Recognized countries & areas</div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[11px] text-brand-muted font-medium mb-1">Complete Reporting</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono num-tabular">121</div>
          <div className="text-[10px] text-brand-muted mt-1">All 7 indicators available (59.9%)</div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[11px] text-brand-muted font-medium mb-1">Single Gap Imputed</div>
          <div className="text-2xl font-bold text-brand-accent font-mono num-tabular">35</div>
          <div className="text-[10px] text-brand-muted mt-1">KNN (k=5) imputed (17.3%)</div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[11px] text-brand-muted font-medium mb-1">Insufficient Data</div>
          <div className="text-2xl font-bold text-amber-400 font-mono num-tabular">46</div>
          <div className="text-[10px] text-brand-muted mt-1">&gt;1 missing indicators; excluded</div>
        </div>
      </div>

      {/* Indicator Missingness Overview */}
      <BentoCard
        title="Missingness by Malnutrition Dimension"
        subtitle="Unreported indicators across the 202-country universe"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {indicatorStats.map((ind) => (
            <div
              key={ind.key}
              onClick={() => updateFilters({ missing_indicator: qIndicator === ind.key ? "" : ind.key })}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                qIndicator === ind.key
                  ? "bg-brand-raised border-brand-accent text-brand-text shadow-sm"
                  : "bg-brand-raised/40 border-brand-border hover:border-brand-border/80 text-brand-muted"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-brand-text">{ind.label}</span>
                <span className="font-mono text-[11px] num-tabular text-amber-400">{ind.missingPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-brand-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400/80 rounded-full"
                  style={{ width: `${ind.missingPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span>{ind.missingCount} missing</span>
                <span>{ind.imputedCount > 0 ? `${ind.imputedCount} imputed` : "0 imputed"}</span>
              </div>
            </div>
          ))}
        </div>
      </BentoCard>

      {/* Filter Toolbar */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by country or ISO3..."
              value={qSearch}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full bg-brand-raised border border-brand-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>

          {/* Region filter */}
          <div className="relative">
            <select
              value={qRegion}
              onChange={(e) => updateFilters({ region: e.target.value })}
              className="appearance-none bg-brand-raised border border-brand-border text-brand-text text-xs rounded-lg px-3 py-1.5 pr-8 hover:border-brand-accent/40 focus:outline-none focus:border-brand-accent transition-colors"
            >
              <option value="">All Regions ({regions.length})</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Income filter */}
          <div className="relative">
            <select
              value={qIncome}
              onChange={(e) => updateFilters({ income: e.target.value })}
              className="appearance-none bg-brand-raised border border-brand-border text-brand-text text-xs rounded-lg px-3 py-1.5 pr-8 hover:border-brand-accent/40 focus:outline-none focus:border-brand-accent transition-colors"
            >
              <option value="">All Income Groups ({incomeGroups.length})</option>
              {incomeGroups.map((inc) => (
                <option key={inc} value={inc}>
                  {inc}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={qStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="appearance-none bg-brand-raised border border-brand-border text-brand-text text-xs rounded-lg px-3 py-1.5 pr-8 hover:border-brand-accent/40 focus:outline-none focus:border-brand-accent transition-colors"
            >
              <option value="all">All Grouping Statuses</option>
              <option value="complete">Complete (0 missing)</option>
              <option value="imputed">Imputed (1 missing)</option>
              <option value="excluded">Excluded (&gt;1 missing)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Active indicator filter reset */}
          {qIndicator && (
            <button
              onClick={() => updateFilters({ missing_indicator: "" })}
              className="px-2.5 py-1 text-[11px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
            >
              <span>Missing: {INDICATOR_KEYS.find((k) => k.key === qIndicator)?.label}</span>
              <span className="font-bold">&times;</span>
            </button>
          )}

          {(qRegion || qIncome || qStatus !== "all" || qIndicator || qSearch) && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-brand-muted hover:text-brand-text underline transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-[11px] text-brand-muted flex items-center justify-between">
          <span>Showing {filtered.length} of {countries.length} countries</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Reported</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-accent" />
              <span>KNN Imputed</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Missing</span>
            </span>
          </span>
        </div>
      </div>

      {/* Main Data Gaps Table */}
      {error && <StatusNotice error={error} />}

      {loading ? (
        <div className="p-12 text-center text-xs text-brand-muted">Loading data gaps table...</div>
      ) : filtered.length === 0 ? (
        <BentoCard>
          <div className="py-12 text-center text-xs text-brand-muted">
            No countries match the selected filters.
          </div>
        </BentoCard>
      ) : (
        <BentoCard
          title="Country Indicator Reporting & Survey Year Matrix"
          subtitle="Green indicates official survey year; teal indicates statistical KNN imputation; amber indicates missing data"
        >
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted">
                  <th className="py-3 px-3 font-medium min-w-[180px]">Country</th>
                  <th className="py-3 px-3 font-medium min-w-[130px]">Region</th>
                  <th className="py-3 px-3 font-medium min-w-[120px]">Status</th>
                  {INDICATOR_KEYS.map((ind) => (
                    <th key={ind.key} className="py-3 px-2 font-medium text-center min-w-[95px]">
                      {ind.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {filtered.map((c) => (
                  <tr key={c.iso3} className="hover:bg-brand-raised/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <Link
                        to={`/countries/${c.iso3}`}
                        className="font-medium text-brand-text hover:text-brand-accent transition-colors flex items-center gap-1.5"
                      >
                        <span>{c.country_name}</span>
                        <span className="font-mono text-[10px] text-brand-muted">({c.iso3})</span>
                        <ArrowUpRight className="w-3 h-3 opacity-40" />
                      </Link>
                    </td>

                    <td className="py-2.5 px-3 text-brand-muted text-[11px]">
                      {c.region}
                    </td>

                    <td className="py-2.5 px-3">
                      {c.status === "analyzed" ? (
                        c.missing_feature_count === 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Complete (0 gap)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                            1 gap imputed
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Excluded ({c.missing_feature_count} gaps)
                        </span>
                      )}
                    </td>

                    {INDICATOR_KEYS.map((ind) => {
                      const isRawMissing = c.indicators_raw ? c.indicators_raw[ind.key] == null : c.indicators[ind.key] == null;
                      const isImputed = c.is_imputed ? c.is_imputed[ind.key] : false;
                      const year = c.data_years ? c.data_years[ind.key] : null;

                      if (isRawMissing && isImputed) {
                        return (
                          <td key={ind.key} className="py-2.5 px-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-accent/15 text-brand-accent border border-brand-accent/30 font-mono">
                              Imputed
                            </span>
                          </td>
                        );
                      }

                      if (isRawMissing) {
                        return (
                          <td key={ind.key} className="py-2.5 px-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              Missing
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={ind.key} className="py-2.5 px-2 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono num-tabular">
                            {year ?? "Present"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}
    </div>
  );
};
