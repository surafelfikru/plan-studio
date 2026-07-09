"use client";
import { useMarkdown } from "@/hooks/useMarkdown";

export function Prose({ text }: { text: string }) {
  const html = useMarkdown(text);
  return <div className="md my-0.5 mb-2" dangerouslySetInnerHTML={{ __html: html }} />;
}
