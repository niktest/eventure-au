import { auth } from "@/lib/auth";
import { listLatestThreadsForEvent } from "@/lib/discussions/queries";
import { EventDiscussPanel } from "./EventDiscussPanel";

interface EventDiscussPanelLoaderProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
}

export async function EventDiscussPanelLoader({
  eventId,
  eventSlug,
  eventName,
}: EventDiscussPanelLoaderProps) {
  let viewerId: string | null = null;
  try {
    const session = await auth();
    viewerId = session?.user?.id ?? null;
  } catch {
    // auth lookup is non-critical for rendering the panel
  }

  let threads: Awaited<ReturnType<typeof listLatestThreadsForEvent>> = [];
  try {
    threads = await listLatestThreadsForEvent({
      eventId,
      limit: 3,
      viewerId,
    });
  } catch {
    // Non-critical
  }

  return (
    <EventDiscussPanel
      eventSlug={eventSlug}
      eventName={eventName}
      threads={threads}
      isSignedIn={Boolean(viewerId)}
    />
  );
}
