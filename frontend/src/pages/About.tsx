import React from "react";
import { Link } from "react-router-dom";
import {
  Database,
  ShieldCheck,
  HeartPulse,
  BookOpen,
  ArrowRight
} from "lucide-react";

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Title */}
      <div className="border-b border-brand-border pb-5 space-y-2">
        <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">
          Institutional Context & Data Sources
        </span>
        <h1 className="text-3xl font-extrabold text-brand-text">
          About Nutrition Atlas
        </h1>
        <p className="text-sm text-brand-muted leading-relaxed">
          A public health intelligence platform designed to translate population-level nutrition surveys into actionable,
          plain-language insights for communities, local health planners, and evaluators.
        </p>
      </div>

      {/* Purpose & Audience */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-accent" />
          <span>Purpose & Target Audience</span>
        </h2>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3 text-xs text-brand-muted leading-relaxed shadow-sm">
          <p>
            Malnutrition is multi-faceted: a community may face high child stunting and wasting alongside emerging adult
            overweight, anaemia, and poor sanitation infrastructure. Traditionally, survey data is published in complex
            factsheets with hundreds of columns, making cross-district comparisons and peer learning difficult for field workers.
          </p>
          <p>
            <strong>Nutrition Atlas bridges this gap</strong> by organizing data across 707 Indian districts and 200+ countries
            into intuitive nutrition patterns. The public portal uses strictly plain language, avoiding statistical or modeling
            jargon so that local administrators, health workers, and citizens can readily interpret local conditions.
          </p>
        </div>
      </section>

      {/* Data Sources & Citations */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-accent" />
          <span>Primary Data Sources & Citations</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source 1: NFHS-5 */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-[11px] font-bold text-brand-accent uppercase block">
              India District Factsheets
            </span>
            <h3 className="text-sm font-bold text-brand-text">
              National Family Health Survey (NFHS-5, 2019–2021)
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Conducted by the International Institute for Population Sciences (IIPS), Mumbai, under the stewardship of the
              Ministry of Health and Family Welfare (MoHFW), Government of India. Ingests 707 surveyed districts across 36 States/UTs.
            </p>
          </div>

          {/* Source 2: UN JME */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-[11px] font-bold text-brand-accent uppercase block">
              Global Country Malnutrition Estimates
            </span>
            <h3 className="text-sm font-bold text-brand-text">
              UNICEF / WHO / World Bank Joint Child Malnutrition Estimates (JME 2024)
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Standardized national estimates of child stunting, wasting, and overweight across 200+ countries, combined with
              WHO Global Health Observatory estimates for adult obesity and diabetes.
            </p>
          </div>

          {/* Source 3: Boundary Geometry */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-[11px] font-bold text-brand-accent uppercase block">
              Geographic Boundaries
            </span>
            <h3 className="text-sm font-bold text-brand-text">
              Survey of India & Census Administrative Boundaries (2011)
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              District boundary shapes matched using fuzzy string similarity. Post-2014 reorganized districts (e.g. Telangana,
              Ladakh) without polygon shapes are explicitly acknowledged as "no boundary available" without faking geometry.
            </p>
          </div>

          {/* Source 4: Local Health Guidelines */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-sm">
            <span className="text-[11px] font-bold text-brand-accent uppercase block">
              Community Health Guidelines
            </span>
            <h3 className="text-sm font-bold text-brand-text">
              Integrated Child Development Services (ICDS) & National Health Mission (NHM)
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Referral information for community services provided by Anganwadi workers, Accredited Social Health Activists (ASHA),
              and Primary Health Centres (PHC).
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Policy & Data Governance */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>Privacy & Data Protection Principles</span>
        </h2>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3 text-xs text-brand-muted leading-relaxed shadow-sm">
          <p>
            <strong>1. No Personal Information:</strong> Nutrition Atlas only stores aggregated population estimates at the
            district and country level. It does not collect, process, or store individual patient records, personal identities,
            or clinical histories.
          </p>
          <p>
            <strong>2. Ephemeral Upload Processing:</strong> The "Upload Your Data" tool executes entirely in volatile memory.
            Files uploaded by local health teams are never saved to disk or persistent storage, and automatic guards immediately
            reject files containing identifiable personal columns (such as names, phone numbers, or government IDs).
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-amber-500" />
          <span>Public Health Notice & Medical Disclaimer</span>
        </h2>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3 text-xs text-brand-muted leading-relaxed shadow-sm">
          <p>
            <strong>Survey Estimates, Not Clinical Diagnoses:</strong> Indicators shown on this platform represent statistical
            sample estimates from the NFHS-5 survey (2019–2021). Relative bands ("higher than most districts", "about typical",
            "lower than most districts") divide surveyed districts into three equal groups and do not represent diagnostic cutoffs.
          </p>
          <p>
            <strong>Where to Seek Care:</strong> For individual child nutrition support, growth monitoring, maternal health checks,
            or treatment for anaemia, please contact your local <strong>Anganwadi worker</strong>, <strong>ASHA worker</strong>,
            or visit your nearest <strong>Primary Health Centre (PHC)</strong> or government hospital.
          </p>
        </div>
      </section>

      {/* For Evaluators Link */}
      <div className="p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-brand-text">
            Looking for detailed mathematical methodologies or algorithm evaluations?
          </h3>
          <p className="text-xs text-brand-muted mt-1">
            Access the dedicated analyst workbench containing full model comparisons and validation reports.
          </p>
        </div>
        <Link
          to="/analysis"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-semibold hover:bg-brand-accent/90 transition-all shrink-0 shadow-sm"
        >
          <span>Open Analysis Section</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
