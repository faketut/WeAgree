"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// SECURITY: do not add rehype-raw or any HTML-passthrough plugin here.
// Agreement content is fully attacker-controllable; raw HTML would enable XSS.
//
/**
 * Renders Markdown with GFM. Editorial Legal prose:
 *  - Serif headings (Source Serif 4)
 *  - Hairline-ruled blockquotes (left rule, no fill)
 *  - Monospace code on a parchment tint
 *  - Tighter leading on body for printed-page feel
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div
      className={[
        "prose prose-sm max-w-none dark:prose-invert",
        // Headings: serif, ink, tight tracking
        "prose-headings:font-serif prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
        // Body
        "prose-p:leading-relaxed prose-p:text-foreground/90",
        "prose-strong:text-foreground prose-strong:font-semibold",
        // Links: ink underline, oxblood on hover
        "prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:text-primary hover:prose-a:decoration-primary",
        // Blockquote: hairline left rule, italic ink, no fill
        "prose-blockquote:border-l-2 prose-blockquote:border-primary/60 prose-blockquote:bg-transparent prose-blockquote:not-italic prose-blockquote:font-serif prose-blockquote:text-foreground/80",
        // Code blocks: muted parchment, mono
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:font-mono",
        "prose-code:rounded-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em]",
        "prose-code:before:content-none prose-code:after:content-none",
        // Tables: hairlines only
        "prose-table:text-sm prose-th:border-b prose-th:border-border prose-th:font-semibold prose-td:border-b prose-td:border-border/60",
        // Lists
        "prose-li:marker:text-muted-foreground",
        // Horizontal rule: editorial single hairline
        "prose-hr:border-border",
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
