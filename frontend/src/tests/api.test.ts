import { describe, it, expect, vi } from "vitest";
import { fetchWithRetry } from "../api/client";

describe("API Client & Error Handling", () => {
  it("successfully parses valid JSON response", async () => {
    const mockData = { status: "ok" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    }) as any;

    const res = await fetchWithRetry("/api/health");
    expect(res).toEqual(mockData);
  });

  it("handles 404 immediately with parsed detail message without retry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ detail: "Country with ISO3 'XYZ' not found" })
    }) as any;

    await expect(fetchWithRetry("/api/countries/XYZ")).rejects.toThrow(
      "Country with ISO3 'XYZ' not found"
    );
  });

  it("triggers retry callback when receiving 503 gateway cold start", async () => {
    let callCount = 0;
    const retryCalls: number[] = [];

    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: "Service Unavailable"
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: "ready" })
      });
    }) as any;

    const res = await fetchWithRetry(
      "/api/health",
      (elapsed) => retryCalls.push(elapsed),
      10,
      20 // Fast 20ms retry for test
    );

    expect(callCount).toBe(2);
    expect(retryCalls.length).toBe(1);
    expect(res).toEqual({ status: "ready" });
  });
});
