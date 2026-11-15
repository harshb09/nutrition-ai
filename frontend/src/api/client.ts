import {
  CountrySummary,
  CountryDetail,
  PeerCountry,
  CountryTrends,
  GroupSummary,
  DatasetMetadata,
  MethodologyData
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export class ApiColdStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiColdStartError";
  }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchWithRetry<T>(
  endpoint: string,
  onRetry?: (elapsedSeconds: number) => void,
  maxRetrySeconds: number = 60,
  retryIntervalMs: number = 2500
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const startTime = Date.now();

  while (true) {
    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      // If server cold start error 502/503/504
      if ([502, 503, 504].includes(response.status)) {
        throw new ApiColdStartError("Server starting up");
      }

      if (response.status === 404) {
        const errJson = await response.json().catch(() => ({}));
        throw new HttpError(404, errJson.detail || "Resource not found (404)");
      }

      if (response.status >= 400 && response.status < 500) {
        throw new HttpError(response.status, `Client error: ${response.status} ${response.statusText}`);
      }

      throw new Error(`API error: ${response.status} ${response.statusText}`);
    } catch (err: any) {
      if (err instanceof HttpError) {
        throw err;
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= maxRetrySeconds) {
        throw new Error(
          `Unable to connect to the Nutrition Atlas API after ${elapsed}s. ` +
          "Please check your internet connection or verify the backend server is running."
        );
      }

      if (onRetry) {
        onRetry(elapsed);
      }

      // Sleep before retry
      await new Promise((res) => setTimeout(res, retryIntervalMs));
    }
  }
}

export const api = {
  getHealth: () => fetchWithRetry<{ status: string }>("/api/health"),
  
  getMetadata: (onRetry?: (sec: number) => void) =>
    fetchWithRetry<DatasetMetadata>("/api/meta", onRetry),

  getCountries: (
    params?: { group_id?: string; status?: string; search?: string },
    onRetry?: (sec: number) => void
  ) => {
    const q = new URLSearchParams();
    if (params?.group_id) q.set("group_id", params.group_id);
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return fetchWithRetry<CountrySummary[]>(`/api/countries${qs}`, onRetry);
  },

  getCountry: (iso3: string, onRetry?: (sec: number) => void) =>
    fetchWithRetry<CountryDetail>(`/api/countries/${encodeURIComponent(iso3.toUpperCase())}`, onRetry),

  getCountryPeers: (iso3: string, onRetry?: (sec: number) => void) =>
    fetchWithRetry<PeerCountry[]>(`/api/countries/${encodeURIComponent(iso3.toUpperCase())}/peers`, onRetry),

  getCountryTrends: (iso3: string, onRetry?: (sec: number) => void) =>
    fetchWithRetry<CountryTrends>(`/api/countries/${encodeURIComponent(iso3.toUpperCase())}/trends`, onRetry),

  getGroups: (onRetry?: (sec: number) => void) =>
    fetchWithRetry<GroupSummary[]>("/api/groups", onRetry),

  getGroup: (id: string, onRetry?: (sec: number) => void) =>
    fetchWithRetry<GroupSummary>(`/api/groups/${encodeURIComponent(id.toUpperCase())}`, onRetry),

  getMethodology: (onRetry?: (sec: number) => void) =>
    fetchWithRetry<MethodologyData>("/api/methodology", onRetry),

  getPdfBriefUrl: (iso3: string) =>
    `${API_BASE}/api/countries/${encodeURIComponent(iso3.toUpperCase())}/brief.pdf`,

  getDatasetCsvUrl: () => `${API_BASE}/api/dataset.csv`
};
