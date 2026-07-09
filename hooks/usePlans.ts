"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanMeta } from "@/types";

export interface PlanListItem extends PlanMeta {
  meta: string;
  ver: string;
}

export interface PlanGroup {
  label: string;
  count: number;
  items: PlanListItem[];
}

type DayLabel = "TODAY" | "YESTERDAY" | "EARLIER";
const GROUP_ORDER: Record<DayLabel, number> = { TODAY: 0, YESTERDAY: 1, EARLIER: 2 };

function dayLabel(ms: number): DayLabel {
  const d = new Date(ms);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "TODAY";
  if (diff === 1) return "YESTERDAY";
  return "EARLIER";
}

function timeLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (dayLabel(ms) === "EARLIER") return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function usePlans() {
  const [plans, setPlans] = useState<PlanMeta[]>([]);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch {
      // transient network hiccup; useLiveReload / next poll will recover it
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groups = useMemo<PlanGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const byGroup = new Map<DayLabel, PlanListItem[]>();
    for (const p of plans) {
      if (q && !p.title.toLowerCase().includes(q)) continue;
      const label = dayLabel(p.mtimeMs);
      const item: PlanListItem = {
        ...p,
        meta: `${p.status ? `${p.status} · ` : ""}edited ${timeLabel(p.mtimeMs)}`,
        // short badge tag: first token of status, so a long descriptive status
        // (e.g. "implemented — 2 manual runtime steps remain") can't overflow it.
        ver: p.status ? p.status.split(/[\s—-]/)[0]! : "md",
      };
      const bucket = byGroup.get(label);
      if (bucket) bucket.push(item);
      else byGroup.set(label, [item]);
    }
    return [...byGroup.entries()]
      .sort((a, b) => GROUP_ORDER[a[0]] - GROUP_ORDER[b[0]])
      .map(([label, items]) => ({ label, count: items.length, items }));
  }, [plans, query]);

  return { plans, groups, planCount: plans.length, query, setQuery, refresh };
}
