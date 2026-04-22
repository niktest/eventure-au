"use client";

import { useState } from "react";

export function LoginForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
        className="w-full flex items-center justify-center py-4 px-6 bg-primary text-on-primary rounded-full font-body text-sm font-semibold tracking-wide shadow-md hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all mt-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Sign In
      </button>
    </form>
  );
}
