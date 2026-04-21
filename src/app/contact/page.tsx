import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Eventure team. Questions about events, partnerships, or listing your venue — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold">Contact Us</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Have a question, feedback, or want to partner with us? We&apos;d love
          to hear from you.
        </p>

        <div className="rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">General Enquiries</h2>
            <p className="text-gray-600">hello@eventure.com.au</p>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Event Organisers &amp; Venues
            </h2>
            <p className="text-gray-600">
              Want your events featured on Eventure? Reach out at{" "}
              partners@eventure.com.au
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">Press &amp; Media</h2>
            <p className="text-gray-600">press@eventure.com.au</p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-6">
          <h2 className="mb-3 font-semibold text-gray-900">Based on the Gold Coast</h2>
          <p className="text-gray-600">
            Eventure is proudly based on the Gold Coast, Queensland, Australia.
            We&apos;re building the best way to discover events across
            Australia.
          </p>
        </div>
      </div>
    </div>
  );
}
