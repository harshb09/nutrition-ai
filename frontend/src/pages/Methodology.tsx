import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { MethodologyData } from "../api/types";

export const Methodology: React.FC = () => {
  const [data, setData] = useState<MethodologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"validation" | "pca" | "dendrogram" | "preprocessing" | "stability" | "ethics">("validation");

  const loadMethodology = () => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    api.getMethodology(setColdStartSeconds)
      .then((res) => {
        setData(res);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load methodology data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMethodology();
  }, []);

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={loadMethodology}
        />
      </div>
    );
  }

  if (!data) return null;

  const prep = data.preprocessing_log;
  const sel = data.selection;
  const evals = data.model_evaluations;
  const pca = data.pca_analysis;
  const hier = data.hierarchical_analysis;
  const stab = data.stability_audit;
  const sens = data.sensitivity_analyses;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Header */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5 text-brand-accent text-xs font-semibold uppercase tracking-wider">
          <FlaskConical className="w-4 h-4" />
          Technical Documentation &amp; Validation Audit
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">
          Methodology &amp; Clustering Validation
        </h1>
        <p className="text-xs text-brand-muted mt-2 max-w-3xl leading-relaxed">
          Comprehensive diagnostic logs, empirical validation metrics (K=2..8), PCA projections, hierarchical linkage, bootstrap stability audits, and responsible use guidelines.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-brand-border/60">
          {[
            { id: "validation", label: "Model Selection & Metrics" },
            { id: "pca", label: "PCA Projection" },
            { id: "dendrogram", label: "Hierarchical Dendrogram" },
            { id: "preprocessing", label: "Preprocessing & Correlations" },
            { id: "stability", label: "Stability & Sensitivity" },
            { id: "ethics", label: "Limitations & Responsible Use" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-raised text-brand-accent border border-brand-accent/40 shadow-sm"
                  : "text-brand-muted hover:text-brand-text hover:bg-brand-raised/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Model Selection & Metrics Table */}
      {activeTab === "validation" && (
        <div className="space-y-6">
          {/* Coded Selection Rule Card */}
          <BentoCard
            title="Automated Selection Rule Execution"
            subtitle="Coded decision logic executed across candidate parameter grid"
          >
            <div className="bg-brand-raised/60 border border-brand-border/80 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-brand-text">Coded Rule: </span>
                  <span className="text-brand-muted">{sel.rule_specification}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-brand-border/40 text-brand-muted">
                <span className="font-semibold text-brand-text block mb-1">Empirical Rationale:</span>
                {sel.rationale}
              </div>
            </div>
          </BentoCard>

          {/* Validation Metrics Table K=2..8 */}
          <BentoCard
            title="Validation Metrics Grid (K=2 to 8)"
            subtitle="Within-Cluster Distance (WCSS), Silhouette, Davies-Bouldin, Seed ARI (30 runs), and Bootstrap ARI (100 runs)"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">K</th>
                    <th className="py-2.5 px-3">Algorithm</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3 text-right">WCSS</th>
                    <th className="py-2.5 px-3 text-right">Silhouette</th>
                    <th className="py-2.5 px-3 text-right">Davies-Bouldin</th>
                    <th className="py-2.5 px-3 text-right">Seed ARI (Mean ± SD)</th>
                    <th className="py-2.5 px-3 text-right">Bootstrap ARI (Mean ± SD)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {evals.map((row) => {
                    const isSelected =
                      row.k === sel.selected_configuration.k &&
                      row.method === sel.selected_configuration.method;

                    return (
                      <tr
                        key={`${row.method}_${row.k}`}
                        className={`hover:bg-brand-raised/40 transition-colors ${
                          isSelected ? "bg-brand-accent/10 font-medium" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-brand-text">
                          {row.k}
                        </td>
                        <td className="py-2.5 px-3 text-brand-text">{row.method}</td>
                        <td className="py-2.5 px-3 text-brand-muted">{row.distance_metric}</td>
                        <td className="py-2.5 px-3 text-right num-tabular text-brand-muted">
                          {row.wcss.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right num-tabular font-semibold text-brand-text">
                          {row.silhouette.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right num-tabular text-brand-muted">
                          {row.davies_bouldin.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right num-tabular text-brand-muted text-[11px]">
                          {row.seed_ari_mean.toFixed(3)} ± {row.seed_ari_std.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-right num-tabular font-mono text-[11px]">
                          <span
                            className={
                              row.bootstrap_ari_mean >= 0.60
                                ? "text-emerald-400 font-semibold"
                                : "text-amber-400"
                            }
                          >
                            {row.bootstrap_ari_mean.toFixed(3)}
                          </span>{" "}
                          <span className="text-brand-muted">± {row.bootstrap_ari_std.toFixed(3)}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-accent text-brand-bg">
                              SELECTED
                            </span>
                          ) : (
                            <span className="text-brand-muted text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-brand-muted">
              * Silhouette score is evaluated in the matching metric (Euclidean for K-Means, Manhattan for K-Medians). Unit-tested against scikit-learn standard implementations.
            </p>
          </BentoCard>
        </div>
      )}

      {/* Tab 2: PCA Projection & Loadings */}
      {activeTab === "pca" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PCA 2D Scatter Chart */}
            <div className="lg:col-span-2">
              <BentoCard
                title="Principal Component Analysis (2D Projection)"
                subtitle={`PC1 (${Math.round(pca.explained_variance_ratio[0] * 100)}% var) vs PC2 (${Math.round(pca.explained_variance_ratio[1] * 100)}% var). Total explained variance: ${Math.round(pca.cumulative_variance * 100)}%`}
              >
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid stroke="#243042" strokeDasharray="3 3" opacity={0.6} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="PC1"
                        stroke="#8B98A9"
                        fontSize={11}
                        label={{ value: "Principal Component 1", position: "bottom", fill: "#8B98A9", fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="PC2"
                        stroke="#8B98A9"
                        fontSize={11}
                        label={{ value: "Principal Component 2", angle: -90, position: "left", fill: "#8B98A9", fontSize: 11 }}
                      />
                      <ZAxis range={[50, 50]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-brand-surface border border-brand-border rounded-xl p-2.5 text-xs shadow-lg">
                                <div className="font-semibold text-brand-accent">{p.iso3}</div>
                                <div className="text-brand-muted text-[11px] mt-0.5">
                                  PC1: {p.x.toFixed(2)} | PC2: {p.y.toFixed(2)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter
                        data={pca.coordinates}
                        fill="#2DD4BF"
                        opacity={0.8}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </BentoCard>
            </div>

            {/* Feature Loadings Table */}
            <BentoCard
              title="Feature Loadings"
              subtitle="Eigenvector weights on PC1 and PC2"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px]">
                      <th className="py-2 px-2">Feature</th>
                      <th className="py-2 px-2 text-right">PC1 Loading</th>
                      <th className="py-2 px-2 text-right">PC2 Loading</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40">
                    {pca.loadings.map((ld) => (
                      <tr key={ld.feature}>
                        <td className="py-2 px-2 font-medium text-brand-text truncate max-w-[120px]">
                          {ld.feature}
                        </td>
                        <td className={`py-2 px-2 text-right num-tabular font-mono ${ld.pc1 > 0 ? "text-sky-400" : "text-amber-400"}`}>
                          {ld.pc1 > 0 ? `+${ld.pc1.toFixed(3)}` : ld.pc1.toFixed(3)}
                        </td>
                        <td className={`py-2 px-2 text-right num-tabular font-mono ${ld.pc2 > 0 ? "text-purple-400" : "text-pink-400"}`}>
                          {ld.pc2 > 0 ? `+${ld.pc2.toFixed(3)}` : ld.pc2.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          </div>
        </div>
      )}

      {/* Tab 3: Hierarchical Dendrogram */}
      {activeTab === "dendrogram" && (
        <div className="space-y-6">
          <BentoCard
            title="Hierarchical Cluster Structure (Ward Linkage)"
            subtitle={`Cophenetic correlation: ${hier.ward.cophenetic_correlation} | ARI vs K-Means: ${hier.ward.ari_vs_chosen_kmeans}`}
          >
            <div className="bg-brand-raised/40 border border-brand-border/60 rounded-xl p-4 mb-4 text-xs text-brand-muted leading-relaxed">
              <span className="font-semibold text-brand-text">Hierarchical Cross-Validation: </span>
              Ward minimum-variance linkage produces a cophenetic correlation coefficient of {hier.ward.cophenetic_correlation}. Cutting the dendrogram at K=3 yields an Adjusted Rand Index (ARI) of {hier.ward.ari_vs_chosen_kmeans} with K-Means, demonstrating strong cross-algorithmic concordance. Average linkage achieves a cophenetic correlation of {hier.average.cophenetic_correlation}.
            </div>

            {/* SVG Dendrogram Tree Visualization */}
            <div className="w-full h-80 bg-brand-raised/30 border border-brand-border/40 rounded-xl p-4 overflow-x-auto">
              <svg viewBox="0 0 1000 300" className="w-full h-full min-w-[700px]">
                {hier.dendrogram.icoord.map((xCoords, idx) => {
                  const yCoords = hier.dendrogram.dcoord[idx];
                  // Normalize coordinates to SVG viewport
                  // x is ~ 0 to 1560 -> scale to 0..960
                  // y is 0 to ~35 -> scale to 280..20 (inverted)
                  const scaleX = (x: number) => (x / 1560) * 960 + 20;
                  const scaleY = (y: number) => 280 - (y / 35) * 260;

                  const p1 = `${scaleX(xCoords[0])},${scaleY(yCoords[0])}`;
                  const p2 = `${scaleX(xCoords[1])},${scaleY(yCoords[1])}`;
                  const p3 = `${scaleX(xCoords[2])},${scaleY(yCoords[2])}`;
                  const p4 = `${scaleX(xCoords[3])},${scaleY(yCoords[3])}`;

                  const strokeColor = hier.dendrogram.color_list[idx] || "#2DD4BF";

                  return (
                    <polyline
                      key={idx}
                      points={`${p1} ${p2} ${p3} ${p4}`}
                      fill="none"
                      stroke={strokeColor === "C0" ? "#38BDF8" : strokeColor === "C1" ? "#F59E0B" : strokeColor === "C2" ? "#A78BFA" : "#8B98A9"}
                      strokeWidth="1.2"
                      opacity="0.85"
                    />
                  );
                })}
              </svg>
            </div>
          </BentoCard>
        </div>
      )}

      {/* Tab 4: Preprocessing & Correlations */}
      {activeTab === "preprocessing" && (
        <div className="space-y-6">
          {/* Missingness Summary */}
          <BentoCard
            title="Feature Availability & Missingness Log"
            subtitle="Missing counts, survey year ranges, and 7-feature coverage across 202 countries"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px]">
                    <th className="py-2.5 px-3">Feature</th>
                    <th className="py-2.5 px-3 text-right">Valid Count</th>
                    <th className="py-2.5 px-3 text-right">Missing Count</th>
                    <th className="py-2.5 px-3 text-right">Missing %</th>
                    <th className="py-2.5 px-3 text-center">Year Range</th>
                    <th className="py-2.5 px-3 text-center">Median Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {prep.per_feature_missingness.map((row) => (
                    <tr key={row.feature} className="hover:bg-brand-raised/40">
                      <td className="py-2.5 px-3 font-medium text-brand-text">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-3 text-right num-tabular text-emerald-400 font-semibold">
                        {row.valid_count}
                      </td>
                      <td className="py-2.5 px-3 text-right num-tabular text-amber-400">
                        {row.missing_count}
                      </td>
                      <td className="py-2.5 px-3 text-right num-tabular text-brand-muted">
                        {row.missing_pct}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-brand-muted">
                        {row.year_min ? `${row.year_min}–${row.year_max}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-brand-text">
                        {row.year_median || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCard>

          {/* Child Anaemia Collinearity Justification */}
          <BentoCard
            title="Context Indicator & Collinearity Review"
            subtitle="Pearson correlation analysis justifying exclusion of child anaemia from clustering"
          >
            <div className="bg-brand-raised/50 border border-brand-border rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-text">
                  Child Anaemia vs Maternal Anaemia Correlation:
                </span>
                <span className="font-mono font-bold text-brand-accent text-sm">
                  r = {prep.child_anaemia_correlation_with_maternal_anaemia}
                </span>
              </div>
              <p className="text-brand-muted leading-relaxed">
                {prep.child_anaemia_exclusion_reason}
              </p>
            </div>
          </BentoCard>

          {/* Correlation Matrix Heatmap */}
          <BentoCard
            title="Feature Correlation Matrix"
            subtitle="Pairwise Pearson correlation coefficients among clustering indicators and child anaemia"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px]">
                    <th className="py-2 px-2 text-left">Indicator</th>
                    {Object.keys(prep.correlation_matrix).map((k) => (
                      <th key={k} className="py-2 px-2 font-mono text-[10px]">
                        {k.replace("adult_", "").replace("child_", "").slice(0, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {Object.entries(prep.correlation_matrix).map(([rowKey, cols]) => (
                    <tr key={rowKey}>
                      <td className="py-2 px-2 text-left font-medium text-brand-text text-[11px]">
                        {rowKey}
                      </td>
                      {Object.entries(cols).map(([colKey, val]) => {
                        const numVal = val as number | null;
                        const bgIntensity =
                          numVal === null
                            ? "bg-transparent text-brand-muted"
                            : numVal > 0.6
                            ? "bg-sky-500/20 text-sky-300 font-bold"
                            : numVal < -0.4
                            ? "bg-amber-500/20 text-amber-300 font-bold"
                            : "text-brand-muted";

                        return (
                          <td
                            key={colKey}
                            className={`py-2 px-1 font-mono text-[11px] num-tabular ${bgIntensity}`}
                          >
                            {numVal !== null ? (numVal > 0 ? `+${numVal.toFixed(2)}` : numVal.toFixed(2)) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>
      )}

      {/* Tab 5: Stability & Sensitivity */}
      {activeTab === "stability" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bootstrap Stability */}
            <BentoCard
              title="Bootstrap Stability Analysis (100 Subsamples)"
              subtitle="80% subsampling without replacement evaluating cluster membership stability"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-brand-raised/50 rounded-xl">
                  <span className="text-brand-muted">Mean Bootstrap ARI</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {stab.bootstrap_summary.mean_bootstrap_ari}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-brand-raised/50 rounded-xl">
                  <span className="text-brand-muted">Bootstrap ARI Standard Deviation</span>
                  <span className="font-mono text-brand-text">
                    ± {stab.bootstrap_summary.std_bootstrap_ari}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-brand-raised/50 rounded-xl">
                  <span className="text-brand-muted">ARI Range [Min, Max]</span>
                  <span className="font-mono text-brand-text">
                    [{stab.bootstrap_summary.min_bootstrap_ari}, {stab.bootstrap_summary.max_bootstrap_ari}]
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-brand-raised/50 rounded-xl">
                  <span className="text-brand-muted">Intra-Cluster Co-association Mean</span>
                  <span className="font-mono font-bold text-brand-accent">
                    {stab.co_association_summary.mean_intra_cluster_co_assoc}
                  </span>
                </div>
              </div>
            </BentoCard>

            {/* Complete-case Sensitivity */}
            <BentoCard
              title="Sensitivity Analysis: Complete Cases"
              subtitle={`Complete case run (N=${sens.complete_case_analysis.complete_cases_count}) vs KNN-imputed baseline`}
            >
              <div className="p-4 bg-brand-raised/50 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-brand-muted">Adjusted Rand Index (ARI):</span>
                  <span className="font-mono font-bold text-brand-accent text-sm">
                    {sens.complete_case_analysis.ari_vs_main_imputed_clustering}
                  </span>
                </div>
                <p className="text-brand-muted leading-relaxed">
                  {sens.complete_case_analysis.finding}
                </p>
                <div className="pt-2 border-t border-brand-border/60">
                  <span className="font-semibold text-brand-text block mb-1">
                    Exclusive Breastfeeding Sensitivity:
                  </span>
                  <p className="text-brand-muted">
                    Correlation with child stunting: <span className="font-mono text-brand-text">{sens.exclusive_breastfeeding.with_stunting}</span> | child wasting: <span className="font-mono text-brand-text">{sens.exclusive_breastfeeding.with_wasting}</span> (N={sens.exclusive_breastfeeding.sample_size} countries).
                  </p>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Post-hoc Association Tests */}
          <BentoCard
            title="Post-Hoc Association Tests (Bias Audit)"
            subtitle="Chi-square test verifying clusters do not merely replicate income level or geographical region"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {Object.entries(data.post_hoc_association_tests).map(([catVar, res]) => (
                <div key={catVar} className="bg-brand-raised/50 border border-brand-border rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-brand-text uppercase tracking-wider text-[11px]">
                    {catVar === "income_group" ? "World Bank Income Group" : "World Bank Region"}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-brand-muted block">Chi² Statistic</span>
                      <span className="font-mono font-semibold text-brand-text">{res.chi2_statistic}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-muted block">Cramér's V</span>
                      <span className="font-mono font-semibold text-brand-accent">{res.cramers_v}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-muted block">Degrees of Freedom</span>
                      <span className="font-mono text-brand-muted">{res.degrees_of_freedom}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      )}

      {/* Tab 6: Limitations & Responsible Use */}
      {activeTab === "ethics" && (
        <div className="space-y-6">
          <BentoCard
            title="Methodological Limitations"
            subtitle="Inherent constraints in international secondary health data synthesis"
          >
            <ul className="space-y-2.5 text-xs text-brand-muted leading-relaxed">
              {data.limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard
            title="Responsible Use Guidelines for Health Policy"
            subtitle="Normative guidance on interpreting mathematical clusters in public health planning"
          >
            <ul className="space-y-2.5 text-xs text-brand-muted leading-relaxed">
              {data.responsible_use.map((guideline, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                  <span>{guideline}</span>
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      )}
    </div>
  );
};
