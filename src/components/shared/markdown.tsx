import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "@/lib/utils";

/** Link aman: internal (`/…`) lewat next/link, eksternal hanya https di tab baru. */
function safeHref(href: string | undefined): { href: string; external: boolean } | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return { href, external: false };
  if (href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return { href, external: true };
  }
  return null;
}

const components: Components = {
  h1: ({ children }) => <h2 className="mt-10 mb-4 text-2xl font-bold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 mb-4 text-2xl font-bold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 mb-3 text-xl font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 mb-2 text-lg font-semibold">{children}</h4>,
  p: ({ children }) => <p className="mb-4 leading-7 text-steel-700">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-6 text-steel-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-steel-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-border pl-4 text-steel-700 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
  a: ({ href, children }) => {
    const safe = safeHref(href);
    if (!safe) return <span>{children}</span>;
    const className = "font-medium underline underline-offset-4 hover:text-foreground";
    return safe.external ? (
      <a href={safe.href} className={className} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ) : (
      <Link href={safe.href} className={className}>
        {children}
      </Link>
    );
  },
  // Gambar dari Markdown tidak dirender (hindari hotlink/tracking dari konten).
  img: () => null,
};

/**
 * Render Markdown konten admin (D-39). HTML mentah tidak dirender (bawaan
 * react-markdown tanpa rehype-raw), link dibatasi ke internal/https.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("text-base", className)}>
      <ReactMarkdown components={components} skipHtml>
        {source}
      </ReactMarkdown>
    </div>
  );
}
