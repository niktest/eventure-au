"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

// Failsafe: if useInView hasn't reported the element visible within this
// window after mount, force the content visible. Protects against headless
// capture tools and edge cases where IntersectionObserver doesn't fire for
// off-screen children — see EVE-147.
const REVEAL_FAILSAFE_MS = 600;

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 200px 0px" });
  const reduceMotion = useReducedMotion();
  const [forceVisible, setForceVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceVisible(true), REVEAL_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const offsets = {
    up: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
  };

  const visible = isInView || forceVisible;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={visible ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
