export type Search = Record<string, string | string[] | undefined>;
export const periods = ["2017-10", "2017-11", "2017-12", "2018-01"];
export function queryString(search: Search, keys: string[]): string {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = search[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  return query.toString();
}
export function pageLink(search: Search, page: number): string {
  const query = new URLSearchParams(
    queryString(search, ["q", "period", "program", "state", "status", "size"]),
  );
  query.set("page", String(page));
  return `?${query}`;
}
