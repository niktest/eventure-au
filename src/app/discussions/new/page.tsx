import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveHandle } from "@/lib/discussions/handle";
import { NewThreadForm } from "@/components/discussions/NewThreadForm";

export const metadata: Metadata = {
  title: "Start a thread — Gold Coast Discussions",
};

export const dynamic = "force-dynamic";

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ eventSlug?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/discussions/new");
  }
  const { eventSlug } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  const handle = user ? deriveHandle(user) : null;

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <NewThreadForm
          defaultCity="Gold Coast"
          authorHandle={handle}
          initialEventSlug={eventSlug}
        />
      </div>
    </div>
  );
}
