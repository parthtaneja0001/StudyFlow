"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownViewer({ markdown }: { markdown: string }) {
  return (
    <div className="prose-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[28px] font-semibold text-white tracking-tight mt-2 mb-5 leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[19px] font-semibold text-white tracking-tight mt-8 mb-3 pb-1.5 border-b border-[var(--color-border)]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-emerald-300 tracking-tight mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] text-white/75 leading-relaxed my-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="text-[15px] text-white/75 my-3 space-y-1.5 list-none pl-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-[15px] text-white/75 my-3 space-y-1.5 list-decimal pl-5 marker:text-emerald-400/60">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            const parent = (props as { node?: { properties?: { ordered?: boolean } } }).node;
            const ordered = parent?.properties?.ordered;
            return (
              <li className="leading-relaxed flex items-start gap-2 pl-0">
                {!ordered && (
                  <span className="text-emerald-400/70 mt-2 text-[8px] shrink-0">●</span>
                )}
                <span className="flex-1 min-w-0">{children}</span>
              </li>
            );
          },
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-200 text-[13px] font-mono border border-emerald-500/20">
                  {children}
                </code>
              );
            }
            return (
              <code className="text-[13px] font-mono text-white/90 block p-4 rounded-md bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-4 not-prose">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-emerald-400/60 bg-emerald-500/[0.04] pl-4 py-2 italic text-white/75">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-white/85">{children}</em>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-[var(--color-border)]">
              <table className="w-full text-[14px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.03]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left font-semibold text-white/90 px-3 py-2 border-b border-[var(--color-border)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[var(--color-border)] text-white/75">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-[var(--color-border)]" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4 decoration-emerald-400/40"
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
