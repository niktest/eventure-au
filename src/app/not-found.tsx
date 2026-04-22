import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <span className="material-symbols-outlined text-6xl text-secondary mb-4 block">
        search_off
      </span>
      <h1 className="mb-4 font-display text-6xl font-extrabold text-on-surface">404</h1>
      <p className="mb-8 text-lg text-secondary font-body">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary-container px-8 py-3 font-body font-semibold text-on-primary transition-colors hover:bg-primary"
      >
        Back to home
      </Link>
    </div>
  );
}
