const STORAGE_KEY = "nutrition_atlas_watchlist";
const MAX_WATCHLIST_SIZE = 8;

// Fallback in-memory storage if localStorage is blocked or throws
let memoryWatchlist: string[] = [];

export function getWatchlist(): string[] {
  try {
    if (typeof localStorage === "undefined") return memoryWatchlist;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryWatchlist;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_WATCHLIST_SIZE);
    }
    return memoryWatchlist;
  } catch {
    return memoryWatchlist;
  }
}

export function addToWatchlist(iso3: string): { success: boolean; message?: string } {
  const cleanIso = iso3.trim().toUpperCase();
  const current = getWatchlist();
  
  if (current.includes(cleanIso)) {
    return { success: true };
  }
  
  if (current.length >= MAX_WATCHLIST_SIZE) {
    return {
      success: false,
      message: `Watchlist maximum capacity reached (${MAX_WATCHLIST_SIZE} countries). Remove a country to add another.`
    };
  }
  
  const updated = [...current, cleanIso];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    memoryWatchlist = updated;
  } catch {
    memoryWatchlist = updated;
  }
  return { success: true };
}

export function removeFromWatchlist(iso3: string): void {
  const cleanIso = iso3.trim().toUpperCase();
  const current = getWatchlist();
  const updated = current.filter((x) => x !== cleanIso);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    memoryWatchlist = updated;
  } catch {
    memoryWatchlist = updated;
  }
}

export function isInWatchlist(iso3: string): boolean {
  const cleanIso = iso3.trim().toUpperCase();
  return getWatchlist().includes(cleanIso);
}

export function clearWatchlist(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    memoryWatchlist = [];
  } catch {
    memoryWatchlist = [];
  }
}
