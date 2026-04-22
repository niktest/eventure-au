"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="mb-4 text-6xl font-bold text-slate-900">500</h1>
          <p className="mb-8 text-lg text-slate-500">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
