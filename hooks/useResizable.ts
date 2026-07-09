"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const SIDEBAR_MIN = 208;
const SIDEBAR_MAX = 440;
const CHAT_MIN = 300;
const CHAT_MAX = 560;

export function useResizable() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [sidebarW, setSidebarW] = useState(280);
  const [chatW, setChatW] = useState(382);
  const [winW, setWinW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));

  const dragRef = useRef<{ which: "sidebar" | "chat"; startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      if (d.which === "sidebar") setSidebarW(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, d.startW + dx)));
      else setChatW(Math.min(CHAT_MAX, Math.max(CHAT_MIN, d.startW - dx)));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResizeSidebar = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { which: "sidebar", startX: e.clientX, startW: sidebarW };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarW],
  );
  const startResizeChat = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { which: "chat", startX: e.clientX, startW: chatW };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [chatW],
  );

  return {
    sidebarOpen,
    chatOpen,
    sidebarW,
    chatW,
    winW,
    toggleSidebar: useCallback(() => setSidebarOpen((v) => !v), []),
    toggleChat: useCallback(() => setChatOpen((v) => !v), []),
    openChat: useCallback(() => setChatOpen(true), []),
    startResizeSidebar,
    startResizeChat,
  };
}
