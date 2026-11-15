import { describe, it, expect } from "vitest";
import { parseUrlFilters, encodeUrlFilters, FilterState } from "../utils/urlState";

describe("URL State Utility", () => {
  it("encodes empty filters to empty string", () => {
    expect(encodeUrlFilters({})).toBe("");
  });

  it("encodes and parses country, region, income, and group filters", () => {
    const filters: FilterState = {
      country: "IND",
      region: "South Asia",
      income: "Lower middle income",
      group: "group_1"
    };

    const encoded = encodeUrlFilters(filters);
    expect(encoded).toContain("country=IND");
    expect(encoded).toContain("region=South+Asia");
    expect(encoded).toContain("income=Lower+middle+income");
    expect(encoded).toContain("group=group_1");

    const params = new URLSearchParams(encoded.slice(1));
    const parsed = parseUrlFilters(params);

    expect(parsed.country).toBe("IND");
    expect(parsed.region).toBe("South Asia");
    expect(parsed.income).toBe("Lower middle income");
    expect(parsed.group).toBe("group_1");
  });

  it("encodes and restores double_burden boolean parameter correctly", () => {
    // When true
    const paramsTrue = new URLSearchParams("double_burden=true");
    expect(parseUrlFilters(paramsTrue).doubleBurden).toBe(true);

    // When false
    const paramsFalse = new URLSearchParams("double_burden=false");
    expect(parseUrlFilters(paramsFalse).doubleBurden).toBe(false);

    // When absent or invalid
    const paramsNone = new URLSearchParams("double_burden=invalid");
    expect(parseUrlFilters(paramsNone).doubleBurden).toBeUndefined();

    // Round-trip true
    const encTrue = encodeUrlFilters({ doubleBurden: true });
    expect(encTrue).toBe("?double_burden=true");
    expect(parseUrlFilters(new URLSearchParams(encTrue.slice(1))).doubleBurden).toBe(true);
  });

  it("restores sort_by and sort_order correctly", () => {
    const filters: FilterState = {
      sortBy: "stunting_count",
      sortOrder: "desc"
    };
    const encoded = encodeUrlFilters(filters);
    const parsed = parseUrlFilters(new URLSearchParams(encoded.slice(1)));

    expect(parsed.sortBy).toBe("stunting_count");
    expect(parsed.sortOrder).toBe("desc");
  });
});
