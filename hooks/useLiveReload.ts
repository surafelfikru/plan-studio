"use client";
import { useEffect, useRef } from "react";

type Handler = (slug: string | null) => void;

// Subscribes to the server's SSE live-reload feed and invokes `onPlansChanged`
// whenever a plan file changes on disk (slug is null when unknown, e.g. a new file).
export function useLiveReload(onPlansChanged: Handler) {
  const handlerRef = useRef(onPlansChanged);
  handlerRef.current = onPlansChanged;

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("plans-changed", (e) => {
        let data: { slug?: string | null } = {};
        try {
          data = JSON.parse((e as MessageEvent).data || "{}");
        } catch {}
        handlerRef.current(data.slug ?? null);
      });
    } catch {}
    return () => es?.close();
  }, []);
}
