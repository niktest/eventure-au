"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-background text-on-surface font-body antialiased">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="mb-4 font-display text-6xl font-extrabold text-on-surface">500</h1>
          <p className="mb-8 text-lg text-secondary font-body">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-full bg-primary-container px-8 py-3 font-body font-semibold text-on-primary transition-colors hover:bg-primary"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
