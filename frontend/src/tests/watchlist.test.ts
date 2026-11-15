import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  clearWatchlist
} from "../utils/watchlist";

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("Watchlist utility", () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
    clearWatchlist();
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("starts empty", () => {
    expect(getWatchlist()).toEqual([]);
  });

  it("adds countries and normalizes ISO to uppercase", () => {
    const res = addToWatchlist("ind");
    expect(res.success).toBe(true);
    expect(getWatchlist()).toEqual(["IND"]);
    expect(isInWatchlist("IND")).toBe(true);
    expect(isInWatchlist("ind")).toBe(true);
  });

  it("does not duplicate already added countries", () => {
    addToWatchlist("IND");
    const res = addToWatchlist("IND");
    expect(res.success).toBe(true);
    expect(getWatchlist()).toEqual(["IND"]);
  });

  it("enforces maximum capacity of 8 countries", () => {
    const testIsos = ["IND", "BGD", "NGA", "KEN", "ETH", "IDN", "PAK", "BRA"];
    for (const iso of testIsos) {
      const res = addToWatchlist(iso);
      expect(res.success).toBe(true);
    }
    expect(getWatchlist().length).toBe(8);

    // 9th country should fail
    const overCapacityRes = addToWatchlist("ZAF");
    expect(overCapacityRes.success).toBe(false);
    expect(overCapacityRes.message).toContain("maximum capacity reached (8 countries)");
    expect(getWatchlist().length).toBe(8);
    expect(isInWatchlist("ZAF")).toBe(false);
  });

  it("removes a country cleanly", () => {
    addToWatchlist("IND");
    addToWatchlist("BGD");
    removeFromWatchlist("IND");
    expect(getWatchlist()).toEqual(["BGD"]);
    expect(isInWatchlist("IND")).toBe(false);
  });

  it("handles localStorage exception fallback gracefully without crashing", () => {
    // Force localStorage methods to throw QuotaExceededError / SecurityError
    vi.spyOn(mockStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError or Privacy Block");
    });
    vi.spyOn(mockStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    const res = addToWatchlist("KEN");
    expect(res.success).toBe(true);
    expect(getWatchlist()).toContain("KEN");
    expect(isInWatchlist("KEN")).toBe(true);

    removeFromWatchlist("KEN");
    expect(getWatchlist()).not.toContain("KEN");
  });
});
