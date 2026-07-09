"use client";
import { useCallback, useEffect, useState } from "react";
import type { Theme } from "@/types";

// Toggles a `.light` class on <html>; globals.css keys the whole design-token
// palette (`:root` vs `:root.light`) off this class, not prefers-color-scheme.
export function useTheme(initial: Theme = "dark") {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
