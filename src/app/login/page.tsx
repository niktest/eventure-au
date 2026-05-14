import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Festlio to access your saved events and collections.",
};

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]" aria-hidden="true">
              auto_awesome_motion
            </span>
            <span className="font-heading text-2xl font-bold text-on-surface tracking-tight">
              <span className="text-primary font-extrabold">Festlio</span>
            </span>
          </Link>
        </div>
        <Suspense fallback={null}>
          <AuthForm initialMode="sign_in" />
        </Suspense>
      </div>
    </main>
  );
}
