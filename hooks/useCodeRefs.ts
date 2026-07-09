"use client";
import { useEffect, useState } from "react";
import type { Section } from "@/types";

export interface CodeRefResult {
  rows?: { ln: string; code: string }[];
  error?: string;
}

export function useCodeRefs(sections: Section[], root: string | undefined, docKey: string | null) {
  const [coderefs, setCoderefs] = useState<Record<string, CodeRefResult>>({});

  useEffect(() => {
    setCoderefs({});
    let cancelled = false;

    (async () => {
      for (const sec of sections) {
        for (const b of sec.rawBlocks) {
          if (b.type !== "coderef") continue;
          if (cancelled) return;
          if (!root) {
            setCoderefs((prev) => ({ ...prev, [b.id]: { error: "no root in plan frontmatter" } }));
            continue;
          }
          try {
            const url = `/api/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(b.file)}&start=${b.start}&end=${b.end}`;
            const res = await fetch(url);
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              if (!cancelled) setCoderefs((prev) => ({ ...prev, [b.id]: { error: body.error || `HTTP ${res.status}` } }));
              continue;
            }
            const data = await res.json();
            const rows = (data.lines ?? []).map((code: string, i: number) => ({ ln: String(data.start + i), code }));
            if (!cancelled) setCoderefs((prev) => ({ ...prev, [b.id]: { rows } }));
          } catch {
            if (!cancelled) setCoderefs((prev) => ({ ...prev, [b.id]: { error: "fetch failed" } }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `docKey` triggers reset; `sections`/`root` are re-fetched together
  }, [docKey, sections, root]);

  return coderefs;
}
