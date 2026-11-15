import React, { useState, useEffect } from "react";
import { Download, Database } from "lucide-react";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { DatasetMetadata } from "../api/types";

export const DataSources: React.FC = () => {
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    api.getMetadata(setColdStartSeconds)
      .then((res) => {
        setMetadata(res);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load metadata.");
        setLoading(false);
      });
  }, []);

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const csvUrl = api.getDatasetCsvUrl();

  const citations = [
    {
      source: "UNICEF / WHO / World Bank Group Joint Child Malnutrition Estimates (JME)",
      edition: "March 2026 Edition",
      description: "National modelled estimates and survey point estimates for child stunting and overweight (children under 5 years) for the complete 2000–2024 time series.",
      indicators: ["Child Stunting (% under 5)", "Child Overweight (% under 5)"],
      citation: "United Nations Children's Fund (UNICEF), World Health Organization, International Bank for Reconstruction and Development/The World Bank. Levels and trends in child malnutrition: Key findings of the 2026 Edition of the Joint Child Malnutrition Estimates. Geneva: World Health Organization; 2026."
    },
    {
      source: "Global Nutrition Report (GNR) Country Nutrition Profiles",
      edition: "February 2023 Release",
      description: "Country-level disaggregated estimates for child wasting, adult obesity, adult diabetes, anaemia in women of reproductive age, and infant exclusive breastfeeding.",
      indicators: ["Child Wasting (% under 5)", "Adult Obesity (%)", "Adult Diabetes (%)", "Anaemia in Women 15-49 (%)", "Exclusive Breastfeeding (%)"],
      citation: "Development Initiatives, 2023. Country Nutrition Profiles. Global Nutrition Report. Bristol, UK: Development Initiatives."
    },
    {
      source: "UNICEF-WHO Low Birthweight Estimates",
      edition: "2023 Edition",
      description: "Country, regional, and global estimates of low birthweight prevalence for the year 2020. Establishes the 202-country statistical universe and World Bank regional/income strata.",
      indicators: ["Low Birth Weight (% of live births)"],
      citation: "United Nations Children's Fund (UNICEF), World Health Organization (WHO). UNICEF-WHO Low birthweight estimates: Levels and trends 2000–2020. Geneva: World Health Organization; 2023."
    },
    {
      source: "World Bank World Development Indicators (WDI)",
      edition: "SDMX Series SH.ANM.CHLD.ZS",
      description: "Prevalence of anaemia among children under 5 (% of children under 5). Retained as contextual reference; highly correlated (r ~ 0.90) with anaemia in women.",
      indicators: ["Prevalence of anaemia in children under 5 (%)"],
      citation: "World Bank. 2024. World Development Indicators: Prevalence of anemia among children (% of children ages 6-59 months) [Data file SH.ANM.CHLD.ZS]. Washington, D.C.: The World Bank Group."
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Header and CSV Download Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-brand-accent text-xs font-semibold uppercase tracking-wider">
            <Database className="w-4 h-4" />
            Open Health Data
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
            Data Sources &amp; Citations
          </h1>
          <p className="text-xs text-brand-muted mt-2 max-w-2xl leading-relaxed">
            All indicators are extracted from verified international databases without hardcoded values or synthetic numbers. Download the cleaned, consolidated dataset below.
          </p>
        </div>

        <div>
          <a
            href={csvUrl}
            download="nutrition_atlas_dataset.csv"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-brand-bg font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <Download className="w-4 h-4" />
            Download Cleaned Dataset (CSV)
          </a>
        </div>
      </div>

      {/* Dataset Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <span className="text-[11px] text-brand-muted block mb-1">Defined Country Universe</span>
          <span className="text-2xl font-bold text-brand-text num-tabular">
            {metadata?.counts.country_universe} countries / areas
          </span>
          <span className="text-[10px] text-brand-muted block mt-1">
            Source: UNICEF-WHO Low Birthweight Universe
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <span className="text-[11px] text-brand-muted block mb-1">Multivariate Analysed Subset</span>
          <span className="text-2xl font-bold text-brand-accent num-tabular">
            {metadata?.counts.analyzed_countries} countries
          </span>
          <span className="text-[10px] text-brand-muted block mt-1">
            Missing ≤ 1 of 7 clustering features
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <span className="text-[11px] text-brand-muted block mb-1">Insufficient Data (Excluded)</span>
          <span className="text-2xl font-bold text-amber-400 num-tabular">
            {metadata?.counts.insufficient_data_countries} countries
          </span>
          <span className="text-[10px] text-brand-muted block mt-1">
            Retained in directory with available indicators
          </span>
        </div>
      </div>

      {/* Formal Citations List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
          Primary Data Sources &amp; Formal Citations
        </h2>

        {citations.map((c, idx) => (
          <div
            key={idx}
            className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-brand-text">{c.source}</h3>
              <span className="font-mono text-xs text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/30 self-start sm:self-auto">
                {c.edition}
              </span>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">{c.description}</p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {c.indicators.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 bg-brand-raised border border-brand-border rounded text-[10px] text-brand-text"
                >
                  {ind}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-brand-border/60 bg-brand-raised/40 p-3 rounded-xl">
              <span className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider block mb-1">
                Academic &amp; Institutional Citation:
              </span>
              <p className="text-xs font-mono text-brand-text leading-relaxed select-all">
                {c.citation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
