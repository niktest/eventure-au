import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create an Eventure Discovery account to discover and curate your next experience.",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)]">
      {/* Left Side: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-24 xl:px-32 bg-surface-bright">
        {/* Brand */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
              explore
            </span>
            <span className="font-heading text-2xl font-bold tracking-tight text-primary">
              Eventure Discovery
            </span>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-display text-5xl font-extrabold text-on-surface mb-2 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Join the crowd
            </h1>
            <p className="font-body text-base text-on-surface-variant">
              Create an account to discover and curate your next unforgettable experience.
            </p>
          </div>

          {/* Social Sign Up */}
          <fieldset className="border-0 p-0 m-0 mb-8">
            <legend className="sr-only">Sign up with a social account</legend>
            <div className="space-y-4">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-outline bg-transparent px-4 py-3 font-body text-sm font-semibold text-on-surface transition-all hover:bg-surface hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-outline bg-transparent px-4 py-3 font-body text-sm font-semibold text-on-surface transition-all hover:bg-surface hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
                </svg>
                Sign up with Apple
              </button>
            </div>
          </fieldset>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface-bright px-4 font-body text-xs font-medium text-on-surface-variant">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <SignupForm />

          <p className="mt-8 text-center font-body text-base text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary-container transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side: Image (desktop only) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-inverse-surface overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-inverse-surface/80 z-10 mix-blend-multiply" />
        <img
          src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=960&q=80"
          alt="Vibrant crowd at an outdoor music festival during sunset"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Testimonial overlay */}
        <div className="absolute bottom-0 left-0 z-20 p-12 xl:p-24 w-full">
          <div className="inline-block bg-primary-container/90 backdrop-blur-md rounded-2xl p-6 shadow-lg max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">star</span>
              <span className="font-body text-xs font-semibold text-white uppercase tracking-wider">
                Premium Experience
              </span>
            </div>
            <p className="font-heading text-xl font-bold text-white">
              &quot;Eventure transformed how I connect with my city. The curated collections are unmatched.&quot;
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
