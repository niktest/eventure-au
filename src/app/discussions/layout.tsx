import { ToastProvider } from "@/components/discussions/Toast";

export default function DiscussionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
