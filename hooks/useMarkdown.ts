"use client";
import { useEffect, useState } from "react";

// Lazy singleton imports: marked/DOMPurify must never run during SSR (DOMPurify
// expects a real `window`), so markdown->HTML is computed client-side only.
let markedPromise: Promise<typeof import("marked")> | null = null;
let purifyPromise: Promise<typeof import("dompurify")> | null = null;
function loadMarked() {
  markedPromise ??= import("marked");
  return markedPromise;
}
function loadPurify() {
  purifyPromise ??= import("dompurify");
  return purifyPromise;
}

export function useMarkdown(src: string): string {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ marked }, purifyMod] = await Promise.all([loadMarked(), loadPurify()]);
        const DOMPurify = purifyMod.default;
        marked.setOptions({ breaks: false, gfm: true });
        const raw = await marked.parse(src || "");
        const clean = DOMPurify.sanitize(raw);
        if (!cancelled) setHtml(clean);
      } catch {
        if (!cancelled) setHtml("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return html;
}
