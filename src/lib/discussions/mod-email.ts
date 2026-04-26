/**
 * Fire-and-forget moderation email. Per CEO clarification on EVE-107: route
 * to developer@hicaliber.com.au until ops takes over, don't block the response.
 *
 * v1: log + best-effort POST to a webhook if MOD_REPORT_WEBHOOK_URL is set.
 * Real SMTP is a future drop-in replacement for this function.
 */
const MOD_EMAIL_TO = "developer@hicaliber.com.au";

export interface ModReportPayload {
  kind: "thread" | "reply";
  targetId: string;
  reporterHandle: string;
  reason: string;
  detail?: string | null;
  url: string;
}

export function notifyModerationTeam(payload: ModReportPayload): void {
  const body = JSON.stringify({
    to: MOD_EMAIL_TO,
    subject: `[Eventure mod] New ${payload.kind} report (${payload.reason})`,
    payload,
  });
  // Always log — gives us a paper trail in Vercel logs without external deps.
  console.info("[mod-report]", body);
  const url = process.env.MOD_REPORT_WEBHOOK_URL;
  if (!url) return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }).catch((err) => {
    console.error("[mod-report] webhook failed", err);
  });
}
