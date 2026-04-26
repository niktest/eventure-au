"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Same-origin path only: must start with "/" and must not start with "//" or "/\".
function safeRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Accept both `callbackUrl` (NextAuth middleware default) and `next` (in-app CTAs).
  const callbackUrl =
    safeRedirect(searchParams?.get("callbackUrl")) ??
    safeRedirect(searchParams?.get("next")) ??
    "/";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const newErrors: Record<string, string> = {};

    if (!email) newErrors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Please enter a valid email address.";
    if (!password) newErrors.password = "Password is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, email, password }),
        redirect: "manual",
      });

      if (!res.ok && res.type !== "opaqueredirect") {
        setErrors({ _form: "Invalid email or password." });
        setLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {errors._form && (
        <div role="alert" className="rounded-lg bg-error/10 border border-error/30 p-3 text-error text-sm font-body">
          {errors._form}
        </div>
      )}

      {searchParams?.get("registered") && !errors._form && (
        <div role="status" className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-primary text-sm font-body">
          Account created successfully! Please sign in.
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="font-body text-sm font-semibold text-on-surface block tracking-wide"
        >
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">
              mail
            </span>
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            aria-invalid={submitted && !!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full pl-12 pr-4 py-4 bg-surface-container-lowest border rounded-lg font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 transition-all ${
              submitted && errors.email
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-primary/20"
            }`}
          />
        </div>
        {errors.email && (
          <p id="email-error" role="alert" className="text-error text-sm font-body mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label
            htmlFor="password"
            className="font-body text-sm font-semibold text-on-surface block tracking-wide"
          >
            Password
          </label>
          <a
            href="#"
            className="font-body text-xs font-medium text-primary hover:text-primary-container transition-colors"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">
              lock
            </span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            aria-invalid={submitted && !!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`w-full pl-12 pr-4 py-4 bg-surface-container-lowest border rounded-lg font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 transition-all ${
              submitted && errors.password
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-primary/20"
            }`}
          />
        </div>
        {errors.password && (
          <p id="password-error" role="alert" className="text-error text-sm font-body mt-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center py-4 px-6 bg-primary text-on-primary rounded-full font-body text-sm font-semibold tracking-wide shadow-md hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all mt-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Signing In…" : "Sign In"}
      </button>
    </form>
  );
}
