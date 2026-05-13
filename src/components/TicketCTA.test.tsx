import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketCTA } from "./TicketCTA";

describe("TicketCTA", () => {
  beforeEach(() => {
    // sendBeacon needs to be a vi.fn so we can assert against it but jsdom
    // doesn't ship a real implementation.
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  describe("detail variant", () => {
    it("renders Get tickets CTA with safe outbound rel + target", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="humanitix"
          ticketUrl="https://humanitix.com/event/abc"
          isFree={false}
        />,
      );
      const link = screen.getByRole("link", { name: /get tickets/i });
      expect(link).toHaveAttribute("href", "https://humanitix.com/event/abc");
      expect(link).toHaveAttribute("target", "_blank");
      // EVE-212 requires nofollow on outbound ticket links so we don't pass
      // link equity to aggregators that re-list our data.
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("nofollow");
    });

    it("shows 'Tickets via {source}' attribution under the CTA", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="humanitix"
          ticketUrl="https://humanitix.com/event/abc"
        />,
      );
      expect(screen.getByText(/tickets via/i)).toBeInTheDocument();
      expect(screen.getByText("Humanitix")).toBeInTheDocument();
    });

    it("falls back to infoUrl + 'More info' label when ticketUrl is missing", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="destinationgc"
          ticketUrl={null}
          infoUrl="https://destinationgoldcoast.com/event"
          isFree
        />,
      );
      const link = screen.getByRole("link", { name: /more info/i });
      expect(link).toHaveAttribute(
        "href",
        "https://destinationgoldcoast.com/event",
      );
      expect(screen.getByText(/listed via/i)).toBeInTheDocument();
    });

    it("renders attribution only (no dead link) when both URLs are missing", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="hota"
          ticketUrl={null}
          infoUrl={null}
        />,
      );
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("HOTA")).toBeInTheDocument();
    });

    it("fires click telemetry on click", () => {
      const beacon = navigator.sendBeacon as ReturnType<typeof vi.fn>;
      render(
        <TicketCTA
          eventId="evt_42"
          source="moshtix"
          ticketUrl="https://moshtix.com.au/v2/event/123"
        />,
      );
      fireEvent.click(screen.getByRole("link", { name: /get tickets/i }));
      expect(beacon).toHaveBeenCalledTimes(1);
      const [path, blob] = beacon.mock.calls[0];
      expect(path).toBe("/api/analytics/ticket-click");
      // Blob is a Blob in jsdom; can't easily read body here without async.
      expect(blob).toBeInstanceOf(Blob);
    });

    it("dispatches a window event so future analytics packages can subscribe", () => {
      const listener = vi.fn();
      window.addEventListener(
        "festlio:ticket-click",
        listener as EventListener,
      );
      render(
        <TicketCTA
          eventId="evt_99"
          source="eventbrite"
          ticketUrl="https://eventbrite.com/e/xyz"
        />,
      );
      fireEvent.click(screen.getByRole("link", { name: /get tickets/i }));
      expect(listener).toHaveBeenCalledTimes(1);
      const evt = listener.mock.calls[0][0] as CustomEvent;
      expect(evt.detail).toMatchObject({
        eventId: "evt_99",
        source: "eventbrite",
        url: "https://eventbrite.com/e/xyz",
      });
      window.removeEventListener(
        "festlio:ticket-click",
        listener as EventListener,
      );
    });
  });

  describe("compact variant", () => {
    it("renders 'via {source}' text without a nested link", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="megatix"
          ticketUrl="https://megatix.com/e/1"
          variant="compact"
        />,
      );
      expect(screen.getByText(/via Megatix/i)).toBeInTheDocument();
      // Critical: compact form is used inside an <a> card so it must not
      // render its own link (nested anchors are invalid HTML).
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("renders nothing when source is unknown", () => {
      const { container } = render(
        <TicketCTA
          eventId="evt_1"
          source={null}
          ticketUrl="https://example.com"
          variant="compact"
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("mobile-sticky variant", () => {
    it("renders a compact full-width link with tracking", () => {
      render(
        <TicketCTA
          eventId="evt_1"
          source="ticketmaster"
          ticketUrl="https://ticketmaster.com.au/event/abc"
          variant="mobile-sticky"
        />,
      );
      const link = screen.getByRole("link", { name: /get tickets/i });
      expect(link).toHaveAttribute(
        "href",
        "https://ticketmaster.com.au/event/abc",
      );
      expect(link.getAttribute("rel")).toContain("nofollow");
    });
  });
});
