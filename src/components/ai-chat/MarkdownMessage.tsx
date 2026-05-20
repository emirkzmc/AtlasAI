import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownMessageProps = {
  content: string;
  live?: boolean;
};

export default function MarkdownMessage({
  content,
  live = false,
}: MarkdownMessageProps) {
  return (
    <div className="atlasai-markdown text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="m-0 mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
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
            <pre className="my-3 overflow-x-auto rounded-lg bg-[#F3F0EF] p-3 text-[13px] leading-relaxed text-[#1a1a1a]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-3 border-[#B7AAAA] pl-3 text-[#5B4F4B]">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {live && (
        <span className="inline-block h-[1em] w-[2px] animate-pulse bg-[#5B4F4B]/50 align-middle" />
      )}
    </div>
  );
}
