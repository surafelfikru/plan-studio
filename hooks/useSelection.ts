"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { truncate } from "@/lib/text";
import type { SelectionState, Tweak } from "@/types";

interface UseSelectionOptions {
  docRef: RefObject<HTMLElement | null>;
  onAddToChat: (text: string) => void;
  onFlash: (msg: string) => void;
  // draft the tweak list into the chat input & open the chat pane, mirroring the
  // legacy "submit tweaks" behavior (explicitly kept as-is per product decision).
  onDraftIntoChat: (text: string) => void;
}

export function useSelection({ docRef, onAddToChat, onFlash, onDraftIntoChat }: UseSelectionOptions) {
  const [sel, setSel] = useState<SelectionState | null>(null);
  const [tweaks, setTweaks] = useState<Tweak[]>([]);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const idCounter = useRef(0);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-sel-keep]")) return;
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      const text = selection ? String(selection).trim() : "";
      const docEl = docRef.current;
      if (!selection || !selection.rangeCount || text.length < 2 || !docEl) {
        setSel((s) => (s ? null : s));
        return;
      }
      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      if (node && node.nodeType === 3) node = node.parentNode;
      if (!node || !docEl.contains(node)) {
        setSel((s) => (s ? null : s));
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;
      const x = Math.min(window.innerWidth - 20, Math.max(140, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 90, rect.bottom + 8);
      setSel({ x, y, text, mode: "actions", draft: "" });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [docRef]);

  const selAddToChat = useCallback(() => {
    if (sel) onAddToChat(sel.text);
    setSel(null);
  }, [sel, onAddToChat]);

  const selStartTweak = useCallback(() => setSel((s) => (s ? { ...s, mode: "tweak" } : s)), []);
  const onSelDraft = useCallback((draft: string) => setSel((s) => (s ? { ...s, draft } : s)), []);
  const selCancel = useCallback(() => setSel(null), []);

  const selAddTweak = useCallback(() => {
    if (!sel) return;
    const instruction = (sel.draft || "").trim();
    if (!instruction) {
      onFlash("describe the change first");
      return;
    }
    const tweak: Tweak = { id: `tw${++idCounter.current}`, excerpt: `“${truncate(sel.text, 90)}”`, instruction };
    setTweaks((t) => [...t, tweak]);
    setSel(null);
    setTweaksOpen(true);
    onFlash("tweak added");
  }, [sel, onFlash]);

  const removeTweak = useCallback((id: string) => setTweaks((t) => t.filter((x) => x.id !== id)), []);
  const toggleTweaks = useCallback(() => setTweaksOpen((v) => !v), []);
  const clearTweaks = useCallback(() => {
    setTweaks([]);
    setTweaksOpen(false);
  }, []);

  const submitTweaks = useCallback(() => {
    if (!tweaks.length) return;
    const lines = tweaks.map((t) => `- ${t.instruction}  (${t.excerpt})`).join("\n");
    onDraftIntoChat(`Please draft edits for these tweaks:\n${lines}`);
    setTweaks([]);
    setTweaksOpen(false);
    onFlash("tweaks moved to chat input — review & send");
  }, [tweaks, onDraftIntoChat, onFlash]);

  return {
    sel,
    selAddToChat,
    selStartTweak,
    onSelDraft,
    selAddTweak,
    selCancel,
    tweaks,
    tweaksOpen,
    toggleTweaks,
    removeTweak,
    clearTweaks,
    submitTweaks,
  };
}
