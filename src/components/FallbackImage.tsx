"use client";

import { useState } from "react";

export function FallbackImage(props: React.ComponentProps<"img">) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return <img {...props} onError={() => setHidden(true)} />;
}
