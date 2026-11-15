import React, { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { BentoCard } from "./BentoCard";

interface CountryStoryProps {
  countryName: string;
  iso3: string;
  story: string | null | undefined;
  pdfUrl: string;
}

export const CountryStory: React.FC<CountryStoryProps> = ({
  countryName,
  iso3,
  story,
  pdfUrl
}) => {
  const [copied, setCopied] = useState(false);

  if (!story) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div id="story">
      <BentoCard
        title={`Country Story — ${countryName} (${iso3})`}
        subtitle="Automated, rule-based executive summary synthesized directly from official surveillance data."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-raised hover:bg-brand-border border border-brand-border rounded-xl text-xs font-medium text-brand-text transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy text</span>
                </>
              )}
            </button>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-brand-bg font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <Download className="w-3.5 h-3.5" />
              Download brief (PDF)
            </a>
          </div>
        }
      >
        <div className="bg-brand-raised/40 border border-brand-border/70 rounded-xl p-5 relative">
          <p className="text-xs md:text-sm text-brand-text leading-relaxed select-text font-normal">
            {story}
          </p>

          <div className="mt-4 pt-3 border-t border-brand-border/40 text-[11px] text-brand-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Synthesized from Joint Malnutrition Estimates (2026), Global Nutrition Report (2023), and UNICEF-WHO (2023).
            </span>
            <span className="italic">
              Objective descriptive synthesis without causal attributions.
            </span>
          </div>
        </div>
      </BentoCard>
    </div>
  );
};
