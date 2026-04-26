import React from "react";

const URL_RE = /\b(https?:\/\/[^\s<>"]+)/gi;

/**
 * Splits plaintext into a mix of strings and anchor elements for any URLs.
 * Matches v1 spec: plain text + autolinked URLs only.
 */
export function autolink(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      out.push(text.slice(lastIndex, start));
    }
    const url = match[0];
    out.push(
      <a
        key={`l-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-primary underline underline-offset-2 hover:text-primary-container break-all"
      >
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}
