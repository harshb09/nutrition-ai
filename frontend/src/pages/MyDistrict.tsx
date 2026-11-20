import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Download,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  HeartPulse,
  AlertCircle
} from "lucide-react";
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
        ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
        : "bg-rose-500/15 text-rose-500 border-rose-500/30";
    }
    if (band === "lower_than_most") {
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    }
    return "bg-brand-raised text-brand-muted border-brand-border";
  };

  const indicators = districtData?.indicators || {};

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* State & District Selectors Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-wider block">
              District Selector
            </span>
            <h2 className="text-sm font-semibold text-brand-text">
              Choose an Indian district to view local health estimates
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
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
              className="bg-brand-raised border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent"
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
            <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-brand-muted">Loading district nutrition brief...</p>
          </div>
        </div>
      ) : error || !districtData ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-brand-text">District Not Found</h3>
          <p className="text-xs text-brand-muted max-w-md mx-auto">{error}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* District Header Card */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-accent px-2.5 py-0.5 bg-brand-accent/15 border border-brand-accent/30 rounded-md">
                    {districtData.group_name}
                  </span>
                  <span className="text-xs text-brand-muted">NFHS-5 Factsheet</span>
                </div>
                <h1 className="text-3xl font-extrabold text-brand-text">
                  {districtData.district}, {districtData.state}
                </h1>
                <p className="text-xs text-brand-muted mt-1 max-w-2xl leading-relaxed">
                  {districtData.group_descriptor}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={api.getIndiaDistrictPdfUrl(districtData.state, districtData.district)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-brand-raised hover:bg-brand-surface border border-brand-border rounded-xl text-xs font-semibold text-brand-text hover:text-brand-accent transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Brief (PDF)</span>
                </a>

                <button
                  onClick={() => {
                    // Trigger chatbot opening with preset prompt
                    const event = new CustomEvent("open-assistant", {
                      detail: `Tell me about child stunting and nutrition in ${districtData.district}, ${districtData.state}`
                    });
                    window.dispatchEvent(event);
                  }}
                  className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Assistant</span>
                </button>
              </div>
            </div>

            {/* Disclaimer Bar */}
            <div className="p-3 bg-brand-raised/50 border border-brand-border/60 rounded-xl flex items-center gap-2 text-xs text-brand-muted">
              <ShieldAlert className="w-4 h-4 text-amber-500/80 shrink-0" />
              <span>
                Based on NFHS-5 (2019-21) survey estimates. Relative bands compare this district against all 707 surveyed districts in India. Not medical advice.
              </span>
            </div>
          </div>

          {/* 3 Headline Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Child Nutrition */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-brand-border pb-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  👶
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text">1. Child Nutrition</h3>
                  <span className="text-[11px] text-brand-muted">Children under 5 years</span>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  { key: "stunting", label: "Child Stunting", note: "Low height for age" },
                  { key: "wasting", label: "Child Wasting", note: "Low weight for height" },
                  { key: "underweight", label: "Child Underweight", note: "Low weight for age" },
                  { key: "anaemia_children", label: "Child Anaemia", note: "6–59 months" },
                ].map(({ key, label, note }) => {
                  const ind = indicators[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-brand-text block">{label}</span>
                          <span className="text-[10px] text-brand-muted">{note}</span>
                        </div>
                        <span className="text-base font-extrabold text-brand-text font-mono">
                          {ind?.value !== null && ind?.value !== undefined ? `${ind.value}%` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded border font-medium ${getBandBadgeClass(
                            ind?.band
                          )}`}
                        >
                          {formatBandLabel(ind?.band)}
                        </span>
                        <span className="text-brand-muted">
                          State avg: {ind?.state_average ?? "—"}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Women's Nutrition */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-brand-border pb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  👩
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text">2. Women's Nutrition</h3>
                  <span className="text-[11px] text-brand-muted">Women 15–49 years</span>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  { key: "low_bmi_women", label: "Low BMI (< 18.5)", note: "Chronic energy deficit" },
                  {
                    key: "overweight_women",
                    label: "Overweight / Obese (≥ 25)",
                    note: "Higher body weight",
                    isOverweight: true
                  },
                  { key: "anaemia_women", label: "Women Anaemia", note: "Hb < 12.0 g/dl" },
                ].map(({ key, label, note, isOverweight }) => {
                  const ind = indicators[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-brand-text block">{label}</span>
                          <span className="text-[10px] text-brand-muted">{note}</span>
                        </div>
                        <span className="text-base font-extrabold text-brand-text font-mono">
                          {ind?.value !== null && ind?.value !== undefined ? `${ind.value}%` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded border font-medium ${getBandBadgeClass(
                            ind?.band,
                            isOverweight
                          )}`}
                        >
                          {formatBandLabel(ind?.band)}
                        </span>
                        <span className="text-brand-muted">
                          State avg: {ind?.state_average ?? "—"}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Living Conditions & Healthcare Context */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-brand-border pb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  🏡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text">3. Living Conditions</h3>
                  <span className="text-[11px] text-brand-muted">Household & Healthcare context</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { key: "improved_drinking_water", label: "Improved Drinking Water" },
                  { key: "improved_sanitation", label: "Improved Sanitation Facility" },
                  { key: "clean_cooking_fuel", label: "Clean Cooking Fuel" },
                  { key: "women_literacy", label: "Women Literate (15–49)" },
                  { key: "institutional_births", label: "Institutional Births" },
                  { key: "immunization", label: "Children Fully Vaccinated (12-23m)" },
                ].map(({ key, label }) => {
                  const ind = indicators[key];
                  const val = ind?.value;
                  return (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-brand-border/40">
                      <span className="text-brand-muted">{label}</span>
                      <span className="font-bold text-brand-text font-mono">
                        {val !== null && val !== undefined ? `${val}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Districts Like Mine (10 Peers) */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">
                  Peer Comparison
                </span>
                <h3 className="text-base font-bold text-brand-text">
                  Districts with a Similar Nutrition Pattern Across India
                </h3>
              </div>
              <span className="text-xs text-brand-muted">10 Nearest Districts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {peers.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-brand-raised/60 border border-brand-border rounded-xl space-y-1.5 hover:border-brand-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/district/${encodeURIComponent(p.state)}/${encodeURIComponent(p.district)}`}
                      className="font-bold text-xs text-brand-text hover:text-brand-accent flex items-center gap-1"
                    >
                      <span>{p.district}, {p.state}</span>
                      <ExternalLink className="w-3 h-3 text-brand-muted" />
                    </Link>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-brand-surface text-brand-muted border border-brand-border font-medium">
                      {p.group_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-muted leading-relaxed">
                    {p.plain_comparison}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Where to Get Help Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <HeartPulse className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-brand-text">
                Where to Access Nutrition & Healthcare Support in Your District
              </h3>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed">
              If you or someone in your family needs nutrition guidance, supplementary food, growth monitoring, or immunization:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-brand-surface border border-emerald-500/20 rounded-xl space-y-1">
                <span className="font-bold text-brand-text block">Anganwadi Centres (ICDS)</span>
                <p className="text-[11px] text-brand-muted">
                  Provides supplementary nutrition, growth monitoring for children under 6 years, and rations for pregnant & lactating mothers.
                </p>
              </div>
              <div className="p-3 bg-brand-surface border border-emerald-500/20 rounded-xl space-y-1">
                <span className="font-bold text-brand-text block">ASHA Workers</span>
                <p className="text-[11px] text-brand-muted">
                  Your accredited community health activist facilitates immunization, iron-folic acid tablets, and antenatal health checkups.
                </p>
              </div>
              <div className="p-3 bg-brand-surface border border-emerald-500/20 rounded-xl space-y-1">
                <span className="font-bold text-brand-text block">Primary Health Centres (PHC)</span>
                <p className="text-[11px] text-brand-muted">
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
