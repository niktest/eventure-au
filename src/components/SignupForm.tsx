"use client";

import { useState } from "react";

export function SignupForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const newErrors: Record<string, string> = {};

    if (!name) newErrors.name = "Full name is required.";
    if (!email) newErrors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Please enter a valid email address.";
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters.";

    setErrors(newErrors);
  };

  const inputClass = (field: string) =>
    `block w-full rounded-lg border py-3 pl-10 pr-3 font-body text-base text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 transition-all ${
      submitted && errors[field]
        ? "border-error bg-surface focus:border-error focus:ring-error/20"
        : "border-outline bg-surface focus:border-primary focus:ring-primary/20"
    }`;

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div>
        <label
          htmlFor="name"
          className="block font-body text-sm font-semibold text-on-surface mb-1"
        >
          Full Name
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">
              person
            </span>
          </div>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Alex Rivera"
            aria-invalid={submitted && !!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={inputClass("name")}
          />
        </div>
        {errors.name && (
          <p id="name-error" role="alert" className="text-error text-sm font-body mt-1">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="signup-email"
          className="block font-body text-sm font-semibold text-on-surface mb-1"
        >
          Email Address
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">
              mail
            </span>
          </div>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="alex@example.com"
            aria-invalid={submitted && !!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            className={inputClass("email")}
          />
        </div>
        {errors.email && (
          <p id="signup-email-error" role="alert" className="text-error text-sm font-body mt-1">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="block font-body text-sm font-semibold text-on-surface mb-1"
        >
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">
              lock
            </span>
          </div>
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={submitted && !!errors.password}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
            className={inputClass("password")}
          />
        </div>
        {errors.password && (
          <p id="signup-password-error" role="alert" className="text-error text-sm font-body mt-1">
            {errors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="mt-8 flex w-full justify-center rounded-full bg-primary px-4 py-3.5 font-body text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container hover:scale-[1.02] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Create Account
      </button>
    </form>
  );
}
