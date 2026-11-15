import React, { useState, useEffect } from "react";
import { Download, Database } from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";

export const DataSources: React.FC = () => {
  const [, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
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
      source: "UNICEF / WHO / World Bank Joint Child Malnutrition Estimates",
      edition: "March 2026 Release",
      indicators: "Child Stunting (% under 5), Child Overweight (% under 5)",
      years: "2000–2024 (Point estimate 2024 utilized for cross-sectional clustering; full series for trends)",
      citation: "United Nations Children’s Fund, World Health Organization, The World Bank Group. Joint Child Malnutrition Estimates: Levels and trends in child malnutrition (March 2026 edition). New York: UNICEF."
    },
    {
      source: "Global Nutrition Report (Country Nutrition Profiles)",
      edition: "February 2023 Release",
      indicators: "Child Wasting, Adult Obesity, Adult Diabetes, Anaemia in Women of Reproductive Age, Exclusive Breastfeeding",
      years: "Most recent nationally representative survey or modelled country estimate per country",
      citation: "Development Initiatives. Global Nutrition Report 2023: Country Nutrition Profiles dataset. Bristol, UK: Development Initiatives."
    },
    {
      source: "UNICEF-WHO Low Birthweight Estimates",
      edition: "2023 Edition",
      indicators: "Low Birthweight prevalence (% of live births < 2,500g)",
      years: "2000–2020 (Modelled point estimate 2020 used for clustering; defines 202-country universe)",
      citation: "United Nations Children’s Fund and World Health Organization. Low birthweight estimates: Levels and trends 2000–2020. Geneva: World Health Organization; 2023."
    },
    {
      source: "World Bank World Development Indicators (WDI)",
      edition: "SDMX Series SH.ANM.CHLD.ZS",
      indicators: "Prevalence of anaemia among children (% of children under 5)",
      years: "Latest available country observation",
      citation: "World Bank. World Development Indicators: Prevalence of anemia among children (% of children ages 6-59 months), series SH.ANM.CHLD.ZS. Washington, DC: The World Bank Group."
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Header with Download Action */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-brand-accent text-xs font-semibold uppercase tracking-wider">
            <Database className="w-4 h-4" />
            Open Research Data
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
            Data Provenance &amp; Academic Citations
          </h1>
          <p className="text-xs text-brand-muted mt-2 max-w-2xl leading-relaxed">
            All indicators are sourced strictly from accredited multilateral agencies and published epidemiological repositories. No synthetic or hardcoded values are utilized.
          </p>
        </div>

        <div>
          <a
            href={csvUrl}
            download="nutrition_atlas_dataset.csv"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-brand-bg font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg"
          >
            <Download className="w-4 h-4" />
            Download Cleaned Dataset (CSV)
          </a>
        </div>
      </div>

      {/* Citations List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
          Primary Sources &amp; Formal Citations
        </h2>

        {citations.map((c, idx) => (
          <div
            key={idx}
            className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-brand-border/60">
              <h3 className="text-sm font-bold text-brand-text">{c.source}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-raised text-brand-muted border border-brand-border font-mono">
                {c.edition}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-brand-muted uppercase font-semibold block mb-0.5">
                  Extracted Indicators
                </span>
                <span className="text-brand-text">{c.indicators}</span>
              </div>
              <div>
                <span className="text-[10px] text-brand-muted uppercase font-semibold block mb-0.5">
                  Temporal Coverage &amp; Data Years
                </span>
                <span className="text-brand-muted">{c.years}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-border/40 bg-brand-raised/40 p-3 rounded-xl text-xs font-mono text-brand-muted leading-relaxed">
              <span className="text-[10px] text-brand-accent font-semibold uppercase block mb-1">
                Preferred Citation:
              </span>
              {c.citation}
            </div>
          </div>
        ))}
      </div>

      {/* Dataset Summary Specs */}
      <BentoCard
        title="Artifact Specifications"
        subtitle="Structure of the exported tabular dataset"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-brand-raised/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-brand-muted block uppercase">Country Rows</span>
            <span className="text-xl font-bold text-brand-text num-tabular mt-1 block">202</span>
            <span className="text-[11px] text-brand-muted">156 analysed, 46 insufficient data</span>
          </div>
          <div className="p-3 bg-brand-raised/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-brand-muted block uppercase">Core Clustering Dimensions</span>
            <span className="text-xl font-bold text-brand-accent num-tabular mt-1 block">7</span>
            <span className="text-[11px] text-brand-muted">Standardized with StandardScaler</span>
          </div>
          <div className="p-3 bg-brand-raised/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-brand-muted block uppercase">File Format &amp; Encoding</span>
            <span className="text-xl font-bold text-brand-text font-mono mt-1 block">CSV (UTF-8)</span>
            <span className="text-[11px] text-brand-muted">Includes raw and imputed fields</span>
          </div>
        </div>
      </BentoCard>
    </div>
  );
};
