import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SavedEventsList } from "@/components/SavedEventsList";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "View your saved events and activity on Festlio.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const savedCount = userId
    ? await prisma.savedEvent.count({ where: { userId } })
    : null;
  const displayName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <header className="mb-8 flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low">
            <span
              className="material-symbols-outlined text-secondary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div>
            <h1
              className="font-display text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {displayName ?? "Your Profile"}
            </h1>
            {savedCount !== null && (
              <p className="font-body text-sm text-secondary">
                {savedCount} saved {savedCount === 1 ? "event" : "events"}
              </p>
            )}
          </div>
        </header>

        <section aria-labelledby="saved-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              favorite
            </span>
            <h2
              id="saved-heading"
              className="font-heading text-2xl font-bold text-on-surface tracking-tight"
            >
              Saved events
            </h2>
          </div>
          <SavedEventsList />
        </section>
      </div>
    </div>
  );
}
