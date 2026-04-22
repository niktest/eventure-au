import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Eventure team. Questions about events, partnerships, or listing your venue — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-heading text-4xl font-bold text-slate-900">Contact Us</h1>

      <div className="space-y-8 text-slate-700 leading-relaxed">
        <p>
          Have a question, feedback, or want to partner with us? We&apos;d love
          to hear from you.
        </p>

        <div className="rounded-lg border border-ocean/20 bg-white p-6 space-y-6">
          <div>
            <h2 className="font-heading font-semibold text-ocean-dark">General Enquiries</h2>
            <a href="mailto:hello@eventure.com.au" className="text-coral hover:text-coral-dark transition-colors">
              hello@eventure.com.au
            </a>
          </div>

          <div>
            <h2 className="font-heading font-semibold text-ocean-dark">
              Event Organisers &amp; Venues
            </h2>
            <p className="text-slate-500">
              Want your events featured on Eventure? Reach out at{" "}
              <a href="mailto:partners@eventure.com.au" className="text-coral hover:text-coral-dark transition-colors">
                partners@eventure.com.au
              </a>
            </p>
          </div>

          <div>
            <h2 className="font-heading font-semibold text-ocean-dark">Press &amp; Media</h2>
            <a href="mailto:press@eventure.com.au" className="text-coral hover:text-coral-dark transition-colors">
              press@eventure.com.au
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-ocean-light p-6">
          <h2 className="mb-3 font-heading font-semibold text-ocean-dark">Based on the Gold Coast</h2>
          <p className="text-ocean-dark/70">
            Eventure is proudly based on the Gold Coast, Queensland, Australia.
            We&apos;re building the best way to discover events across
            Australia.
          </p>
        </div>
      </div>
    </div>
  );
}
