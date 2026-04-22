import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Eventure team. Questions about events, partnerships, or listing your venue — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Contact Us
        </h1>

        <div className="space-y-8 font-body text-base text-on-surface-variant leading-relaxed">
          <p>
            Have a question, feedback, or want to partner with us? We&apos;d love
            to hear from you.
          </p>

          <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="font-heading font-bold text-on-surface">General Enquiries</h2>
              <a href="mailto:hello@eventure.com.au" className="text-primary hover:text-primary-container transition-colors">
                hello@eventure.com.au
              </a>
            </div>

            <div>
              <h2 className="font-heading font-bold text-on-surface">
                Event Organisers &amp; Venues
              </h2>
              <p className="text-secondary">
                Want your events featured on Eventure? Reach out at{" "}
                <a href="mailto:partners@eventure.com.au" className="text-primary hover:text-primary-container transition-colors">
                  partners@eventure.com.au
                </a>
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-on-surface">Press &amp; Media</h2>
              <a href="mailto:press@eventure.com.au" className="text-primary hover:text-primary-container transition-colors">
                press@eventure.com.au
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-primary-container/10 p-6 border border-primary-container/20">
            <h2 className="mb-3 font-heading font-bold text-on-primary-container">Based on the Gold Coast</h2>
            <p className="text-on-primary-container/70">
              Eventure is proudly based on the Gold Coast, Queensland, Australia.
              We&apos;re building the best way to discover events across
              Australia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
