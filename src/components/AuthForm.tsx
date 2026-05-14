"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type AuthMode = "sign_in" | "sign_up";
type OAuthProvider = "google" | "apple" | "facebook";

interface AuthFormProps {
  initialMode?: AuthMode;
}

function safeRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tiny offline set so a "not a common password" rule has teeth without shipping a
// 10k-entry list to the client. Backend is the authority for stronger checks.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "abc12345",
  "letmein1",
  "iloveyou",
  "welcome1",
  "admin1234",
]);

interface PasswordRule {
  id: string;
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  {
    id: "digit_or_symbol",
    label: "Includes a number or symbol",
    test: (v) => /[0-9\W_]/.test(v),
  },
  {
    id: "uncommon",
    label: "Not a common password",
    test: (v) => v.length === 0 || !COMMON_PASSWORDS.has(v.toLowerCase()),
  },
];

function passwordIsValidForSignup(v: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(v));
}

export function AuthForm({ initialMode = "sign_in" }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl =
    safeRedirect(searchParams?.get("callbackUrl")) ??
    safeRedirect(searchParams?.get("next")) ??
    "/";

  const urlMode = searchParams?.get("mode");
  const startingMode: AuthMode =
    urlMode === "sign_up" || urlMode === "sign_in" ? urlMode : initialMode;

  const [mode, setMode] = useState<AuthMode>(startingMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);
  const [info, setInfo] = useState<string | null>(
    searchParams?.get("registered") ? "Account created. Sign in below." : null,
  );

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const initialRender = useRef(true);

  const headingId = useId();
  const subheadId = useId();
  const formErrorId = useId();
  const passwordRulesId = useId();

  const isSignIn = mode === "sign_in";

  // Mode-aware subhead in a polite live region so screen readers announce mode changes.
  const subhead = isSignIn
    ? "Sign in to access your saved events and tickets."
    : "Create an account to discover and curate your next experience.";

  // Keep URL ?mode= in sync so deep links / back button restore the right mode.
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const params = new URLSearchParams(
      Array.from(searchParams?.entries() ?? []),
    );
    params.set("mode", mode);
    router.replace(`?${params.toString()}`, { scroll: false });
    // We deliberately exclude router/searchParams here — we only want to react to
    // mode changes after first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function switchMode(next: AuthMode, _trigger: "tab" | "link" | "bounce") {
    if (next === mode) return;
    setMode(next);
    setSubmitted(false);
    setErrors({});
    setPassword("");
    setPasswordDirty(false);
    setShowPassword(false);
    if (next === "sign_in") {
      // Reset sign-up-only state.
      setName("");
      setAcceptedTerms(false);
    } else {
      setRememberMe(false);
    }
    // Focus first field of the new mode after render.
    requestAnimationFrame(() => {
      if (next === "sign_up") {
        nameRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!isSignIn) {
      if (!name.trim()) next.name = "Full name is required.";
      else if (name.trim().length > 80) next.name = "Name is too long.";
    }
    if (!email) next.email = "Email address is required.";
    else if (!EMAIL_RE.test(email) || email.length > 254)
      next.email = "Please enter a valid email address.";
    if (!password) {
      next.password = "Password is required.";
    } else if (!isSignIn) {
      if (password.length < 8)
        next.password = "Password must be at least 8 characters.";
      else if (!passwordIsValidForSignup(password))
        next.password = "Password does not meet the requirements.";
    }
    if (!isSignIn && !acceptedTerms)
      next.terms = "You must accept the Terms and Privacy Policy.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setInfo(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setLoading(true);
    try {
      if (isSignIn) {
        await doSignIn(email, password);
      } else {
        await doSignUp({ name: name.trim(), email, password });
      }
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
      setLoading(false);
    }
  }

  async function doSignIn(emailValue: string, passwordValue: string) {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email: emailValue, password: passwordValue }),
      redirect: "manual",
    });
    if (!res.ok && res.type !== "opaqueredirect") {
      // Generic form-level error — never disclose whether the email exists.
      setErrors({ _form: "That email or password didn't match. Try again or reset your password." });
      setLoading(false);
      return;
    }
    window.location.href = callbackUrl;
  }

  async function doSignUp(payload: { name: string; email: string; password: string }) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Existing email -> bounce to sign-in with email prefilled + info banner.
      if (res.status === 409) {
        switchMode("sign_in", "bounce");
        setInfo("You already have an account with that email. Sign in below.");
        setLoading(false);
        return;
      }
      setErrors(data?.errors ?? { _form: "Something went wrong." });
      setLoading(false);
      return;
    }
    // Auto sign-in
    await doSignIn(payload.email, payload.password);
  }

  function handleOAuth(provider: OAuthProvider) {
    // Real OAuth providers aren't wired yet — surface a top-of-card message
    // rather than failing silently so users have an actionable next step.
    setOauthPending(provider);
    setErrors({});
    setInfo(null);
    setTimeout(() => {
      setOauthPending(null);
      setErrors({
        _form: `${labelFor(provider)} sign-in isn't available yet. Use email below.`,
      });
    }, 400);
  }

  const passwordMatches = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) })),
    [password],
  );

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <h1
          id={headingId}
          className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Welcome to Festlio
        </h1>
        <p
          id={subheadId}
          aria-live="polite"
          className="mt-2 font-body text-base text-on-surface-variant"
        >
          {subhead}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-surface border border-outline-variant/60 shadow-sm p-6 sm:p-8">
        <ModeSwitcher mode={mode} onChange={(m) => switchMode(m, "tab")} />

        {/* Form-level alerts (sticky info banner survives mode bounce). */}
        {info && !errors._form && (
          <div
            role="status"
            className="mt-4 rounded-lg bg-primary/10 border border-primary/30 p-3 text-primary text-sm font-body"
          >
            {info}
          </div>
        )}
        {errors._form && (
          <div
            id={formErrorId}
            role="alert"
            className="mt-4 rounded-lg bg-error/10 border border-error/30 p-3 text-error text-sm font-body"
          >
            {errors._form}
          </div>
        )}

        {/* OAuth row */}
        <fieldset className="mt-6 border-0 p-0 m-0">
          <legend className="sr-only">
            {isSignIn ? "Sign in with a social account" : "Create an account with a social provider"}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            <OAuthButton
              provider="google"
              pending={oauthPending}
              onClick={() => handleOAuth("google")}
            />
            <OAuthButton
              provider="apple"
              pending={oauthPending}
              onClick={() => handleOAuth("apple")}
            />
            <OAuthButton
              provider="facebook"
              pending={oauthPending}
              onClick={() => handleOAuth("facebook")}
            />
          </div>
        </fieldset>

        {/* Divider */}
        <div className="my-6 flex items-center text-center">
          <div className="flex-grow border-t border-outline-variant/50" />
          <span className="mx-3 font-body text-xs font-medium text-on-surface-variant uppercase tracking-wider">
            or
          </span>
          <div className="flex-grow border-t border-outline-variant/50" />
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {!isSignIn && (
            <Field
              id="auth-name"
              label="Full Name"
              required
              error={errors.name}
              submitted={submitted}
            >
              <input
                ref={nameRef}
                id="auth-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-required="true"
                aria-invalid={submitted && !!errors.name}
                aria-describedby={errors.name ? "auth-name-error" : undefined}
                className={inputClass(submitted && !!errors.name)}
              />
            </Field>
          )}

          <Field
            id="auth-email"
            label="Email Address"
            required
            error={errors.email}
            submitted={submitted}
          >
            <input
              ref={emailRef}
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-required="true"
              aria-invalid={submitted && !!errors.email}
              aria-describedby={errors.email ? "auth-email-error" : undefined}
              className={inputClass(submitted && !!errors.email)}
            />
          </Field>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label
                htmlFor="auth-password"
                className="font-body text-sm font-semibold text-on-surface tracking-wide"
              >
                Password
              </label>
              {isSignIn && (
                <a
                  href="/forgot-password"
                  className="font-body text-xs font-medium text-primary hover:text-primary-container transition-colors"
                >
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isSignIn ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!passwordDirty) setPasswordDirty(true);
                }}
                aria-required="true"
                aria-invalid={submitted && !!errors.password}
                aria-describedby={
                  [
                    errors.password ? "auth-password-error" : null,
                    !isSignIn ? passwordRulesId : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className={`${inputClass(submitted && !!errors.password)} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-lg"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && (
              <p
                id="auth-password-error"
                role="alert"
                className="text-error text-sm font-body mt-1"
              >
                {errors.password}
              </p>
            )}
            {!isSignIn && (
              <ul
                id={passwordRulesId}
                className="mt-2 space-y-1 text-xs font-body"
                aria-label="Password requirements"
              >
                {passwordMatches.map((rule) => {
                  const failed = passwordDirty && !rule.met;
                  const met = rule.met && password.length > 0;
                  const glyph = met ? "*" : failed ? "x" : "-";
                  const tone = met
                    ? "text-primary"
                    : failed
                      ? "text-error"
                      : "text-on-surface-variant";
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-2 ${tone}`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex w-4 justify-center font-mono"
                      >
                        {glyph}
                      </span>
                      <span>{rule.label}</span>
                      <span className="sr-only">
                        {met ? " — met" : failed ? " — not met" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isSignIn ? (
            <label className="flex items-center gap-2 font-body text-sm text-on-surface">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              Keep me signed in
            </label>
          ) : (
            <div className="space-y-1">
              <label className="flex items-start gap-2 font-body text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  aria-required="true"
                  aria-invalid={submitted && !!errors.terms}
                  aria-describedby={errors.terms ? "auth-terms-error" : undefined}
                  className="mt-0.5 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="text-primary hover:text-primary-container underline"
                  >
                    Terms
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="text-primary hover:text-primary-container underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {errors.terms && (
                <p
                  id="auth-terms-error"
                  role="alert"
                  className="text-error text-sm font-body"
                >
                  {errors.terms}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || oauthPending !== null}
            className="w-full flex items-center justify-center py-3.5 px-6 bg-primary text-on-primary rounded-full font-body text-sm font-semibold tracking-wide shadow-md hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transform-none motion-reduce:transition-none"
          >
            {loading
              ? isSignIn
                ? "Signing In…"
                : "Creating Account…"
              : isSignIn
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Secondary mode-switch link */}
        <p className="mt-6 text-center font-body text-sm text-on-surface-variant">
          {isSignIn ? (
            <>
              New to Festlio?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign_up", "link")}
                className="font-semibold text-primary hover:text-primary-container transition-colors"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("sign_in", "link")}
                className="font-semibold text-primary hover:text-primary-container transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <p className="mt-6 text-center font-body text-xs text-on-surface-variant">
        <a href="/terms" className="hover:underline">Terms</a>
        <span aria-hidden="true"> · </span>
        <a href="/privacy" className="hover:underline">Privacy</a>
        <span aria-hidden="true"> · </span>
        <a href="/contact" className="hover:underline">Help</a>
      </p>
    </div>
  );
}

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (next: AuthMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sign in or create an account"
      className="grid grid-cols-2 gap-1 rounded-full bg-surface-container-low p-1"
    >
      <TabButton
        active={mode === "sign_in"}
        controls="auth-panel"
        onClick={() => onChange("sign_in")}
      >
        Sign in
      </TabButton>
      <TabButton
        active={mode === "sign_up"}
        controls="auth-panel"
        onClick={() => onChange("sign_up")}
      >
        Create account
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  controls,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`rounded-full py-2 px-4 font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  required,
  error,
  submitted,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  submitted: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="font-body text-sm font-semibold text-on-surface block tracking-wide"
      >
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {submitted && error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error text-sm font-body mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `w-full px-4 py-3.5 bg-surface-container-lowest border rounded-lg font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 transition-all ${
    invalid
      ? "border-error focus:border-error focus:ring-error/20"
      : "border-outline-variant focus:border-primary focus:ring-primary/20"
  }`;
}

function labelFor(provider: OAuthProvider): string {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "facebook":
      return "Facebook";
  }
}

function OAuthButton({
  provider,
  pending,
  onClick,
}: {
  provider: OAuthProvider;
  pending: OAuthProvider | null;
  onClick: () => void;
}) {
  const isPending = pending === provider;
  const rowDisabled = pending !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={rowDisabled}
      aria-label={`Continue with ${labelFor(provider)}`}
      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface border-2 border-outline-variant rounded-full font-body text-sm font-semibold text-on-surface hover:border-outline hover:bg-surface-container-low transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <OAuthIcon provider={provider} />
      <span className="hidden sm:inline">{labelFor(provider)}</span>
      {isPending && (
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
    </button>
  );
}

function OAuthIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    );
  }
  if (provider === "apple") {
    return (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
      </svg>
    );
  }
  // facebook
  return (
    <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.792-4.682 4.533-4.682 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.49 0-1.956.927-1.956 1.876v2.252h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073" />
    </svg>
  );
}
