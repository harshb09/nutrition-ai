import React, { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { api } from "../api/client";
import { UploadResponse } from "../api/types";

export const UploadData: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [areaCol, setAreaCol] = useState<string>("");
  const [stateCol, setStateCol] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (areaCol.trim()) formData.append("area_col", areaCol.trim());
    if (stateCol.trim()) formData.append("state_col", stateCol.trim());

    try {
      const resp = await api.analyseUploadedData(formData);
      setResult(resp);
    } catch (err: any) {
      setError(err.message || "Failed to process uploaded file.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleFile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/data/test_upload_sample.csv");
      const text = await res.text();
      const sampleBlob = new Blob([text], { type: "text/csv" });
      const testFile = new File([sampleBlob], "test_upload_sample.csv", { type: "text/csv" });
      setFile(testFile);
      const formData = new FormData();
      formData.append("file", testFile);
      const resp = await api.analyseUploadedData(formData);
      setResult(resp);
    } catch (err: any) {
      setError(err.message || "Failed to load and analyse sample data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportResultCsv = () => {
    if (!result || result.records.length === 0) return;

    const first = result.records[0];
    const indicatorKeys = Object.keys(first.values || {});
    const headerCols = ["Area_Name", "State", "Pattern_Group", ...indicatorKeys];

    const rows = result.records.map((r) => {
      const rowVals = [
        `"${r.area_name}"`,
        `"${r.state}"`,
        `"${r.group_name}"`,
        ...indicatorKeys.map((k) => r.values[k] ?? "")
      ];
      return rowVals.join(",");
    });

    const csvContent = [headerCols.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nutrition_patterns_analysis_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-brand-border pb-5">
        <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block mb-1">
          Local Survey & Field Data Engine
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
          Upload Your Area Data
        </h1>
        <p className="text-xs text-brand-muted mt-1 max-w-2xl leading-relaxed">
          Evaluate your organisation's field surveys or block-level nutrition estimates.
          Identifies distinct nutrition patterns dynamically in-memory without storing any files or individual records.
        </p>
      </div>

      {/* Guidelines & Safety Banner */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-brand-text">
            Privacy Guard & Formatting Requirements
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-brand-muted leading-relaxed">
          <div className="space-y-1">
            <span className="font-semibold text-brand-text block">
              1. Area-Level Aggregates Only
            </span>
            <p>
              Upload aggregated rates for districts, blocks, subdivisions, or clusters (e.g. stunting %, anaemia %).
              Do not upload individual patient records, personal names, phone numbers, or Aadhaar numbers.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-brand-text block">
              2. Ephemeral Processing
            </span>
            <p>
              Your data is processed strictly in-memory during analysis. No files are persisted to disk or external servers.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Form Card */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-text">
              Upload Area Spreadsheet (CSV or Excel)
            </h3>
            <span className="text-[11px] text-brand-muted">
              Accepts .csv, .xlsx, .xls up to 5 MB (Minimum 10 areas)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/data/test_upload_sample.csv"
              download="test_nutrition_data.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 transition-colors shadow-sm shrink-0"
              title="Download pre-filled 15-area dataset ready for immediate upload"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Test CSV (15 Areas)</span>
            </a>

            <button
              type="button"
              onClick={handleLoadSampleFile}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold text-sky-800 transition-colors shadow-sm shrink-0 disabled:opacity-40"
              title="Instantly test without downloading"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>1-Click Test Sample</span>
            </button>

            <a
              href={api.getUploadTemplateUrl()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-text hover:text-brand-accent transition-colors shadow-sm shrink-0"
              title="Download empty CSV template"
            >
              <Download className="w-3.5 h-3.5 text-brand-muted" />
              <span>Blank Template</span>
            </a>
          </div>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* File Dropzone */}
          <div className="border-2 border-dashed border-brand-border hover:border-brand-accent/60 rounded-2xl p-8 text-center transition-colors bg-brand-raised/20 relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-xs">
                {file ? (
                  <span className="font-bold text-brand-accent text-sm block">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-brand-text block">
                      Click to choose or drag & drop your table
                    </span>
                    <span className="text-brand-muted text-[11px]">
                      CSV or Excel spreadsheet containing nutrition indicator columns
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Optional Column Names Mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-brand-muted mb-1 font-medium">
                Area / Block Name Column (Optional)
              </label>
              <input
                type="text"
                value={areaCol}
                onChange={(e) => setAreaCol(e.target.value)}
                placeholder="e.g. area_name, district, block"
                className="w-full bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div>
              <label className="block text-brand-muted mb-1 font-medium">
                State / Region Column (Optional)
              </label>
              <input
                type="text"
                value={stateCol}
                onChange={(e) => setStateCol(e.target.value)}
                placeholder="e.g. state, province"
                className="w-full bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-500">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating nutrition patterns...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Analyse Nutrition Patterns</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Analysis Results View */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quality Summary & Confidence Card */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">
                  Analysis Complete
                </span>
                <h3 className="text-lg font-bold text-brand-text">
                  Discovered {result.summary.groups_discovered} Distinct Nutrition Patterns
                </h3>
              </div>

              {/* Confidence Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 bg-brand-raised border border-brand-border rounded-full font-bold text-brand-text">
                  Rating: {result.summary.confidence}
                </span>
                <button
                  onClick={handleExportResultCsv}
                  className="px-3 py-1.5 bg-brand-accent text-white rounded-xl text-xs font-semibold hover:bg-brand-accent/90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Results CSV</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              {result.summary.confidence_explanation}
            </p>

            {/* Metric counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-brand-raised rounded-xl">
                <span className="text-[10px] text-brand-muted uppercase block">Valid Areas</span>
                <span className="text-xl font-bold text-brand-text font-mono">
                  {result.summary.valid_observations}
                </span>
              </div>
              <div className="p-3 bg-brand-raised rounded-xl">
                <span className="text-[10px] text-brand-muted uppercase block">Excluded Rows</span>
                <span className="text-xl font-bold text-brand-muted font-mono">
                  {result.summary.excluded_rows}
                </span>
              </div>
              <div className="p-3 bg-brand-raised rounded-xl">
                <span className="text-[10px] text-brand-muted uppercase block">Features Used</span>
                <span className="text-xl font-bold text-brand-text font-mono">
                  {result.summary.feature_columns_used.length}
                </span>
              </div>
              <div className="p-3 bg-brand-raised rounded-xl">
                <span className="text-[10px] text-brand-muted uppercase block">Boundary Matches</span>
                <span className="text-xl font-bold text-brand-accent font-mono">
                  {result.summary.boundary_match_rate}%
                </span>
              </div>
            </div>

            {/* Warnings list */}
            {result.warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs text-amber-500">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groups Descriptors */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-brand-text">
              Discovered Pattern Groups
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.groups.map((g) => (
                <div
                  key={g.group_id}
                  className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-text">
                      {g.group_name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-brand-raised font-mono text-brand-muted">
                      {g.count} areas ({g.share_percent}%)
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    {g.descriptor}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
              Area Assignments ({result.records.length})
            </h3>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-brand-raised border-b border-brand-border text-brand-muted">
                  <tr>
                    <th className="py-2.5 px-3">Area Name</th>
                    <th className="py-2.5 px-3">State / Region</th>
                    <th className="py-2.5 px-3">Assigned Pattern</th>
                    {result.summary.feature_columns_used.map((col) => (
                      <th key={col} className="py-2.5 px-3 capitalize">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {result.records.map((r, i) => (
                    <tr key={i} className="hover:bg-brand-raised/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-brand-text">
                        {r.area_name}
                      </td>
                      <td className="py-2.5 px-3 text-brand-muted">{r.state || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-brand-raised rounded text-[11px] font-semibold text-brand-text">
                          {r.group_name}
                        </span>
                      </td>
                      {result.summary.feature_columns_used.map((col) => (
                        <td key={col} className="py-2.5 px-3 font-mono">
                          {r.values[col] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
