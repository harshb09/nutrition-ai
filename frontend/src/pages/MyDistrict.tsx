import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Download,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  HeartPulse,
  AlertCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { api } from "../api/client";
import { DistrictSummary, DistrictPeer, StateSummary } from "../api/types";

export const MyDistrict: React.FC = () => {
  const { state: routeState, district: routeDistrict } = useParams<{
    state?: string;
    district?: string;
  }>();
  const navigate = useNavigate();

  const [states, setStates] = useState<StateSummary[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [districtsInState, setDistrictsInState] = useState<DistrictSummary[]>([]);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");

  const [districtData, setDistrictData] = useState<DistrictSummary | null>(null);
  const [peers, setPeers] = useState<DistrictPeer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load states on mount
  useEffect(() => {
    async function loadStates() {
      try {
        const s = await api.getIndiaStates();
        setStates(s);
      } catch (err) {
        console.error("Failed to load states", err);
      }
    }
    loadStates();
  }, []);

  // Sync state & district from route params or default to Varanasi, UP
  useEffect(() => {
    const s = routeState ? decodeURIComponent(routeState) : "Uttar Pradesh";
    const d = routeDistrict ? decodeURIComponent(routeDistrict) : "Varanasi";
    setSelectedState(s);
    setSelectedDistrictName(d);
  }, [routeState, routeDistrict]);

  // Load districts in selected state
  useEffect(() => {
    if (selectedState) {
      api.getIndiaDistricts({ state: selectedState }).then((list) => {
        setDistrictsInState(list);
      });
    }
  }, [selectedState]);

  // Load full district details and peers
  useEffect(() => {
    if (!selectedState || !selectedDistrictName) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getDistrictDetail(selectedState, selectedDistrictName),
      api.getDistrictPeers(selectedState, selectedDistrictName)
    ])
      .then(([dist, pList]) => {
        if (isMounted) {
          setDistrictData(dist);
          setPeers(pList);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(
            `Could not load details for ${selectedDistrictName}, ${selectedState}. Please verify state and district selection.`
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedState, selectedDistrictName]);

  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    api.getIndiaDistricts({ state: newState }).then((list) => {
      setDistrictsInState(list);
      if (list.length > 0) {
        navigate(`/district/${encodeURIComponent(newState)}/${encodeURIComponent(list[0].district)}`);
      }
    });
  };

  const handleDistrictChange = (newDist: string) => {
    setSelectedDistrictName(newDist);
    navigate(`/district/${encodeURIComponent(selectedState)}/${encodeURIComponent(newDist)}`);
  };

  const formatBandLabel = (band?: string) => {
    if (band === "higher_than_most") return "Higher than most districts";
    if (band === "lower_than_most") return "Lower than most districts";
    if (band === "about_typical") return "About typical";
    return "Not reported";
  };

  const getBandBadgeClass = (band?: string, isOverweight?: boolean) => {
    if (band === "higher_than_most") {
      return isOverweight
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (band === "lower_than_most") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const indicators = districtData?.indicators || {};

  // Child Chart Data for Recharts
  const childChartData = useMemo(() => {
    if (!districtData) return [];
    return [
      {
        name: "Stunting",
        fullName: "Child Stunting",
        value: indicators.stunting?.value ?? 0,
        stateAvg: indicators.stunting?.state_average ?? 0,
        band: indicators.stunting?.band,
        color: indicators.stunting?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      },
      {
        name: "Wasting",
        fullName: "Child Wasting",
        value: indicators.wasting?.value ?? 0,
        stateAvg: indicators.wasting?.state_average ?? 0,
        band: indicators.wasting?.band,
        color: indicators.wasting?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      },
      {
        name: "Underweight",
        fullName: "Child Underweight",
        value: indicators.underweight?.value ?? 0,
        stateAvg: indicators.underweight?.state_average ?? 0,
        band: indicators.underweight?.band,
        color: indicators.underweight?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      },
      {
        name: "Anaemia",
        fullName: "Child Anaemia (6-59m)",
        value: indicators.anaemia_children?.value ?? 0,
        stateAvg: indicators.anaemia_children?.state_average ?? 0,
        band: indicators.anaemia_children?.band,
        color: indicators.anaemia_children?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      }
    ];
  }, [districtData, indicators]);

  // Women Chart Data for Recharts
  const womenChartData = useMemo(() => {
    if (!districtData) return [];
    return [
      {
        name: "Low BMI",
        fullName: "Women Low BMI (<18.5)",
        value: indicators.low_bmi_women?.value ?? 0,
        stateAvg: indicators.low_bmi_women?.state_average ?? 0,
        band: indicators.low_bmi_women?.band,
        color: indicators.low_bmi_women?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      },
      {
        name: "Overweight",
        fullName: "Overweight / Obese (≥25)",
        value: indicators.overweight_women?.value ?? 0,
        stateAvg: indicators.overweight_women?.state_average ?? 0,
        band: indicators.overweight_women?.band,
        color: "#EA580C"
      },
      {
        name: "Anaemia",
        fullName: "Women Anaemia (15-49y)",
        value: indicators.anaemia_women?.value ?? 0,
        stateAvg: indicators.anaemia_women?.state_average ?? 0,
        band: indicators.anaemia_women?.band,
        color: indicators.anaemia_women?.band === "higher_than_most" ? "#E11D48" : "#F59E0B"
      }
    ];
  }, [districtData, indicators]);

  // Custom interactive tooltip for Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
          <span className="font-bold text-slate-900 block text-sm">{data.fullName}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">District Rate:</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{data.value}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">State Average:</span>
            <span className="font-semibold text-slate-700 font-mono">{data.stateAvg}%</span>
          </div>
          <div className="pt-1 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-sky-700 uppercase">
              {formatBandLabel(data.band)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Selector Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
              District Health Profiler
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Select State & District to View Nutrition Intelligence
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            >
              {states.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>

            <select
              value={selectedDistrictName}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            >
              {districtsInState.map((d) => (
                <option key={d.district_id} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading district nutrition profile...</p>
          </div>
        </div>
      ) : error || !districtData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">District Not Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-sky-800 px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-md">
                    {districtData.group_name}
                  </span>
                  <span className="text-xs text-slate-500">NFHS-5 (2019–2021)</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {districtData.district}, {districtData.state}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {districtData.group_descriptor}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={api.getIndiaDistrictPdfUrl(districtData.state, districtData.district)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download Brief (PDF)</span>
                </a>

                <button
                  onClick={() => {
                    const event = new CustomEvent("open-assistant", {
                      detail: `Tell me about child nutrition and stunting in ${districtData.district}, ${districtData.state}`
                    });
                    window.dispatchEvent(event);
                  }}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ask Assistant</span>
                </button>
              </div>
            </div>

            {/* Disclaimer Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Based on NFHS-5 (2019–21) survey estimates. Relative bands compare this district against all 707 surveyed districts across India. Not medical advice.
              </span>
            </div>
          </div>

          {/* Interactive Visual Comparison Section (Graphs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interactive Graph 1: Child Nutrition */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    👶
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Child Growth & Nutrition</h3>
                    <span className="text-[11px] text-slate-500">District vs State Average (%)</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Hover bars for data</span>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={childChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {childChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Cards List */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                {childChartData.map((d) => (
                  <div key={d.name} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-slate-700 block truncate">{d.fullName}</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-extrabold text-slate-900 font-mono">{d.value}%</span>
                      <span className="text-[10px] text-slate-500">State: {d.stateAvg}%</span>
                    </div>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${getBandBadgeClass(d.band)}`}>
                      {formatBandLabel(d.band)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Graph 2: Women's Health & Nutrition */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    👩
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Women's Nutrition (15–49y)</h3>
                    <span className="text-[11px] text-slate-500">District vs State Average (%)</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Hover bars for data</span>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={womenChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {womenChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Cards List */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                {womenChartData.map((d) => (
                  <div key={d.name} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[10px] font-semibold text-slate-700 block truncate">{d.fullName}</span>
                    <span className="text-lg font-extrabold text-slate-900 font-mono block">{d.value}%</span>
                    <span className="text-[10px] text-slate-500 block">State: {d.stateAvg}%</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold border ${getBandBadgeClass(d.band, d.name === "Overweight")}`}>
                      {formatBandLabel(d.band)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Living Conditions & Healthcare Context (Visual Progress Meters) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Living Conditions & Healthcare Coverage Context
                </h3>
                <span className="text-xs text-slate-500">
                  Key contextual determinants that influence child and maternal nutritional outcomes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "improved_drinking_water", label: "Improved Drinking Water", color: "#0284C7" },
                { key: "improved_sanitation", label: "Improved Sanitation Facility", color: "#0D9488" },
                { key: "clean_cooking_fuel", label: "Clean Cooking Fuel", color: "#D97706" },
                { key: "women_literacy", label: "Women Literacy (15–49 years)", color: "#7C3AED" },
                { key: "institutional_births", label: "Institutional Deliveries", color: "#16A34A" },
                { key: "immunization", label: "Children Fully Vaccinated (12-23m)", color: "#2563EB" },
              ].map(({ key, label, color }) => {
                const val = indicators[key]?.value;
                const pct = val !== null && val !== undefined ? Math.max(0, Math.min(100, val)) : 0;
                return (
                  <div key={key} className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span className="font-extrabold text-slate-900 font-mono text-sm">
                        {val !== null && val !== undefined ? `${val}%` : "Not reported"}
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Districts Like Mine (10 Peers) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
                  Peer Learning & Comparison
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Districts with a Similar Nutrition Pattern Across India
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">10 Nearest Districts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {peers.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/70 hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/district/${encodeURIComponent(p.state)}/${encodeURIComponent(p.district)}`}
                      className="font-bold text-sm text-slate-900 hover:text-sky-700 flex items-center gap-1.5"
                    >
                      <span>{p.district}, {p.state}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-bold">
                      {p.group_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {p.plain_comparison}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Stunting: <strong className="text-slate-900">{p.stunting}%</strong></span>
                    <span>Anaemia: <strong className="text-slate-900">{p.anaemia_children}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Where to Access Care in Your District */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <HeartPulse className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-emerald-950">
                Where to Access Nutrition & Healthcare Support in Your District
              </h3>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              If you or someone in your community needs nutrition guidance, supplementary food, growth monitoring, or immunization:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 block">Anganwadi Centres (ICDS)</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Provides supplementary nutrition, growth monitoring for children under 6 years, and rations for pregnant & lactating mothers.
                </p>
              </div>
              <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 block">ASHA Workers</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your accredited community health activist facilitates immunization, iron-folic acid tablets, and antenatal health checkups.
                </p>
              </div>
              <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 block">Primary Health Centres (PHC)</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your local government clinic for infant health, anaemia treatment, routine vaccinations, and maternal medical care.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
