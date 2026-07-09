"use client";
import type { RefObject } from "react";
import type { PlanDoc, Section } from "@/types";
import type { DocMode } from "@/hooks/useDoc";
import type { useMermaid } from "@/hooks/useMermaid";
import type { CodeRefResult } from "@/hooks/useCodeRefs";
import type { useDiff } from "@/hooks/useDiff";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { EditorBlock } from "./blocks/EditorBlock";
import { Prose } from "./blocks/Prose";
import { MermaidBlock } from "./blocks/MermaidBlock";
import { DiffBlock } from "./blocks/DiffBlock";
import { CodeRefBlock } from "./blocks/CodeRefBlock";
import { Callout } from "./blocks/Callout";
import { Resource } from "./blocks/Resource";
import { MermaidFullscreenModal } from "./MermaidFullscreenModal";
import { Toc, type TocItem } from "./Toc";

interface DocViewProps {
  doc: PlanDoc;
  sections: Section[];
  folds: Record<string, boolean>;
  toggleFold: (id: string) => void;
  mode: DocMode;
  editingId: string | null;
  editSrc: string;
  onEditSrcChange: (v: string) => void;
  startEdit: (id: string) => void;
  cancelEdit: () => void;
  saveSection: () => void;
  activeHeading: string | null;
  gotoHeading: (id: string) => void;
  onAsk: (label: string, id: string) => void;
  onFlash: (msg: string) => void;
  mermaid: ReturnType<typeof useMermaid>;
  coderefs: Record<string, CodeRefResult>;
  diff: ReturnType<typeof useDiff>;
  docRef: RefObject<HTMLDivElement | null>;
  onDocScroll: () => void;
  tocVisible: boolean;
  lastEdit: string;
}

export function DocView({
  doc,
  sections,
  folds,
  toggleFold,
  mode,
  editingId,
  editSrc,
  onEditSrcChange,
  startEdit,
  cancelEdit,
  saveSection,
  activeHeading,
  gotoHeading,
  onAsk,
  onFlash,
  mermaid,
  coderefs,
  diff,
  docRef,
  onDocScroll,
  tocVisible,
  lastEdit,
}: DocViewProps) {
  const copyHeadingLink = (id: string) => {
    try {
      navigator.clipboard.writeText(`${location.origin}${location.pathname}?plan=${doc.slug}#${id}`);
    } catch {}
    onFlash(`copied #${id} link`);
  };

  const toc: TocItem[] = sections
    .filter((s) => s.headingLine)
    .map((s) => ({ id: s.id, label: s.title, active: s.id === activeHeading }));

  return (
    <div id="planDoc" ref={docRef} onScroll={onDocScroll} className="scroll relative flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1080px] gap-[30px] px-10 py-[38px] pb-[200px]">
        <div className="min-w-0 flex-1" style={{ maxWidth: 760 }}>
          <div className="mb-2 flex items-center gap-2.5">
            <span className="rounded-[5px] border border-border px-2 py-0.5 font-mono text-[11px] text-faint">PLAN</span>
            <span className="font-mono text-[11px] text-faint">{doc.status || "plan"}</span>
            <span className="font-mono text-[11px] text-fainter">·</span>
            <span className="font-mono text-[11px] text-fainter">last edit {lastEdit}</span>
          </div>
          <h1 className="m-0 mb-1.5 text-[31px] font-semibold leading-[1.15] tracking-[-0.02em] text-text [overflow-wrap:anywhere]">
            {doc.title}
          </h1>
          <p className="m-0 mb-7 text-[14.5px] leading-relaxed text-faint">{doc.frontmatter.summary ?? ""}</p>
          <div className="mb-1.5 h-px bg-border" />

          {sections.map((sec) => {
            const folded = !!folds[sec.id];
            return (
              <div key={sec.id}>
                {sec.headingLine && (
                  <HeadingBlock
                    id={sec.id}
                    label={sec.title}
                    folded={folded}
                    onFold={() => toggleFold(sec.id)}
                    onCopyLink={() => copyHeadingLink(sec.id)}
                    onAsk={() => onAsk(sec.title, sec.id)}
                    canEdit={mode === "edit"}
                    onEdit={() => startEdit(sec.id)}
                  />
                )}
                {!folded &&
                  (editingId === sec.id ? (
                    <EditorBlock
                      src={editSrc}
                      rows={Math.min(34, Math.max(6, editSrc.split("\n").length + 1))}
                      onInput={onEditSrcChange}
                      onSave={saveSection}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    sec.rawBlocks.map((b) => {
                      if (b.type === "prose") return <Prose key={b.id} text={sec.id === "__intro__" ? b.text.replace(/^\s*#\s+.*\r?\n?/, "") : b.text} />;
                      if (b.type === "mermaid") {
                        const st = mermaid.get(b.id);
                        return (
                          <MermaidBlock
                            key={b.id}
                            id={b.id}
                            src={b.src}
                            state={st}
                            onZoomIn={() => mermaid.zoom(b.id, 1.25)}
                            onZoomOut={() => mermaid.zoom(b.id, 0.8)}
                            onFit={() => mermaid.fit(b.id)}
                            onToggleSource={() => mermaid.toggleSource(b.id)}
                            onOpenFull={() => mermaid.openFull(b.id)}
                            onPanStart={(e) => mermaid.panStart(b.id, e)}
                            onCopy={() => {
                              try {
                                navigator.clipboard.writeText(b.src);
                              } catch {}
                              onFlash("copied mermaid source");
                            }}
                          />
                        );
                      }
                      if (b.type === "diff") {
                        const dv = diff.get(b.id);
                        return (
                          <DiffBlock
                            key={b.id}
                            file={b.file}
                            adds={b.adds}
                            dels={b.dels}
                            hunk={b.hunk}
                            rows={b.rows}
                            collapsed={dv.collapsed}
                            onToggleCollapse={() => diff.toggleCollapse(b.id)}
                            view={dv.view}
                            onSetView={(v) => {
                              diff.setView(b.id, v);
                              if (v === "split") onFlash("split view");
                            }}
                          />
                        );
                      }
                      if (b.type === "coderef") {
                        const cr = coderefs[b.id];
                        const rows = cr?.rows ?? (cr?.error ? [{ ln: "!", code: `⚠ ${cr.error}` }] : [{ ln: "…", code: `loading ${b.file} …` }]);
                        return <CodeRefBlock key={b.id} file={b.file} range={`L${b.start}–${b.end}`} note={b.note} rows={rows} />;
                      }
                      if (b.type === "callout") return <Callout key={b.id} ctype={b.ctype} text={b.text} />;
                      if (b.type === "resource") {
                        let host = b.url;
                        try {
                          host = new URL(b.url).hostname;
                        } catch {}
                        return <Resource key={b.id} url={b.url} title={b.title} host={host} />;
                      }
                      return null;
                    })
                  ))}
              </div>
            );
          })}

          {mermaid.fullId &&
            (() => {
              const st = mermaid.get(mermaid.fullId);
              return (
                <MermaidFullscreenModal
                  id={mermaid.fullId}
                  svg={st.svg}
                  zoom={st.zoom}
                  panX={st.panX}
                  panY={st.panY}
                  onPanStart={(e) => mermaid.panStart(mermaid.fullId!, e)}
                  onReset={() => mermaid.fit(mermaid.fullId!)}
                  onClose={mermaid.closeFull}
                />
              );
            })()}
        </div>

        <Toc items={toc} visible={tocVisible} onClick={gotoHeading} />
      </div>
    </div>
  );
}
