import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownMessageProps = {
  content: string;
  live?: boolean;
};

function compactMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split(/(```[\s\S]*?```)/g)
    .map((part) => {
      if (part.startsWith("```")) return part;
      return part
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export default function MarkdownMessage({
  content,
  live = false,
}: MarkdownMessageProps) {
  const normalizedContent = compactMarkdown(content);

  return (
    <div className="atlasai-markdown text-inherit leading-[1.65]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 mb-2.5 text-[1.2em] font-semibold leading-snug first:mt-0 last:mb-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 text-[1.14em] font-semibold leading-snug first:mt-0 last:mb-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2.5 mb-2 text-[1.08em] font-semibold leading-snug first:mt-0 last:mb-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-2.5 mb-1.5 text-[1em] font-semibold leading-snug first:mt-0 last:mb-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="m-0 mb-2.5 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2.5 list-outside list-disc space-y-1.5 pl-5 marker:text-[#8B6B6B] first:mt-0 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-outside list-decimal space-y-1.5 pl-5 marker:text-[#8B6B6B] first:mt-0 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1.5 leading-[1.6] [&>p]:m-0 [&>p:not(:last-child)]:mb-1.5 [&>ol]:my-1.5 [&>ul]:my-1.5">
              {children}
            </li>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#5B4F4B] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className={`${className ?? ""} block whitespace-pre-wrap`}>
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-[#F3F0EF] p-3 text-[13px] leading-relaxed text-[#1a1a1a] first:mt-0 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-3 border-[#B7AAAA] pl-3 text-[#5B4F4B] first:mt-0 last:mb-0 [&>p]:m-0">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4 border-0 border-t border-[#E1D8D8]" />
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto first:mt-0 last:mb-0">
              <table className="w-full border-collapse text-[0.95em]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[#E8E8E8] bg-[#F7F4F3] px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#E8E8E8] px-2 py-1 align-top">
              {children}
            </td>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
      {live && (
        <span className="inline-block h-[1em] w-0.5 animate-pulse bg-[#5B4F4B]/50 align-middle" />
      )}
    </div>
  );
}
