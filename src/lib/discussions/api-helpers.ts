import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, type RateLimitConfig } from "./rate-limit";

export async function getViewerId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function jsonError(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const userId = await getViewerId();
  if (!userId) {
    return { ok: false, response: jsonError("Sign in required.", 401) };
  }
  return { ok: true, userId };
}

export function applyRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(key, config);
  if (result.allowed) return null;
  return jsonError(
    "Slow down a sec — you're posting fast.",
    429,
    { retryAfterSec: result.retryAfterSec }
  );
}
