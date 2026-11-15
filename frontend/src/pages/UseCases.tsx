import React from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  ArrowRight,
  HeartHandshake,
  Newspaper,
  Target,
  FileSearch,
  AlertCircle
} from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { DisclaimerBanner } from "../components/DisclaimerBanner";

interface UseCaseCardProps {
  number: string;
  title: string;
  role: string;
  icon: React.FC<{ className?: string }>;
  contextSentences: string[];
  limitationsNote: string;
  buttonLabel: string;
  buttonLink: string;
  buttonBadge?: string;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({
  number,
  title,
  role,
  icon: Icon,
  contextSentences,
  limitationsNote,
  buttonLabel,
  buttonLink,
  buttonBadge
}) => {
  return (
    <BentoCard>
      <div className="flex flex-col h-full justify-between space-y-5">
        <div className="space-y-4">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-brand-accent uppercase tracking-wider block font-medium">
                  Scenario {number} &bull; {role}
                </span>
                <h3 className="text-base font-bold text-brand-text tracking-tight">
                  {title}
                </h3>
              </div>
            </div>
            {buttonBadge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-raised border border-brand-border text-brand-muted">
                {buttonBadge}
              </span>
            )}
          </div>

          {/* Two-Sentence Plain-Language Context */}
          <div className="space-y-1.5 text-xs text-brand-muted leading-relaxed">
            <p>{contextSentences[0]}</p>
            <p>{contextSentences[1]}</p>
          </div>

          {/* Limitations Note */}
          <div className="bg-brand-raised/50 border border-brand-border/60 rounded-xl p-3 text-[11px] space-y-1 text-brand-muted">
            <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Limitations Note</span>
            </div>
            <p className="leading-normal">{limitationsNote}</p>
          </div>
        </div>

        {/* Action Link Button */}
        <div className="pt-2">
          <Link
            to={buttonLink}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-brand-accent/15 hover:bg-brand-accent/25 border border-brand-accent/30 text-brand-text hover:text-white text-xs font-semibold transition-all group shadow-sm"
          >
            <span>{buttonLabel}</span>
            <ArrowRight className="w-4 h-4 text-brand-accent group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </BentoCard>
  );
};

export const UseCases: React.FC = () => {
  const scenarios: UseCaseCardProps[] = [
    {
      number: "1",
      title: "Pilot Country Selection for Multi-Sectoral Intervention",
      role: "Bilateral Donor / Global Fund",
      icon: HeartHandshake,
      buttonBadge: "Peer Analysis",
      contextSentences: [
        "A development agency planning a maternal and child nutrition initiative seeks peer countries with nutritional profiles structurally similar to Bangladesh to scale proven community interventions. Evaluating statistical similarity helps identify partner nations experiencing analogous burdens across child stunting, wasting, and maternal anaemia.",
        "Program managers can contrast indicator profiles and examine historical stunting trajectories among the five closest peers to inform regional pilot selection."
      ],
      limitationsNote:
        "Statistical peer similarity reflects observed indicator patterns across standardized surveys, but does not capture health system capacity, political stability, fiscal space, or operational feasibility.",
      buttonLabel: "Explore Similar Countries for Bangladesh",
      buttonLink: "/similar?country=BGD"
    },
    {
      number: "2",
      title: "Objective Country Nutrition Briefing",
      role: "Journalist / Health Policy Communicator",
      icon: Newspaper,
      buttonBadge: "Country Profile",
      contextSentences: [
        "A science journalist reporting on regional malnutrition trends requires a verified, objective profile of Nigeria ahead of an international summit. The platform consolidates UN agency data into a standardized summary detailing child undernutrition, adult obesity, and relative double-burden status.",
        "Reporters can inspect survey years for every value, copy neutral narrative summaries, and export an official single-page PDF brief for citation."
      ],
      limitationsNote:
        "Data years differ between indicators depending on survey cycles; narrative summaries describe relative positions among reporting nations and do not identify specific policy or dietary causes.",
      buttonLabel: "Open Country Profile for Nigeria",
      buttonLink: "/countries/NGA"
    },
    {
      number: "3",
      title: "National Target Setting and Scenario Exploration",
      role: "Ministry of Health Policy Planner",
      icon: Target,
      buttonBadge: "Simulator",
      contextSentences: [
        "A national nutrition steering committee in Kenya is evaluating how reducing child stunting and improving maternal anaemia would shift the nation's relative placement among global peers. The interactive simulator enables planners to adjust indicator levels and immediately observe the resulting group alignment.",
        "Teams can compare the simulated profile against current real-world countries to calibrate realistic multi-year milestones."
      ],
      limitationsNote:
        "The simulator illustrates relative positioning against current country data and does not represent an epidemiological forecast, dynamic simulation, or causal intervention model.",
      buttonLabel: "Launch Target Simulator for Kenya",
      buttonLink: "/countries/KEN#simulator"
    },
    {
      number: "4",
      title: "Data Gap Audit and Survey Prioritization",
      role: "Global Health Researcher / Statistician",
      icon: FileSearch,
      buttonBadge: "Data Gaps",
      contextSentences: [
        "An academic researcher is auditing international nutrition databases to identify critical surveillance blind spots in child wasting and low birth weight. The explorer maps reporting status across 202 countries, highlighting where lack of recent surveys hinders cross-national assessment.",
        "Analysts can filter by geographic region and World Bank income classification to locate jurisdictions requiring targeted statistical support."
      ],
      limitationsNote:
        "Data gaps are frequently concentrated in high-income countries where standardized child surveys are not routinely administered, as well as small island developing states with limited survey logistics.",
      buttonLabel: "Open Data Gap Explorer",
      buttonLink: "/gaps"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-5 h-5 text-brand-accent" />
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">
            Applied Use Cases
          </h1>
        </div>
        <p className="text-xs text-brand-muted">
          Pre-configured analytical workflows tailored for donors, journalists, policy planners, and health researchers.
        </p>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map((s) => (
          <UseCaseCard key={s.number} {...s} />
        ))}
      </div>
    </div>
  );
};
