"use client";

import Image from "next/image";
import { useState } from "react";

export function EventCardImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <EventCardImagePlaceholder />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover group-hover:scale-105 transition-transform duration-500"
      placeholder="empty"
      onError={() => setFailed(true)}
    />
  );
}

export function EventCardImagePlaceholder() {
  return (
    <div className="flex h-full items-center justify-center bg-surface-dim">
      <span className="material-symbols-outlined text-4xl text-secondary">
        calendar_month
      </span>
    </div>
  );
}
