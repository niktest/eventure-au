import type { Metadata } from "next";
import { CONTACT_EMAILS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Talk to the Festlio team — questions, partnership enquiries, or list your venue. We'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Contact Festlio
        </h1>

        <div className="space-y-8 font-body text-base text-on-surface-variant leading-relaxed">
          <p>
            Got a question, feedback, or want to put your events in front of
            more people? We read everything — drop us a line.
          </p>

          <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="font-heading font-bold text-on-surface">General Enquiries</h2>
              <a href={`mailto:${CONTACT_EMAILS.general}`} className="text-primary hover:text-primary-container transition-colors">
                {CONTACT_EMAILS.general}
              </a>
            </div>

            <div>
              <h2 className="font-heading font-bold text-on-surface">
                Event Organisers &amp; Venues
              </h2>
              <p className="text-secondary">
                Want your events on Festlio? Email{" "}
                <a href={`mailto:${CONTACT_EMAILS.partners}`} className="text-primary hover:text-primary-container transition-colors">
                  {CONTACT_EMAILS.partners}
                </a>{" "}
                and we&apos;ll get you added.
              </p>
            </div>

            <div>
              <h2 className="font-heading font-bold text-on-surface">Press &amp; Media</h2>
              <a href={`mailto:${CONTACT_EMAILS.press}`} className="text-primary hover:text-primary-container transition-colors">
                {CONTACT_EMAILS.press}
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-primary-container/10 p-6 border border-primary-container/20">
            <h2 className="mb-3 font-heading font-bold text-on-surface">Based on the Gold Coast</h2>
            <p className="text-on-surface-variant">
              Festlio is built on the Gold Coast, Queensland. We&apos;re
              starting in our own backyard and working outward — Brisbane next,
              then the rest of the country.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
