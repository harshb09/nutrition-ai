import React, { useState, useEffect, useRef } from "react";
import { Sliders, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BentoCard } from "./BentoCard";
import { api } from "../api/client";
import { SimulationResponse, SimulationRequest } from "../api/types";

interface TargetSimulatorProps {
  countryName: string;
  initialValues: Record<string, number | null>;
  featureRanges?: Record<string, { min: number; max: number; step: number }>;
}

const FEATURE_CONFIG: Array<{ key: keyof SimulationRequest; label: string; unit: string }> = [
  { key: "stunting", label: "Child Stunting (% under 5)", unit: "%" },
  { key: "child_overweight", label: "Child Overweight (% under 5)", unit: "%" },
  { key: "wasting", label: "Child Wasting (% under 5)", unit: "%" },
  { key: "adult_obesity", label: "Adult Obesity (%)", unit: "%" },
  { key: "adult_diabetes", label: "Adult Diabetes (%)", unit: "%" },
  { key: "anaemia_women", label: "Anaemia in Women 15-49 (%)", unit: "%" },
  { key: "low_birth_weight", label: "Low Birth Weight (% births)", unit: "%" }
];

export const TargetSimulator: React.FC<TargetSimulatorProps> = ({
  countryName,
  initialValues,
  featureRanges
}) => {
  // Extract initial values with sensible defaults if missing
  const getCleanInitial = (): SimulationRequest => ({
    stunting: initialValues.stunting ?? 20.0,
    child_overweight: initialValues.child_overweight ?? 5.0,
    wasting: initialValues.wasting ?? 5.0,
    adult_obesity: initialValues.adult_obesity ?? 15.0,
    adult_diabetes: initialValues.adult_diabetes ?? 8.0,
    anaemia_women: initialValues.anaemia_women ?? 25.0,
    low_birth_weight: initialValues.low_birth_weight ?? 10.0
  });

  const [values, setValues] = useState<SimulationRequest>(getCleanInitial());
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const debounceTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = (currentValues: SimulationRequest) => {
    setIsSimulating(true);
    api.simulateProfile(currentValues)
      .then((res) => {
        setSimulationResult(res);
        setIsSimulating(false);
      })
      .catch(() => {
        setIsSimulating(false);
      });
  };

  useEffect(() => {
    setValues(getCleanInitial());
    runSimulation(getCleanInitial());
  }, [countryName, initialValues]);

  const handleSliderChange = (key: keyof SimulationRequest, newVal: number) => {
    const updated = { ...values, [key]: newVal };
    setValues(updated);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      runSimulation(updated);
    }, 200);
  };

  const handleReset = () => {
    const resetVals = getCleanInitial();
    setValues(resetVals);
    runSimulation(resetVals);
  };

  return (
    <div id="simulator" className="space-y-4">
      <BentoCard
        title="Target Simulator"
        subtitle={`Adjust indicator targets to see how hypothetical improvements or shifts reposition ${countryName} relative to international profiles.`}
        action={
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-raised hover:bg-brand-border border border-brand-border rounded-xl text-xs font-medium text-brand-text transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Observed Values
          </button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* Sliders Column */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-semibold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-brand-accent" />
              Adjust Indicators (Clamped to Observed Dataset Range)
            </h4>

            {FEATURE_CONFIG.map(({ key, label, unit }) => {
              const r = featureRanges?.[key] || { min: 0.0, max: 60.0, step: 0.1 };
              const currentVal = values[key];
              const origVal = initialValues[key];

              return (
                <div key={key} className="bg-brand-raised/50 border border-brand-border rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-brand-text">{label}</span>
                    <div className="flex items-center gap-2">
                      {origVal !== null && origVal !== undefined && (
                        <span className="text-[10px] text-brand-muted">
                          (Observed: {origVal}{unit})
                        </span>
                      )}
                      <span className="font-mono font-bold text-brand-accent text-xs">
                        {currentVal.toFixed(1)}{unit}
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={currentVal}
                    onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                    className="w-full accent-[#2DD4BF] bg-brand-surface h-1.5 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-brand-muted mt-1 font-mono">
                    <span>{r.min}{unit}</span>
                    <span>{r.max}{unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            {simulationResult ? (
              <div className="space-y-6">
                {/* Closest Profile Card */}
                <div className="bg-brand-raised border border-brand-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs text-brand-muted">
                    <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                    <span>Estimated Profile Alignment</span>
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/30 inline-block mb-1">
                      {simulationResult.closest_group.name}
                    </span>
                    <h3 className="text-base font-bold text-brand-text mt-1">
                      {simulationResult.closest_group.provisional_name}
                    </h3>
                    <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                      {simulationResult.closest_group.descriptor}
                    </p>
                  </div>
                </div>

                {/* Closeness to Each Group Centre */}
                <div className="bg-brand-raised/50 border border-brand-border rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-brand-text uppercase tracking-wider">
                    Profile Closeness
                  </h4>
                  <div className="space-y-3">
                    {simulationResult.group_closeness.map((gc) => (
                      <div key={gc.group_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${gc.is_closest ? "text-brand-accent" : "text-brand-text"}`}>
                            {gc.group_name} {gc.is_closest && "(Closest)"}
                          </span>
                          <span className="font-mono text-xs text-brand-muted">
                            {gc.closeness_score}% closeness
                          </span>
                        </div>
                        <div className="w-full bg-brand-surface rounded-full h-2 overflow-hidden border border-brand-border">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              gc.is_closest ? "bg-brand-accent" : "bg-brand-muted/40"
                            }`}
                            style={{ width: `${gc.closeness_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closest Real Countries */}
                <div className="bg-brand-raised/50 border border-brand-border rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-brand-text uppercase tracking-wider">
                    5 Closest Real Countries
                  </h4>
                  <div className="space-y-2">
                    {simulationResult.closest_countries.map((cc) => (
                      <div
                        key={cc.iso3}
                        className="flex items-center justify-between p-2 rounded-xl bg-brand-surface border border-brand-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-brand-accent font-semibold">
                            {cc.iso3}
                          </span>
                          <span className="text-brand-text font-medium">{cc.country_name}</span>
                          {cc.group_id && (
                            <span className="text-[10px] text-brand-muted">
                              ({cc.group_id})
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/countries/${cc.iso3}`}
                          className="text-[11px] text-brand-muted hover:text-brand-text flex items-center gap-1"
                        >
                          Profile <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-brand-muted">
                {isSimulating ? "Calculating profile positioning..." : "Adjust sliders to start simulation"}
              </div>
            )}

            {/* Mandatory Disclaimer Label */}
            <div className="p-3 bg-brand-surface border border-brand-border/80 rounded-xl text-xs text-brand-muted italic leading-relaxed text-center">
              "Where this profile would sit relative to current countries. This is not a forecast."
            </div>
          </div>
        </div>
      </BentoCard>
    </div>
  );
};
