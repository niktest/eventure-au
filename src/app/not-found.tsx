import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="mb-4 font-heading text-6xl font-bold text-slate-900">404</h1>
      <p className="mb-8 text-lg text-slate-500">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
      >
        Back to home
      </Link>
    </div>
  );
}
