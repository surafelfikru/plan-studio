import { describe, expect, test } from "bun:test";
import { splitSections, findBlock } from "./markdown";

describe("splitSections", () => {
  test("splits an intro + headed sections, slugifying titles", () => {
    const body = "Intro text.\n\n## First Section\nBody one.\n\n## First Section\nDupe title.\n";
    const sections = splitSections(body);
    expect(sections.map((s) => s.id)).toEqual(["__intro__", "first-section", "first-section-2"]);
    expect(sections[0]!.body.trim()).toBe("Intro text.");
    expect(sections[1]!.title).toBe("First Section");
    expect(sections[2]!.body.trim()).toBe("Dupe title.");
  });

  test("ignores level-1 headings (only ## through ######)", () => {
    const sections = splitSections("# Title\nintro\n## Real section\nbody\n");
    expect(sections[0]!.body).toContain("# Title");
    expect(sections.some((s) => s.id === "real-section")).toBe(true);
  });
});

describe("parseBlocks (via splitSections)", () => {
  test("parses a mermaid block", () => {
    const sec = splitSections("## Diagram\n```mermaid\nflowchart LR\nA-->B\n```\n")[1];
    const mm = sec!.rawBlocks.find((b) => b.type === "mermaid");
    expect(mm).toBeDefined();
    if (mm?.type === "mermaid") expect(mm.src).toBe("flowchart LR\nA-->B");
  });

  test("parses a callout block with meta + defaults ctype to note", () => {
    const sec = splitSections("## X\n```callout\ntype: gotcha\nWatch out.\n```\n")[1];
    const callout = sec!.rawBlocks.find((b) => b.type === "callout");
    expect(callout).toBeDefined();
    if (callout?.type === "callout") {
      expect(callout.ctype).toBe("gotcha");
      expect(callout.text).toBe("Watch out.");
    }
  });

  test("parses a resource block, defaulting title to url", () => {
    const sec = splitSections("## X\n```resource\nurl: https://example.com\n```\n")[1];
    const r = sec!.rawBlocks.find((b) => b.type === "resource");
    if (r?.type === "resource") {
      expect(r.url).toBe("https://example.com");
      expect(r.title).toBe("https://example.com");
    } else throw new Error("expected resource block");
  });

  test("parses a code-ref block's line range", () => {
    const sec = splitSections("## X\n```code-ref\nfile: lib/foo.ts\nlines: 10-20\n```\n")[1];
    const cr = sec!.rawBlocks.find((b) => b.type === "coderef");
    if (cr?.type === "coderef") {
      expect(cr.file).toBe("lib/foo.ts");
      expect(cr.start).toBe(10);
      expect(cr.end).toBe(20);
    } else throw new Error("expected coderef block");
  });

  test("interleaves prose blocks around fenced blocks", () => {
    const sec = splitSections("## X\nBefore.\n```callout\nnote\n```\nAfter.\n")[1];
    const types = sec!.rawBlocks.map((b) => b.type);
    expect(types).toEqual(["prose", "callout", "prose"]);
  });
});

describe("plan-diff parsing", () => {
  test("counts adds/dels and assigns line numbers only to context/added lines", () => {
    const src = [
      "## X",
      "```plan-diff",
      "file: a.ts",
      "@@ -1,3 +1,4 @@",
      " unchanged",
      "+added line",
      "-removed line",
      "```",
      "",
    ].join("\n");
    const sec = splitSections(src)[1];
    const diff = sec!.rawBlocks.find((b) => b.type === "diff");
    if (diff?.type !== "diff") throw new Error("expected diff block");
    expect(diff.file).toBe("a.ts");
    expect(diff.adds).toBe("+1");
    expect(diff.dels).toBe("−1");
    expect(diff.rows).toEqual([
      { ln: "1", sgn: " ", code: "unchanged" },
      { ln: "2", sgn: "+", code: "added line" },
      { ln: "", sgn: "-", code: "removed line" },
    ]);
  });

  test("defaults hunk/file when omitted", () => {
    const sec = splitSections("## X\n```plan-diff\n+only an add\n```\n")[1];
    const diff = sec!.rawBlocks.find((b) => b.type === "diff");
    if (diff?.type !== "diff") throw new Error("expected diff block");
    expect(diff.file).toBe("(file)");
    expect(diff.hunk).toBe("@@  @@");
  });
});

describe("findBlock", () => {
  test("locates a block by id across sections", () => {
    const sections = splitSections("## X\n```mermaid\nA\n```\n");
    const id = sections[1]!.rawBlocks[0]!.id;
    expect(findBlock(sections, id)).not.toBeNull();
    expect(findBlock(sections, "nope")).toBeNull();
  });
});
