"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MapPin, MapPinOff, Loader2, AlertCircle } from "lucide-react";
import { useUserLocation, type SupportedCity } from "@/lib/location/useUserLocation";
import { CityPicker } from "@/components/home/CityPicker";

/**
 * Near Me button per EVE-126 §4.3.
 * Idle uses the hero-tier --gradient-neon-cta; all other states fall back to
 * solid surface-2 with neon-coral accents per the §6.1 art-direction guardrail
 * (gradient is hero-tier only, not a default).
 */
export function NearMeButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { status, location, requestGeolocation, setManualCity } = useUserLocation();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Push the resolved city to the URL so the event grid can filter on it.
  useEffect(() => {
    if (status !== "located" || !location) return;
    const slug = nearestCitySlug(location.label);
    if (!slug) return;
    const next = new URLSearchParams(params?.toString() ?? "");
    if (next.get("near") === slug) return;
    next.set("near", slug);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [status, location, params, pathname, router]);

  const onClick = useCallback(() => {
    if (status === "idle") {
      requestGeolocation();
      return;
    }
    if (status === "denied" || status === "unsupported" || status === "error") {
      setPickerOpen(true);
      return;
    }
    if (status === "located") {
      setPickerOpen(true);
    }
  }, [status, requestGeolocation]);

  const onPickCity = useCallback(
    (city: SupportedCity) => {
      setManualCity(city);
    },
    [setManualCity]
  );

  return (
    <>
      <button
        type="button"
        aria-label="Find events near me"
        aria-busy={status === "locating"}
        onClick={onClick}
        disabled={status === "locating"}
        className={buttonClasses(status)}
        style={status === "idle" ? { background: "var(--gradient-neon-cta)" } : undefined}
      >
        <ButtonIcon status={status} />
        <span aria-live="polite" className="font-body font-semibold">
          {labelFor(status, location?.label)}
        </span>
      </button>
      <CityPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickCity}
        onTryGeo={requestGeolocation}
      />
    </>
  );
}

function nearestCitySlug(label: string): string | null {
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return slug;
}

function buttonClasses(status: ReturnType<typeof useUserLocation>["status"]): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full h-12 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow transition-colors";
  switch (status) {
    case "idle":
      return `${base} text-[#0B0D12] hover:opacity-90`;
    case "locating":
      return `${base} bg-surface-2 border border-neon-coral text-on-dark-strong cursor-wait`;
    case "located":
      return `${base} bg-surface-2 border border-neon-coral text-on-dark-strong shadow-glow-coral`;
    case "denied":
    case "unsupported":
    case "error":
    default:
      return `${base} bg-surface-1 border border-surface-3 text-on-dark-muted hover:bg-surface-2`;
  }
}

function labelFor(
  status: ReturnType<typeof useUserLocation>["status"],
  cityLabel?: string
): string {
  switch (status) {
    case "idle":
      return "Near Me";
    case "locating":
      return "Locating…";
    case "located":
      return cityLabel ? `${cityLabel}` : "Near Me";
    case "denied":
    case "unsupported":
      return "Choose city";
    case "error":
      return "Couldn't locate · Choose city";
    default:
      return "Near Me";
  }
}

function ButtonIcon({
  status,
}: {
  status: ReturnType<typeof useUserLocation>["status"];
}) {
  if (status === "locating") {
    return <Loader2 size={18} className="animate-spin shrink-0" aria-hidden="true" />;
  }
  if (status === "error") {
    return <AlertCircle size={18} className="shrink-0" aria-hidden="true" />;
  }
  if (status === "denied" || status === "unsupported") {
    return <MapPinOff size={18} className="shrink-0" aria-hidden="true" />;
  }
  return <MapPin size={18} className="shrink-0" aria-hidden="true" />;
}
