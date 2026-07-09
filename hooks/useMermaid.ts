"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { findBlock } from "@/lib/markdown";
import type { Section, Theme } from "@/types";

export interface MermaidState {
  view: "rendered" | "source";
  zoom: number;
  panX: number;
  panY: number;
  svg: string;
}

const DEFAULT_STATE: MermaidState = { view: "rendered", zoom: 1, panX: 0, panY: 0, svg: "" };

function darkTheme() {
  return {
    background: "transparent", primaryColor: "#161b22", primaryBorderColor: "#6a737d", primaryTextColor: "#f0f6fc",
    secondaryColor: "#13181f", tertiaryColor: "#0f141a", lineColor: "#9aa5b1",
    mainBkg: "#161b22", nodeBkg: "#161b22", nodeBorder: "#6a737d",
    textColor: "#e6edf3", secondaryTextColor: "#e6edf3", tertiaryTextColor: "#e6edf3", titleColor: "#f0f6fc",
    nodeTextColor: "#f0f6fc", actorTextColor: "#f0f6fc", signalTextColor: "#e6edf3", labelTextColor: "#f0f6fc", loopTextColor: "#e6edf3", classText: "#f0f6fc",
    actorBkg: "#161b22", actorBorder: "#6a737d", labelBoxBkgColor: "#13181f", labelBoxBorderColor: "#444c56",
    activationBkgColor: "#1f262e", activationBorderColor: "#6a737d",
    noteBkgColor: "#222b35", noteTextColor: "#f0f6fc", noteBorderColor: "#6a737d",
    edgeLabelBackground: "#0f141a", clusterBkg: "#0f141a", clusterBorder: "#444c56",
    fontFamily: "Geist Mono, monospace", fontSize: "13px",
  };
}
function lightTheme() {
  return {
    background: "transparent", primaryColor: "#eaeef2", primaryBorderColor: "#8c959f", primaryTextColor: "#1f2328",
    secondaryColor: "#dde3ea", tertiaryColor: "#f0f3f6", lineColor: "#57606a",
    mainBkg: "#eaeef2", nodeBkg: "#eaeef2", nodeBorder: "#8c959f",
    textColor: "#1f2328", secondaryTextColor: "#1f2328", tertiaryTextColor: "#1f2328", titleColor: "#1f2328",
    nodeTextColor: "#1f2328", actorTextColor: "#1f2328", signalTextColor: "#1f2328", labelTextColor: "#1f2328", loopTextColor: "#1f2328", classText: "#1f2328",
    actorBkg: "#eaeef2", actorBorder: "#8c959f", labelBoxBkgColor: "#dde3ea", labelBoxBorderColor: "#8c959f",
    activationBkgColor: "#dde3ea", activationBorderColor: "#8c959f",
    noteBkgColor: "#fff8c5", noteTextColor: "#1f2328", noteBorderColor: "#d4a72c",
    edgeLabelBackground: "#ffffff", clusterBkg: "#f0f3f6", clusterBorder: "#8c959f",
    fontFamily: "Geist Mono, monospace", fontSize: "13px",
  };
}

// Lazy singleton import: mermaid touches window/document at module init, so it
// must never load during SSR. Loaded once, re-initialized whenever the theme changes.
let mermaidModPromise: Promise<typeof import("mermaid")> | null = null;
function loadMermaid() {
  mermaidModPromise ??= import("mermaid");
  return mermaidModPromise;
}

function clampZoom(z: number): number {
  return Math.min(40, Math.max(0.1, +z.toFixed(3)));
}

export function useMermaid(sections: Section[], theme: Theme, docKey: string | null) {
  const [mm, setMm] = useState<Record<string, MermaidState>>({});
  const [errors, setErrors] = useState(0);
  const [fullId, setFullId] = useState<string | null>(null);
  const panningRef = useRef<{ id: string; sx: number; sy: number; bx: number; by: number } | null>(null);

  const get = useCallback((id: string): MermaidState => mm[id] ?? DEFAULT_STATE, [mm]);
  const patch = useCallback((id: string, next: Partial<MermaidState>) => {
    setMm((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_STATE), ...next } }));
  }, []);

  const renderOne = useCallback(
    async (id: string, src: string) => {
      try {
        const { default: mermaid } = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: theme === "light" ? lightTheme() : darkTheme(),
        });
        const renderId = `mmd_${id}_${Math.floor(Math.random() * 1e6)}`;
        const res = await mermaid.render(renderId, src);
        patch(id, { svg: res.svg });
      } catch {
        setErrors((n) => n + 1);
        patch(id, { svg: "" });
      }
    },
    [theme, patch],
  );

  const renderAll = useCallback(() => {
    for (const sec of sections) {
      for (const b of sec.rawBlocks) {
        if (b.type !== "mermaid") continue;
        const view = mm[b.id]?.view ?? "rendered";
        if (view === "rendered") renderOne(b.id, b.src);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally not depending on `mm` (avoid render loop); re-runs on doc/theme change only
  }, [sections, renderOne]);

  // New document: reset all mermaid state, then render.
  useEffect(() => {
    setMm({});
    setErrors(0);
    renderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, sections]);

  // Theme change: keep view/zoom, clear cached svg, re-render.
  const prevTheme = useRef(theme);
  useEffect(() => {
    if (prevTheme.current === theme) return;
    prevTheme.current = theme;
    setMm((prev) => {
      const next: Record<string, MermaidState> = {};
      for (const [id, s] of Object.entries(prev)) next[id] = { ...s, svg: "" };
      return next;
    });
    setErrors(0);
    renderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const zoom = useCallback(
    (id: string, factor: number) => patch(id, { zoom: clampZoom(get(id).zoom * factor) }),
    [get, patch],
  );
  const fit = useCallback((id: string) => patch(id, { zoom: 1, panX: 0, panY: 0 }), [patch]);

  const panStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      const c = get(id);
      panningRef.current = { id, sx: e.clientX, sy: e.clientY, bx: c.panX, by: c.panY };
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [get],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = panningRef.current;
      if (!p) return;
      patch(p.id, { panX: p.bx + (e.clientX - p.sx), panY: p.by + (e.clientY - p.sy) });
    };
    const onUp = () => {
      if (!panningRef.current) return;
      panningRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const vp = target?.closest<HTMLElement>(".mm-viewport");
      if (!vp) return;
      e.preventDefault();
      const id = vp.getAttribute("data-mm-id");
      if (!id) return;
      const rect = vp.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const c = get(id);
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const z2 = clampZoom(c.zoom * factor);
      const k = z2 / c.zoom;
      patch(id, { zoom: z2, panX: cx - (cx - c.panX) * k, panY: cy - (cy - c.panY) * k });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, [get, patch]);

  const toggleSource = useCallback(
    (id: string) => {
      const current = get(id);
      const nextView = current.view === "source" ? "rendered" : "source";
      patch(id, { view: nextView });
      if (nextView === "rendered" && !current.svg) {
        const block = findBlock(sections, id);
        if (block?.type === "mermaid") renderOne(id, block.src);
      }
    },
    [get, patch, sections, renderOne],
  );

  const openFull = useCallback(
    (id: string) => {
      setFullId(id);
      const block = findBlock(sections, id);
      if (block?.type === "mermaid" && !get(id).svg) renderOne(id, block.src);
    },
    [sections, get, renderOne],
  );
  const closeFull = useCallback(() => setFullId(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullId) setFullId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullId]);

  return { get, zoom, fit, panStart, toggleSource, openFull, closeFull, fullId, errors };
}
