export function truncate(text: string, n: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}
