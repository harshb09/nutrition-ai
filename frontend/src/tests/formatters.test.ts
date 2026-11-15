import { describe, it, expect } from "vitest";

describe("Frontend Formatting & Helper Utilities", () => {
  it("formats percentages accurately with single decimal precision", () => {
    const formatPercent = (val: number | null | undefined): string => {
      if (val === null || val === undefined) return "—";
      return `${val.toFixed(1)}%`;
    };

    expect(formatPercent(27.534)).toBe("27.5%");
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(null)).toBe("—");
  });

  it("calculates delta signs and colors correctly", () => {
    const formatDelta = (delta: number | null) => {
      if (delta === null) return { text: "—", isPositive: false };
      const text = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
      return { text, isPositive: delta > 0 };
    };

    expect(formatDelta(3.2)).toEqual({ text: "+3.2", isPositive: true });
    expect(formatDelta(-1.8)).toEqual({ text: "-1.8", isPositive: false });
    expect(formatDelta(null)).toEqual({ text: "—", isPositive: false });
  });

  it("validates double burden qualification logic", () => {
    const checkDoubleBurden = (
      underHigh: boolean,
      overHigh: boolean
    ): { isDoubleBurden: boolean; label: string } => {
      const isDoubleBurden = underHigh && overHigh;
      return {
        isDoubleBurden,
        label: isDoubleBurden
          ? "Double-Burden Flagged (relative to other countries in this dataset)"
          : "No Double-Burden"
      };
    };

    expect(checkDoubleBurden(true, true).isDoubleBurden).toBe(true);
    expect(checkDoubleBurden(true, false).isDoubleBurden).toBe(false);
    expect(checkDoubleBurden(false, true).isDoubleBurden).toBe(false);
    expect(checkDoubleBurden(false, false).isDoubleBurden).toBe(false);
  });
});

