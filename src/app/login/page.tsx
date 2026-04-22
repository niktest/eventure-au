import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Eventure Discovery to access your saved events and collections.",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left side: Hero Image (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-high overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-on-background/20 to-on-background/60 z-10 mix-blend-multiply" />
        <img
          src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=960&q=80"
          alt="Vibrant live music concert with a crowd bathed in warm stage lighting"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="relative z-20 flex flex-col justify-end p-12 xl:p-20 w-full h-full text-white">
          <h1 className="font-display text-5xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ letterSpacing: "-0.02em" }}>
            Discover the pulse of your city.
          </h1>
          <p className="font-body text-lg max-w-md text-white/90">
            Join thousands exploring curated live events, exclusive gatherings, and unforgettable nights out.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20 bg-background">
        <div className="w-full max-w-[440px]">
          {/* Brand Header */}
          <div className="mb-16 text-center lg:text-left">
            <Link href="/" className="inline-flex items-center gap-2 mb-12">
              <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome_motion</span>
              <span className="font-heading text-2xl font-bold text-on-surface tracking-tight">
                <span className="text-primary font-extrabold">Eventure</span> Discovery
              </span>
            </Link>
            <h2 className="font-display text-5xl font-extrabold text-on-surface mb-2 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Welcome back
            </h2>
            <p className="font-body text-base text-on-surface-variant">
              Sign in to access your saved events and tickets.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-6">
            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="email" className="font-body text-sm font-semibold text-on-surface block tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[20px]">mail</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-lg font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="font-body text-sm font-semibold text-on-surface block tracking-wide">
                  Password
                </label>
                <a href="#" className="font-body text-xs font-medium text-primary hover:text-primary-container transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[20px]">lock</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-lg font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 px-6 bg-primary text-on-primary rounded-full font-body text-sm font-semibold tracking-wide shadow-md hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all mt-8"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 mb-8 flex items-center text-center">
            <div className="flex-grow border-t border-outline-variant/50" />
            <span className="flex-shrink-0 mx-4 font-body text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Or continue with
            </span>
            <div className="flex-grow border-t border-outline-variant/50" />
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-transparent border-2 border-secondary text-secondary rounded-full font-body text-sm font-semibold hover:bg-surface-container-low transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-transparent border-2 border-secondary text-secondary rounded-full font-body text-sm font-semibold hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                phone_iphone
              </span>
              Apple
            </button>
          </div>

          {/* Sign Up Prompt */}
          <p className="mt-12 text-center font-body text-base text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:text-primary-container transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
