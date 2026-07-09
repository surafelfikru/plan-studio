"use client";
import { useCallback, useState } from "react";

export interface DiffViewState {
  view: "unified" | "split";
  collapsed: boolean;
}

const DEFAULT: DiffViewState = { view: "unified", collapsed: false };

export function useDiff() {
  const [diffs, setDiffs] = useState<Record<string, DiffViewState>>({});

  const get = useCallback((id: string): DiffViewState => diffs[id] ?? DEFAULT, [diffs]);

  const setView = useCallback((id: string, view: DiffViewState["view"]) => {
    setDiffs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT), view } }));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setDiffs((prev) => {
      const cur = prev[id] ?? DEFAULT;
      return { ...prev, [id]: { ...cur, collapsed: !cur.collapsed } };
    });
  }, []);

  return { get, setView, toggleCollapse };
}
