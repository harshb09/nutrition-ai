import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { Download, AlertCircle, ArrowUpRight } from "lucide-react";
import { BentoCard } from "./BentoCard";
import { api } from "../api/client";
import { LearnPeerCountry } from "../api/types";
import { exportChartAsPng } from "../utils/exportChart";

interface LearnFromPeersProps {
  countryIso: string;
  countryName: string;
}

const PEER_PALETTE = ["#2DD4BF", "#38BDF8", "#F59E0B", "#A78BFA", "#F472B6", "#34D399"];

export const LearnFromPeers: React.FC<LearnFromPeersProps> = ({ countryIso, countryName }) => {
  const [peers, setPeers] = useState<LearnPeerCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLearnPeers(countryIso)
      .then((data) => {
        setPeers(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [countryIso]);

  if (loading || peers.length === 0) return null;

  // Build longitudinal chart data for peers
  const years = Array.from({ length: 25 }, (_, i) => 2000 + i);
  const chartData = years.map((y) => {
    const row: Record<string, any> = { year: y };
    peers.forEach((p, idx) => {
      const pt = p.series.find((s) => s.year === y);
      row[`peer_${idx}`] = pt?.stunting ?? null;
    });
    return row;
  });

  const chartElementId = `learn-peers-chart-${countryIso.toLowerCase()}`;

  return (
    <BentoCard
      title="Learn from Peers: Longitudinal Trajectories"
      subtitle={`The 5 most statistically similar countries to ${countryName}, ranked by stunting change since 2000.`}
      action={
        <button
          onClick={() => exportChartAsPng(chartElementId, `${countryIso}_peer_trajectories.png`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-raised hover:bg-brand-border border border-brand-border rounded-xl text-xs font-medium text-brand-text transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent"
        >
          <Download className="w-3.5 h-3.5" />
          Export Chart (PNG)
        </button>
      }
    >
      <div className="space-y-6">
        {/* Caveat Notice */}
        <div className="flex items-start gap-2.5 p-3 bg-brand-raised/60 border border-brand-border/80 rounded-xl text-xs text-brand-muted leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-brand-text">Observational Notice: </span>
            Historical change illustrates observed trajectory over time but does not explain why or establish causal policy drivers. Peer trajectories highlight countries facing comparable starting conditions to facilitate dialogue.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Peer Ranking Table */}
          <div className="lg:col-span-5 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted uppercase text-[10px]">
                  <th className="py-2 px-2">Peer Country</th>
                  <th className="py-2 px-2 text-right">2024 Stunting</th>
                  <th className="py-2 px-2 text-right">Change (2000–2024)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {peers.map((p, idx) => {
                  const chg = p.stunting_change_2000_2024;
                  const isRed = chg !== null && chg < 0;

                  return (
                    <tr key={p.iso3} className="hover:bg-brand-raised/40">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PEER_PALETTE[idx % PEER_PALETTE.length] }}
                          />
                          <Link
                            to={`/countries/${p.iso3}`}
                            className="font-medium text-brand-text hover:text-brand-accent hover:underline flex items-center gap-1"
                          >
                            {p.country_name} ({p.iso3})
                            <ArrowUpRight className="w-3 h-3 text-brand-muted opacity-60" />
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right num-tabular font-medium text-brand-text">
                        {p.stunting_2024 !== null ? `${p.stunting_2024}%` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right num-tabular font-mono">
                        {chg !== null ? (
                          <span className={isRed ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                            {chg > 0 ? `+${chg.toFixed(1)} pp` : `${chg.toFixed(1)} pp`}
                          </span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Line Chart */}
          <div id={chartElementId} className="lg:col-span-7 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                <CartesianGrid stroke="#243042" strokeDasharray="3 3" opacity={0.6} />
                <XAxis dataKey="year" stroke="#8B98A9" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8B98A9"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: "Stunting (%)", angle: -90, position: "insideLeft", fill: "#8B98A9", fontSize: 10 }}
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
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {peers.map((p, idx) => (
                  <Line
                    key={p.iso3}
                    type="monotone"
                    dataKey={`peer_${idx}`}
                    name={p.country_name}
                    stroke={PEER_PALETTE[idx % PEER_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </BentoCard>
  );
};
