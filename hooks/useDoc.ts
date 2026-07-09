"use client";
import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { splitSections } from "@/lib/markdown";
import type { PlanDoc, Section } from "@/types";

function nowLabel(): string {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}

export type DocMode = "read" | "edit";

interface UseDocOptions {
  onFlash: (msg: string) => void;
}

// Owns the active plan document: fetch/parse into sections, section folding,
// section-level inline editing (with optimistic-concurrency save), and
// scroll-spy/gotoHeading against the caller's scroll container ref.
export function useDoc(slug: string | null, docRef: RefObject<HTMLDivElement | null>, { onFlash }: UseDocOptions) {
  const [doc, setDoc] = useState<PlanDoc | null>(null);
  const [fmPrefix, setFmPrefix] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [folds, setFolds] = useState<Record<string, boolean>>({});
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [mode, setMode] = useState<DocMode>("read");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSrc, setEditSrc] = useState("");
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState("—");

  const load = useCallback(
    async (targetSlug: string, quiet = false) => {
      try {
        const res = await fetch(`/api/plans/${encodeURIComponent(targetSlug)}`);
        if (!res.ok) {
          if (!quiet) onFlash("plan not found");
          return;
        }
        const nextDoc: PlanDoc = await res.json();
        const body = nextDoc.body || "";
        const prefix =
          nextDoc.content.length >= body.length ? nextDoc.content.slice(0, nextDoc.content.length - body.length) : "";
        const nextSections = splitSections(body);
        const first = nextSections.find((s) => s.headingLine);
        setDoc(nextDoc);
        setFmPrefix(prefix);
        setSections(nextSections);
        setFolds({});
        setEditingId(null);
        setDirty(false);
        setLastSaved(nowLabel());
        setActiveHeading(first ? first.id : null);
        if (docRef.current) docRef.current.scrollTop = 0;
      } catch {
        onFlash("failed to load plan");
      }
    },
    [docRef, onFlash],
  );

  useEffect(() => {
    if (slug) load(slug);
    else {
      setDoc(null);
      setSections([]);
    }
  }, [slug, load]);

  const reload = useCallback(() => {
    if (slug) {
      load(slug, true);
      onFlash("reloaded from disk");
    }
  }, [slug, load, onFlash]);

  const toggleFold = useCallback((id: string) => {
    setFolds((f) => ({ ...f, [id]: !f[id] }));
  }, []);

  const gotoHeading = useCallback(
    (id: string) => {
      const container = docRef.current;
      const heading = document.getElementById(id);
      if (container && heading) {
        container.scrollTo({ top: Math.max(0, heading.offsetTop - container.offsetTop - 18), behavior: "smooth" });
      }
    },
    [docRef],
  );

  const onDocScroll = useCallback(() => {
    const container = docRef.current;
    if (!container) return;
    const ids = sections.filter((s) => s.headingLine).map((s) => s.id);
    let current = ids[0];
    for (const id of ids) {
      const heading = document.getElementById(id);
      if (heading && heading.offsetTop - container.offsetTop - container.scrollTop < 140) current = id;
    }
    if (current && current !== activeHeading) setActiveHeading(current);
  }, [sections, activeHeading, docRef]);

  const startEdit = useCallback(
    (id: string) => {
      const sec = sections.find((s) => s.id === id);
      if (!sec) return;
      setEditingId(id);
      setEditSrc(sec.body);
      setMode("edit");
    },
    [sections],
  );
  const cancelEdit = useCallback(() => setEditingId(null), []);
  const onEditSrcChange = useCallback((src: string) => {
    setEditSrc(src);
    setDirty(true);
  }, []);

  const saveSection = useCallback(async () => {
    if (!editingId || !doc || !slug) return;
    const nextSections = sections.map((s) => (s.id === editingId ? { ...s, body: editSrc } : s));
    const body = nextSections.map((s) => (s.headingLine ? `${s.headingLine}\n${s.body}` : s.body)).join("");
    const content = fmPrefix + body;
    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "content-type": "text/plain", "x-base-version": doc.version ?? "" },
        body: content,
      });
      if (res.status === 409) {
        onFlash("conflict — file changed on disk; reloading");
        load(slug, true);
        return;
      }
      if (!res.ok) {
        onFlash("save failed");
        return;
      }
      setEditingId(null);
      setDirty(false);
      setLastSaved(nowLabel());
      onFlash("section saved to ~/.claude/plans");
      load(slug, true);
    } catch {
      onFlash("save failed");
    }
  }, [editingId, doc, slug, sections, editSrc, fmPrefix, onFlash, load]);

  const wordCount = useMemo(() => (doc ? (doc.body || "").split(/\s+/).filter(Boolean).length : 0), [doc]);

  const setReadMode = useCallback(() => {
    setMode("read");
    setEditingId(null);
  }, []);
  const setEditMode = useCallback(() => setMode("edit"), []);

  return {
    doc,
    fmPrefix,
    sections,
    folds,
    toggleFold,
    activeHeading,
    gotoHeading,
    onDocScroll,
    load,
    mode,
    setReadMode,
    setEditMode,
    editingId,
    editSrc,
    startEdit,
    cancelEdit,
    onEditSrcChange,
    saveSection,
    dirty,
    lastSaved,
    reload,
    wordCount,
  };
}
