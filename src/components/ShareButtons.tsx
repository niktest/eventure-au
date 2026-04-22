"use client";

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/events/${slug}`
    : `/events/${slug}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback — noop
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-500">Share:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-600"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter"
        className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-sky-100 hover:text-sky-500"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.38 8.59 8.59 0 01-2.72 1.04 4.28 4.28 0 00-7.32 3.91A12.16 12.16 0 013.16 4.86a4.28 4.28 0 001.33 5.71 4.24 4.24 0 01-1.94-.54v.05a4.28 4.28 0 003.43 4.19 4.27 4.27 0 01-1.93.07 4.29 4.29 0 004 2.98A8.59 8.59 0 012 19.54a12.13 12.13 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.37-.01-.56A8.72 8.72 0 0022.46 6z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link"
        className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-ocean-light hover:text-ocean"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  );
}
