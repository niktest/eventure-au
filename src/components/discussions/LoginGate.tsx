import Link from "next/link";

interface LoginGateProps {
  context: "reply" | "upvote" | "post" | "report";
  redirectTo: string;
}

const COPY: Record<LoginGateProps["context"], { h: string; p: string }> = {
  reply: {
    h: "Want to join the conversation?",
    p: "Sign in to reply, upvote, and start your own threads. Takes 30 seconds.",
  },
  upvote: {
    h: "Sign in to upvote",
    p: "Show love for posts you like — sign in or create an account to vote.",
  },
  post: {
    h: "Sign in to post a thread",
    p: "Reading is open to everyone. Sign in to start your own thread.",
  },
  report: {
    h: "Sign in to report something",
    p: "Reports help us keep the place friendly. You'll need an account to flag a post.",
  },
};

export function LoginGate({ context, redirectTo }: LoginGateProps) {
  const copy = COPY[context];
  const next = encodeURIComponent(redirectTo);
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <span
          className="material-symbols-outlined text-primary text-2xl mt-0.5"
          aria-hidden="true"
        >
          lock
        </span>
        <div className="space-y-1">
          <h3 className="font-heading text-base font-bold text-on-surface">
            {copy.h}
          </h3>
          <p className="font-body text-sm text-on-surface-variant">{copy.p}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <Link
          href={`/login?next=${next}`}
          className="inline-flex items-center justify-center bg-primary text-on-primary font-body text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
        <Link
          href={`/signup?next=${next}`}
          className="inline-flex items-center justify-center border border-primary text-primary font-body text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
