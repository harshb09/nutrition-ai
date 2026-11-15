export interface FilterState {
  country?: string;
  region?: string;
  income?: string;
  group?: string;
  doubleBurden?: boolean;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}

export function parseUrlFilters(searchParams: URLSearchParams): FilterState {
  const country = searchParams.get("country") || undefined;
  const region = searchParams.get("region") || undefined;
  const income = searchParams.get("income") || undefined;
  const group = searchParams.get("group") || undefined;
  const dbRaw = searchParams.get("double_burden");
  const doubleBurden = dbRaw === "true" ? true : dbRaw === "false" ? false : undefined;
  const sortBy = searchParams.get("sort_by") || undefined;
  const sortOrder = searchParams.get("sort_order") || undefined;
  const search = searchParams.get("search") || undefined;

  return {
    country: country ? country.toUpperCase() : undefined,
    region,
    income,
    group,
    doubleBurden,
    sortBy,
    sortOrder,
    search
  };
}

export function encodeUrlFilters(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.region) params.set("region", filters.region);
  if (filters.income) params.set("income", filters.income);
  if (filters.group) params.set("group", filters.group);
  if (filters.doubleBurden !== undefined) params.set("double_burden", String(filters.doubleBurden));
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortOrder) params.set("sort_order", filters.sortOrder);
  if (filters.search) params.set("search", filters.search);
  const str = params.toString();
  return str ? `?${str}` : "";
}
