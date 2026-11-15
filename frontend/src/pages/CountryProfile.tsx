import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Download,
  AlertTriangle,
  Calendar,
  Layers,
  ChevronDown,
  Info
} from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { CountryDetail, CountrySummary } from "../api/types";

const FEATURE_ORDER = [
  { key: "stunting", label: "Child Stunting (% under 5)" },
  { key: "child_overweight", label: "Child Overweight (% under 5)" },
  { key: "wasting", label: "Child Wasting (% under 5)" },
  { key: "adult_obesity", label: "Adult Obesity (%)" },
  { key: "adult_diabetes", label: "Adult Diabetes (%)" },
  { key: "anaemia_women", label: "Anaemia in Women 15-49 (%)" },
  { key: "low_birth_weight", label: "Low Birth Weight (% live births)" },
];

export const CountryProfile: React.FC = () => {
  const { iso3 } = useParams<{ iso3?: string }>();
  const navigate = useNavigate();

  const [allCountries, setAllCountries] = useState<CountrySummary[]>([]);
  const [selectedIso, setSelectedIso] = useState<string>(iso3 || "IND");
  const [country, setCountry] = useState<CountryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all countries once for the dropdown picker
  useEffect(() => {
    api.getCountries().then(setAllCountries).catch(() => {});
  }, []);

  // Update selectedIso when url param changes
  useEffect(() => {
    if (iso3) {
      setSelectedIso(iso3.toUpperCase());
    }
  }, [iso3]);

  // Load country detail
  const fetchCountry = (targetIso: string) => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    api.getCountry(targetIso, setColdStartSeconds)
      .then((data) => {
        setCountry(data);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load profile for ${targetIso}.`);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedIso) {
      fetchCountry(selectedIso);
    }
  }, [selectedIso]);

  const handleCountryChange = (newIso: string) => {
    setSelectedIso(newIso);
    navigate(`/countries/${newIso}`);
  };

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={() => fetchCountry(selectedIso)}
        />
      </div>
    );
  }

  if (!country) return null;

  const pdfUrl = api.getPdfBriefUrl(country.iso3);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Country Header & Picker Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/30 font-semibold">
              {country.iso3}
            </span>
            <span className="text-xs text-brand-muted">{country.region}</span>
            <span className="text-brand-muted text-xs">•</span>
            <span className="text-xs text-brand-muted">{country.income_group}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
            {country.country_name}
          </h1>

          {/* Group and Double Burden Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            {country.status === "analyzed" && country.group_id ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
                <Layers className="w-3.5 h-3.5" />
                Group {country.group_id}: {country.group_descriptor} (Provisional)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Insufficient data for grouping (Missing &gt; 1 feature)
              </span>
            )}

            {country.double_burden && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Double-Burden of Malnutrition (relative to other countries in this dataset)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Country Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedIso}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-brand-raised border border-brand-border rounded-xl text-xs font-medium text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
            >
              {allCountries.map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.country_name} ({c.iso3})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* PDF Download Button */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-brand-bg font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg"
          >
            <Download className="w-4 h-4" />
            Download brief (PDF)
          </a>
        </div>
      </div>

      {/* Excluded notice if applicable */}
      {country.status === "insufficient_data" && (
        <div className="bg-brand-raised border border-brand-border rounded-2xl p-4 text-xs text-brand-muted flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-brand-text">Grouping Notice: </span>
            This country is missing {country.missing_feature_count} of the 7 core malnutrition features and was excluded from cluster grouping to preserve model rigor. Available indicators are reported below with their respective survey years.
          </div>
        </div>
      )}

      {/* Benchmark Table Card */}
      <BentoCard
        title="Malnutrition Indicator Profile"
        subtitle="Country values benchmarked against provisional group averages and dataset medians"
        action={
          <div className="text-right text-[11px] text-brand-muted">
            <span className="text-brand-accent font-medium">• High flag:</span> Value &gt; 75th percentile (relative to dataset)
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Indicator</th>
                <th className="py-3 px-3 text-center">Data Year</th>
                <th className="py-3 px-3 text-right">Country Value</th>
                <th className="py-3 px-3 text-right">Group Mean</th>
                <th className="py-3 px-3 text-right">All-Country Median</th>
                <th className="py-3 px-3 text-right">75th Percentile</th>
                <th className="py-3 px-3 text-center">Relative Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {FEATURE_ORDER.map(({ key, label }) => {
                const val = country.indicators[key];
                const isImp = country.is_imputed[key];
                const yr = country.data_years[key];
                const grpMean = country.group_means ? country.group_means[key] : null;
                const median = country.dataset_medians[key];
                const p75 = country.thresholds_75th_percentile[key];
                const isHigh = country.relative_flags[key];

                return (
                  <tr key={key} className="hover:bg-brand-raised/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-brand-text">
                      <div className="flex items-center gap-1.5">
                        <span>{label}</span>
                        {isImp && (
                          <span
                            title="Imputed using KNN (k=5) due to single missing value"
                            className="px-1.5 py-0.2 text-[9px] font-mono bg-brand-raised text-brand-muted border border-brand-border rounded cursor-help"
                          >
                            Imputed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center num-tabular text-brand-muted">
                      {yr ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-60" />
                          {yr}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-brand-text num-tabular text-sm">
                      {val !== null ? `${val}%` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right num-tabular text-brand-muted">
                      {grpMean !== null ? `${grpMean}%` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right num-tabular text-brand-muted">
                      {median !== undefined ? `${median}%` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right num-tabular text-brand-muted">
                      {p75 !== undefined ? `${p75}%` : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isHigh ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                          High (&gt; P75)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-brand-raised text-brand-muted border border-brand-border">
                          Normal / Lower
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-brand-border/60 text-[11px] text-brand-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            * Imputed indicators reflect KNN (k=5) estimation to allow multivariate clustering; raw values are unobserved.
          </div>
          <div>
            Relative status evaluated strictly relative to other countries in this dataset.
          </div>
        </div>
      </BentoCard>

      {/* Quick Navigation to Similar Countries */}
      {country.status === "analyzed" && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-brand-text">
              Looking for peer comparisons?
            </h4>
            <p className="text-xs text-brand-muted mt-0.5">
              Explore the 5 most statistically similar countries to {country.country_name} with time series trend lines.
            </p>
          </div>
          <button
            onClick={() => navigate(`/similar?country=${country.iso3}`)}
            className="px-4 py-2 bg-brand-raised hover:bg-brand-border text-brand-text border border-brand-border rounded-xl text-xs font-medium transition-colors"
          >
            View Similar Countries →
          </button>
        </div>
      )}
    </div>
  );
};
