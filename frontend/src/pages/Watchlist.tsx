import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Trash2,
  Share2,
  Download,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { CountryDetail, CountrySummary } from "../api/types";
import {
  getWatchlist,
  removeFromWatchlist,
  addToWatchlist,
  clearWatchlist
} from "../utils/watchlist";
import { exportChartAsPng } from "../utils/exportChart";

const COUNTRY_COLORS = [
  "#2DD4BF",
  "#38BDF8",
  "#F472B6",
  "#A78BFA",
  "#FBBF24",
  "#34D399",
  "#FB923C",
  "#818CF8"
];

export const Watchlist: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [watchlistIsos, setWatchlistIsos] = useState<string[]>([]);
  const [countries, setCountries] = useState<CountryDetail[]>([]);
  const [allCountriesList, setAllCountriesList] = useState<CountrySummary[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from query param if available, otherwise from localStorage
  useEffect(() => {
    const qCountries = searchParams.get("countries");
    if (qCountries) {
      const parsed = qCountries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 8);
      // Sync into localStorage
      parsed.forEach((iso) => addToWatchlist(iso));
      setWatchlistIsos(parsed);
    } else {
      setWatchlistIsos(getWatchlist());
    }
  }, [searchParams]);

  // Load all countries for the add selector
  useEffect(() => {
    api.getCountries()
      .then(setAllCountriesList)
      .catch(() => {});
  }, []);

  // Fetch full details for watchlisted countries
  useEffect(() => {
    if (watchlistIsos.length === 0) {
      setCountries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all(watchlistIsos.map((iso) => api.getCountry(iso)))
      .then((data) => {
        setCountries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load watchlisted country profiles.");
        setLoading(false);
      });
  }, [watchlistIsos]);

  const handleAdd = (iso: string) => {
    if (!iso) return;
    const res = addToWatchlist(iso);
    if (!res.success) {
      alert(res.message);
      return;
    }
    const updated = getWatchlist();
    setWatchlistIsos(updated);
    setSelectedToAdd("");
    setSearchParams({ countries: updated.join(",") });
  };

  const handleRemove = (iso: string) => {
    removeFromWatchlist(iso);
    const updated = getWatchlist();
    setWatchlistIsos(updated);
    if (updated.length > 0) {
      setSearchParams({ countries: updated.join(",") });
    } else {
      setSearchParams({});
    }
  };

  const handleClearAll = () => {
    clearWatchlist();
    setWatchlistIsos([]);
    setCountries([]);
    setSearchParams({});
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/watchlist?countries=${watchlistIsos.join(",")}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Prepare chart comparison data
  const chartData = [
    {
      metric: "Stunting",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.stunting }), {})
    },
    {
      metric: "Overweight",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.child_overweight }), {})
    },
    {
      metric: "Wasting",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.wasting }), {})
    },
    {
      metric: "Obesity",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.adult_obesity }), {})
    },
    {
      metric: "Diabetes",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.adult_diabetes }), {})
    },
    {
      metric: "Anaemia",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.anaemia_women }), {})
    },
    {
      metric: "LBW",
      ...countries.reduce((acc, c) => ({ ...acc, [c.iso3]: c.indicators.low_birth_weight }), {})
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bookmark className="w-5 h-5 text-brand-accent" />
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">
              Country Watchlist & Comparison
            </h1>
          </div>
          <p className="text-xs text-brand-muted">
            Track and compare up to 8 countries side by side across malnutrition dimensions, burden counts, and historical trajectory.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {watchlistIsos.length > 0 && (
            <>
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-raised rounded-lg text-xs font-medium transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-brand-accent" />
                <span>{copiedLink ? "Link Copied!" : "Share View"}</span>
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}

          {/* Add Country Dropdown */}
          <div className="relative">
            <select
              value={selectedToAdd}
              onChange={(e) => handleAdd(e.target.value)}
              disabled={watchlistIsos.length >= 8}
              className="appearance-none bg-brand-raised border border-brand-border text-brand-text text-xs rounded-lg px-3 py-1.5 pr-8 hover:border-brand-accent/40 focus:outline-none focus:border-brand-accent disabled:opacity-50 transition-colors"
            >
              <option value="">
                {watchlistIsos.length >= 8 ? "Capacity reached (8/8)" : "+ Add country to compare..."}
              </option>
              {allCountriesList
                .filter((c) => !watchlistIsos.includes(c.iso3))
                .sort((a, b) => a.country_name.localeCompare(b.country_name))
                .map((c) => (
                  <option key={c.iso3} value={c.iso3}>
                    {c.country_name} ({c.iso3})
                  </option>
                ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />

      {/* Main Content Area */}
      {error && <StatusNotice error={error} />}

      {loading && (
        <div className="p-12 text-center text-xs text-brand-muted">
          Loading watchlist profiles...
        </div>
      )}

      {!loading && countries.length === 0 && (
        <BentoCard>
          <div className="py-16 text-center max-w-md mx-auto space-y-3">
            <Bookmark className="w-10 h-10 text-brand-muted/40 mx-auto" />
            <h3 className="text-sm font-semibold text-brand-text">Your watchlist is empty</h3>
            <p className="text-xs text-brand-muted">
              Add countries using the selector above or by clicking the watchlist bookmark on any Country Profile page. You can track up to 8 countries.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => handleAdd("IND")}
                className="px-3 py-1.5 bg-brand-raised hover:bg-brand-raised/80 border border-brand-border text-brand-text text-xs rounded-lg transition-colors"
              >
                + Add India
              </button>
              <button
                onClick={() => handleAdd("BGD")}
                className="px-3 py-1.5 bg-brand-raised hover:bg-brand-raised/80 border border-brand-border text-brand-text text-xs rounded-lg transition-colors"
              >
                + Add Bangladesh
              </button>
              <button
                onClick={() => handleAdd("NGA")}
                className="px-3 py-1.5 bg-brand-raised hover:bg-brand-raised/80 border border-brand-border text-brand-text text-xs rounded-lg transition-colors"
              >
                + Add Nigeria
              </button>
            </div>
          </div>
        </BentoCard>
      )}

      {!loading && countries.length > 0 && (
        <>
          {/* Comparative Bar Chart */}
          <BentoCard
            title="Cross-Country Malnutrition Comparison"
            subtitle={`Prevalence (%) across ${countries.length} watchlisted countries`}
            action={
              <button
                onClick={() => exportChartAsPng("watchlist-chart-container", "watchlist_comparison.png")}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-brand-raised border border-brand-border text-brand-muted hover:text-brand-text rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-brand-accent" />
                <span>Export PNG</span>
              </button>
            }
          >
            <div id="watchlist-chart-container" className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#243042" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis dataKey="metric" stroke="#8B98A9" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#8B98A9"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: "Prevalence (%)", angle: -90, position: "insideLeft", fill: "#8B98A9", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121821",
                      borderColor: "#243042",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                      color: "#E6EDF3"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                  {countries.map((c, idx) => (
                    <Bar
                      key={c.iso3}
                      dataKey={c.iso3}
                      name={`${c.country_name} (${c.iso3})`}
                      fill={COUNTRY_COLORS[idx % COUNTRY_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BentoCard>

          {/* Side-by-Side Comparison Matrix */}
          <BentoCard
            title="Side-by-Side Indicator Matrix"
            subtitle="Comparing key indicators, burden counts, and classification profiles"
          >
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted">
                    <th className="py-3 px-3 font-medium min-w-[200px]">Country</th>
                    {countries.map((c, idx) => (
                      <th key={c.iso3} className="py-3 px-3 min-w-[150px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: COUNTRY_COLORS[idx % COUNTRY_COLORS.length] }}
                            />
                            <Link
                              to={`/countries/${c.iso3}`}
                              className="font-bold text-brand-text hover:text-brand-accent transition-colors flex items-center gap-1"
                            >
                              <span>{c.country_name}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </Link>
                          </div>
                          <button
                            onClick={() => handleRemove(c.iso3)}
                            title="Remove from watchlist"
                            className="text-brand-muted hover:text-rose-400 p-0.5 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] text-brand-muted font-mono mt-0.5">
                          {c.iso3} &bull; {c.region}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {/* Similar-profile Group */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Similar-Profile Group</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3">
                        {c.group_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                            {c.group_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400">Insufficient data</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Relative Double Burden */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Relative Double Burden</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3">
                        {c.relative_flags.double_burden ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Flagged
                          </span>
                        ) : (
                          <span className="text-brand-muted text-[11px]">No</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Income Group */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Income Group</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 text-brand-text text-[11px]">
                        {c.income_group || "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Stunting Prevalence */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Child Stunting</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.stunting != null ? `${c.indicators.stunting}%` : "N/A"}</span>
                        {c.data_years.stunting && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.stunting})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Stunting Affected Count */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Children Stunted (count)</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular text-brand-muted">
                        {c.stunting_count_thousands != null ? (
                          <span className="text-brand-text">
                            {c.stunting_count_thousands >= 1000
                              ? `${(c.stunting_count_thousands / 1000).toFixed(2)}M`
                              : `${c.stunting_count_thousands.toLocaleString()}k`}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Stunting Change */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Stunting Change (2000–2024)</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        {c.stunting_change_2000_2024 != null ? (
                          <span className={c.stunting_change_2000_2024 <= 0 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                            {c.stunting_change_2000_2024 > 0 ? `+${c.stunting_change_2000_2024}%` : `${c.stunting_change_2000_2024}%`}
                          </span>
                        ) : (
                          <span className="text-brand-muted">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Child Overweight Prevalence */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Child Overweight</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.child_overweight != null ? `${c.indicators.child_overweight}%` : "N/A"}</span>
                        {c.data_years.child_overweight && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.child_overweight})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Overweight Affected Count */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Children Overweight (count)</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular text-brand-muted">
                        {c.child_overweight_count_thousands != null ? (
                          <span className="text-brand-text">
                            {c.child_overweight_count_thousands >= 1000
                              ? `${(c.child_overweight_count_thousands / 1000).toFixed(2)}M`
                              : `${c.child_overweight_count_thousands.toLocaleString()}k`}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Wasting Prevalence */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Child Wasting</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.wasting != null ? `${c.indicators.wasting}%` : "N/A"}</span>
                        {c.data_years.wasting && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.wasting})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Adult Obesity */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Adult Obesity</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.adult_obesity != null ? `${c.indicators.adult_obesity}%` : "N/A"}</span>
                        {c.data_years.adult_obesity && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.adult_obesity})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Adult Diabetes */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Adult Diabetes</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.adult_diabetes != null ? `${c.indicators.adult_diabetes}%` : "N/A"}</span>
                        {c.data_years.adult_diabetes && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.adult_diabetes})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Anaemia in Women */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Anaemia in Women</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.anaemia_women != null ? `${c.indicators.anaemia_women}%` : "N/A"}</span>
                        {c.data_years.anaemia_women && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.anaemia_women})</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Low Birth Weight */}
                  <tr className="hover:bg-brand-raised/20">
                    <td className="py-2.5 px-3 text-brand-muted font-medium">Low Birth Weight</td>
                    {countries.map((c) => (
                      <td key={c.iso3} className="py-2.5 px-3 num-tabular">
                        <span className="text-brand-text font-semibold">{c.indicators.low_birth_weight != null ? `${c.indicators.low_birth_weight}%` : "N/A"}</span>
                        {c.data_years.low_birth_weight && (
                          <span className="text-[10px] text-brand-muted ml-1 font-mono">({c.data_years.low_birth_weight})</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </BentoCard>
        </>
      )}
    </div>
  );
};
