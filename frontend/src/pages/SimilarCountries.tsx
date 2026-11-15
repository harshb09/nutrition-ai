import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { ChevronDown } from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { StatusNotice } from "../components/StatusNotice";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { api } from "../api/client";
import { CountrySummary, PeerCountry, CountryTrends } from "../api/types";

const PEER_COLORS = ["#38BDF8", "#F472B6", "#A78BFA", "#34D399", "#FB923C"];

export const SimilarCountries: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialIso = (searchParams.get("country") || "IND").toUpperCase();

  const [allCountries, setAllCountries] = useState<CountrySummary[]>([]);
  const [selectedIso, setSelectedIso] = useState<string>(initialIso);
  const [targetCountry, setTargetCountry] = useState<CountrySummary | null>(null);
  const [peers, setPeers] = useState<PeerCountry[]>([]);
  const [trends, setTrends] = useState<CountryTrends | null>(null);

  const [loading, setLoading] = useState(true);
  const [coldStartSeconds, setColdStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCountries({ status: "analyzed" }).then(setAllCountries).catch(() => {});
  }, []);

  useEffect(() => {
    const qIso = searchParams.get("country");
    if (qIso) {
      setSelectedIso(qIso.toUpperCase());
    }
  }, [searchParams]);

  const loadPeerData = (iso: string) => {
    setLoading(true);
    setError(null);
    setColdStartSeconds(null);

    Promise.all([
      api.getCountry(iso, setColdStartSeconds),
      api.getCountryPeers(iso, setColdStartSeconds),
      api.getCountryTrends(iso, setColdStartSeconds)
    ])
      .then(([countryRes, peerRes, trendRes]) => {
        setTargetCountry(countryRes);
        setPeers(peerRes);
        setTrends(trendRes);
        setColdStartSeconds(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load peer data for ${iso}.`);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedIso) {
      loadPeerData(selectedIso);
    }
  }, [selectedIso]);

  const handleCountryChange = (iso: string) => {
    setSelectedIso(iso);
    navigate(`/similar?country=${iso}`);
  };

  if (loading || coldStartSeconds !== null || error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <StatusNotice
          loading={loading && coldStartSeconds === null}
          coldStartSeconds={coldStartSeconds}
          error={error}
          onRetry={() => loadPeerData(selectedIso)}
        />
      </div>
    );
  }

  if (!targetCountry || !trends) return null;

  // Build combined 2000-2024 dataset for Recharts
  const chartData = trends.series.map((pt) => {
    const row: Record<string, any> = {
      year: pt.year,
      target_stunting: pt.stunting,
      target_overweight: pt.child_overweight
    };

    // Add peers
    peers.forEach((p, idx) => {
      const peerTrend = trends.peers[p.iso3]?.series?.find((s) => s.year === pt.year);
      row[`peer_${idx}_stunting`] = peerTrend?.stunting ?? null;
      row[`peer_${idx}_overweight`] = peerTrend?.child_overweight ?? null;
    });

    // Add group average
    const grpPt = trends.group_average.find((g) => g.year === pt.year);
    row["group_stunting"] = grpPt?.stunting ?? null;
    row["group_overweight"] = grpPt?.child_overweight ?? null;

    return row;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <DisclaimerBanner />

      {/* Selector & Title Header */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/30 font-semibold">
              {targetCountry.iso3}
            </span>
            <span className="text-xs text-brand-muted">{targetCountry.region}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-brand-text">
            Similar Countries &amp; Peer Comparison: {targetCountry.country_name}
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            5 nearest countries calculated by standardized Euclidean distance across the 7 malnutrition features.
          </p>
        </div>

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
      </div>

      {/* Comparison Table */}
      <BentoCard
        title="Multidimensional Peer Comparison"
        subtitle="Distance and indicator values for the 5 closest statistical neighbours"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3 text-center">Distance</th>
                <th className="py-2.5 px-3 text-right">Stunting</th>
                <th className="py-2.5 px-3 text-right">Child Overweight</th>
                <th className="py-2.5 px-3 text-right">Wasting</th>
                <th className="py-2.5 px-3 text-right">Adult Obesity</th>
                <th className="py-2.5 px-3 text-right">Adult Diabetes</th>
                <th className="py-2.5 px-3 text-right">Maternal Anaemia</th>
                <th className="py-2.5 px-3 text-right">Low Birth Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {/* Target Country Row */}
              <tr className="bg-brand-accent/5 font-semibold">
                <td className="py-3 px-3 text-brand-accent">
                  {targetCountry.country_name} ({targetCountry.iso3}) <span className="text-[10px] font-normal text-brand-muted">(Target)</span>
                </td>
                <td className="py-3 px-3 text-center font-mono text-brand-muted">0.00</td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.stunting}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.child_overweight}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.wasting}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.adult_obesity}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.adult_diabetes}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.anaemia_women}%
                </td>
                <td className="py-3 px-3 text-right num-tabular text-brand-text">
                  {targetCountry.indicators.low_birth_weight}%
                </td>
              </tr>

              {/* Peer Rows */}
              {peers.map((peer, pIdx) => {
                const diff = peer.differences;
                return (
                  <tr key={peer.iso3} className="hover:bg-brand-raised/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PEER_COLORS[pIdx % PEER_COLORS.length] }}
                        />
                        <button
                          onClick={() => handleCountryChange(peer.iso3)}
                          className="font-medium text-brand-text hover:text-brand-accent hover:underline text-left"
                        >
                          {peer.country_name} ({peer.iso3})
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-brand-muted num-tabular">
                      {peer.distance.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.stunting}%</span>
                      {diff.stunting !== null && (
                        <span className={`text-[10px] ml-1.5 ${diff.stunting > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          ({diff.stunting > 0 ? `+${diff.stunting}` : diff.stunting})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.child_overweight}%</span>
                      {diff.child_overweight !== null && (
                        <span className={`text-[10px] ml-1.5 ${diff.child_overweight > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          ({diff.child_overweight > 0 ? `+${diff.child_overweight}` : diff.child_overweight})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.wasting}%</span>
                      {diff.wasting !== null && (
                        <span className={`text-[10px] ml-1.5 ${diff.wasting > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          ({diff.wasting > 0 ? `+${diff.wasting}` : diff.wasting})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.adult_obesity}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.adult_diabetes}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.anaemia_women}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right num-tabular">
                      <span className="text-brand-text font-medium">{peer.values.low_birth_weight}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {/* Trend Lines 2000-2024 (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stunting Trends */}
        <BentoCard
          title="Child Stunting Trajectory (2000–2024)"
          subtitle={`Prevalence (%) among children under 5: ${targetCountry.country_name} vs 5 nearest peers`}
        >
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#243042" strokeDasharray="3 3" opacity={0.6} />
                <XAxis dataKey="year" stroke="#8B98A9" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8B98A9"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: "Stunting (%)", angle: -90, position: "insideLeft", fill: "#8B98A9", fontSize: 11 }}
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
                
                {/* Target country bold teal */}
                <Line
                  type="monotone"
                  dataKey="target_stunting"
                  name={`${targetCountry.country_name} (Target)`}
                  stroke="#2DD4BF"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#2DD4BF" }}
                  connectNulls
                />

                {/* Peer lines */}
                {peers.map((p, idx) => (
                  <Line
                    key={p.iso3}
                    type="monotone"
                    dataKey={`peer_${idx}_stunting`}
                    name={p.country_name}
                    stroke={PEER_COLORS[idx % PEER_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                ))}

                {/* Group average dashed */}
                <Line
                  type="monotone"
                  dataKey="group_stunting"
                  name="Group Average"
                  stroke="#8B98A9"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Child Overweight Trends */}
        <BentoCard
          title="Child Overweight Trajectory (2000–2024)"
          subtitle={`Prevalence (%) among children under 5: ${targetCountry.country_name} vs 5 nearest peers`}
        >
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#243042" strokeDasharray="3 3" opacity={0.6} />
                <XAxis dataKey="year" stroke="#8B98A9" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8B98A9"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: "Overweight (%)", angle: -90, position: "insideLeft", fill: "#8B98A9", fontSize: 11 }}
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

                {/* Target country bold amber */}
                <Line
                  type="monotone"
                  dataKey="target_overweight"
                  name={`${targetCountry.country_name} (Target)`}
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#F59E0B" }}
                  connectNulls
                />

                {/* Peer lines */}
                {peers.map((p, idx) => (
                  <Line
                    key={p.iso3}
                    type="monotone"
                    dataKey={`peer_${idx}_overweight`}
                    name={p.country_name}
                    stroke={PEER_COLORS[idx % PEER_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                ))}

                {/* Group average dashed */}
                <Line
                  type="monotone"
                  dataKey="group_overweight"
                  name="Group Average"
                  stroke="#8B98A9"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>
      </div>
    </div>
  );
};
