import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Eventure team. Questions about events, partnerships, or listing your venue — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-heading text-4xl font-bold">Contact Us</h1>

      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>
          Have a question, feedback, or want to partner with us? We&apos;d love
          to hear from you.
        </p>

        <div className="rounded-lg border border-slate-300 p-6 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-slate-900">General Enquiries</h2>
            <p className="text-slate-500">hello@eventure.com.au</p>
          </div>

          <div>
            <h2 className="font-heading font-semibold text-slate-900">
              Event Organisers &amp; Venues
            </h2>
            <p className="text-slate-500">
              Want your events featured on Eventure? Reach out at{" "}
              partners@eventure.com.au
            </p>
          </div>

          <div>
            <h2 className="font-heading font-semibold text-slate-900">Press &amp; Media</h2>
            <p className="text-slate-500">press@eventure.com.au</p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-100 p-6">
          <h2 className="mb-3 font-heading font-semibold text-slate-900">Based on the Gold Coast</h2>
          <p className="text-slate-500">
            Eventure is proudly based on the Gold Coast, Queensland, Australia.
            We&apos;re building the best way to discover events across
            Australia.
          </p>
        </div>
      </div>
    </div>
  );
}
