"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useResizable } from "@/hooks/useResizable";
import { useToast } from "@/hooks/useToast";
import { usePlans } from "@/hooks/usePlans";
import { useDoc } from "@/hooks/useDoc";
import { useMermaid } from "@/hooks/useMermaid";
import { useCodeRefs } from "@/hooks/useCodeRefs";
import { useDiff } from "@/hooks/useDiff";
import { useChat } from "@/hooks/useChat";
import { useSelection } from "@/hooks/useSelection";
import { useLiveReload } from "@/hooks/useLiveReload";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Toolbar } from "@/components/Toolbar";
import { DocView } from "@/components/DocView";
import { ChatPane } from "@/components/ChatPane";
import { StatusBar } from "@/components/StatusBar";
import { SelectionPopover } from "@/components/SelectionPopover";
import { TweakTray } from "@/components/TweakTray";
import { Toast } from "@/components/Toast";
import { PanelResizer } from "@/components/PanelResizer";

export default function Page() {
  const theme = useTheme();
  const resizable = useResizable();
  const { toast, flash } = useToast();
  const plans = usePlans();

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const doc = useDoc(activeSlug, docRef, { onFlash: flash });

  const selectPlan = useCallback((slug: string) => {
    setActiveSlug(slug);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("plan", slug);
      history.replaceState(null, "", u);
    } catch {}
  }, []);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !plans.plans.length) return;
    initializedRef.current = true;
    let want: string | null = null;
    try {
      want = new URL(window.location.href).searchParams.get("plan");
    } catch {}
    const slug = want || plans.plans[0]?.slug;
    if (slug) selectPlan(slug);
  }, [plans.plans, selectPlan]);

  useLiveReload((slug) => {
    plans.refresh();
    if (!doc.editingId && activeSlug && (!slug || slug === activeSlug)) {
      doc.load(activeSlug, true);
    }
  });

  const root = doc.doc?.frontmatter.root || doc.doc?.root;
  const mermaid = useMermaid(doc.sections, theme.theme, activeSlug);
  const coderefs = useCodeRefs(doc.sections, root, activeSlug);
  const diff = useDiff();

  const chat = useChat(activeSlug, { onFlash: flash, onOpenChat: resizable.openChat });
  const selection = useSelection({
    docRef,
    onFlash: flash,
    onAddToChat: (text) => chat.addContext("text", text),
    onDraftIntoChat: (text) => chat.appendToInput(text),
  });

  const onAsk = useCallback(
    (label: string, id: string) => {
      doc.gotoHeading(id);
      chat.addContext("section", label);
    },
    [doc, chat],
  );

  const dimSide = resizable.sidebarOpen ? resizable.sidebarW : 0;
  const dimChat = resizable.chatOpen ? resizable.chatW : 0;
  const tocVisible = resizable.winW - dimSide - dimChat > 720;
  const planFile = activeSlug ? `${activeSlug}.md` : "—";
  const sectionsCount = doc.sections.filter((s) => s.headingLine).length;

  return (
    <div className={theme.theme === "light" ? "pa-light" : ""} style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      <TopBar planFile={planFile} theme={theme.theme} toggleTheme={theme.toggleTheme} toggleSidebar={resizable.toggleSidebar} toggleChat={resizable.toggleChat} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex flex-none flex-col overflow-hidden border-r border-border bg-panel transition-[width,flex-basis] duration-150 ease-in-out"
          style={{ width: dimSide, flexBasis: dimSide }}
        >
          <div style={{ width: resizable.sidebarW, height: "100%", display: "flex", flexDirection: "column" }}>
            <Sidebar
              groups={plans.groups}
              activeSlug={activeSlug}
              planQuery={plans.query}
              onQueryChange={plans.setQuery}
              onSelect={selectPlan}
              planCount={plans.planCount}
            />
          </div>
        </div>
        {resizable.sidebarOpen && <PanelResizer onMouseDown={resizable.startResizeSidebar} />}

        <div className="flex min-w-0 flex-1 flex-col bg-bg">
          <Toolbar
            planTitle={doc.doc ? doc.doc.title : "Loading…"}
            dirty={doc.dirty}
            mode={doc.mode}
            onSetRead={doc.setReadMode}
            onSetEdit={doc.setEditMode}
            onReload={doc.reload}
            onExport={() => {
              try {
                navigator.clipboard.writeText(doc.doc?.content ?? "");
              } catch {}
              flash("copied markdown to clipboard");
            }}
            onOpenEditor={() => flash(`file: ~/.claude/plans/${activeSlug || ""}.md`)}
          />
          {doc.doc ? (
            <DocView
              doc={doc.doc}
              sections={doc.sections}
              folds={doc.folds}
              toggleFold={doc.toggleFold}
              mode={doc.mode}
              editingId={doc.editingId}
              editSrc={doc.editSrc}
              onEditSrcChange={doc.onEditSrcChange}
              startEdit={doc.startEdit}
              cancelEdit={doc.cancelEdit}
              saveSection={doc.saveSection}
              activeHeading={doc.activeHeading}
              gotoHeading={doc.gotoHeading}
              onAsk={onAsk}
              onFlash={flash}
              mermaid={mermaid}
              coderefs={coderefs}
              diff={diff}
              docRef={docRef}
              onDocScroll={doc.onDocScroll}
              tocVisible={tocVisible}
              lastEdit={doc.lastSaved}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center font-mono text-[12px] text-faint">
              {plans.plans.length ? "select a plan" : "no plans yet in ~/.claude/plans"}
            </div>
          )}
        </div>

        {resizable.chatOpen && <PanelResizer onMouseDown={resizable.startResizeChat} />}
        <div
          className="flex flex-none flex-col overflow-hidden border-l border-border bg-panel transition-[width,flex-basis] duration-150 ease-in-out"
          style={{ width: dimChat, flexBasis: dimChat }}
        >
          <div style={{ width: resizable.chatW, height: "100%", display: "flex", flexDirection: "column" }}>
            <ChatPane
              messages={chat.messages}
              sending={chat.sending}
              chatInput={chat.chatInput}
              onChatInputChange={chat.setChatInput}
              onSend={chat.send}
              contexts={chat.contexts}
              onRemoveContext={chat.removeContext}
              model={chat.model}
              onSelectModel={(id) => {
                chat.setModel(id);
                chat.setModelOpen(false);
              }}
              modelOpen={chat.modelOpen}
              onToggleModelMenu={() => chat.setModelOpen((v) => !v)}
              planFile={planFile}
              sectionsCount={sectionsCount}
            />
          </div>
        </div>
      </div>

      <StatusBar planFile={planFile} dirty={doc.dirty} lastSaved={doc.lastSaved} errors={mermaid.errors} wordCount={doc.wordCount} />

      {selection.sel && (
        <SelectionPopover
          sel={selection.sel}
          onAddToChat={selection.selAddToChat}
          onStartTweak={selection.selStartTweak}
          onDraftChange={selection.onSelDraft}
          onAddTweak={selection.selAddTweak}
          onCancel={selection.selCancel}
        />
      )}

      <TweakTray
        tweaks={selection.tweaks}
        open={selection.tweaksOpen}
        onToggle={selection.toggleTweaks}
        onRemove={selection.removeTweak}
        onClear={selection.clearTweaks}
        onSubmit={selection.submitTweaks}
      />

      <Toast message={toast} />
    </div>
  );
}
