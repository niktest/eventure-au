// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  parseHumanitixDescription,
  parseMegatixDescription,
  parseMoshtixDescription,
} from "./parsers";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(join(__dirnameLocal, "__fixtures__", name), "utf8");

describe("parseHumanitixDescription", () => {
  it("extracts the full SSR body when present", () => {
    const html = fixture("humanitix-event.html");
    const description = parseHumanitixDescription(html);
    expect(description).not.toBeNull();
    // SSR body has the bulk vendor pitch; tagline-only fallbacks would be < 200 chars.
    expect(description!.length).toBeGreaterThan(300);
    expect(description).toContain("rockin");
    // HTML must be stripped: no angle brackets in plain text output.
    expect(description).not.toContain("<p>");
    expect(description).not.toContain("</strong>");
  });

  it("falls back to JSON-LD when the SSR body is missing", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Event","name":"X",
           "description":"Step back in time and relive the golden era of rock 'n' roll! Plenty more details fill out the section so the parser keeps the result."}
        </script>
      </head><body></body></html>
    `;
    const description = parseHumanitixDescription(html);
    expect(description).toContain("Step back in time");
  });

  it("falls back to og:description as a last resort", () => {
    const html = `<meta property="og:description" content="An evening of acoustic music with three of Australia&#39;s finest singer-songwriters performing live in the round." />`;
    const description = parseHumanitixDescription(html);
    expect(description).toContain("singer-songwriters");
  });

  it("returns null when the page has no description signal", () => {
    expect(parseHumanitixDescription("<html><body></body></html>")).toBeNull();
  });
});

describe("parseMoshtixDescription", () => {
  it("extracts the Froala editor body from a real detail page", () => {
    const html = fixture("moshtix-event.html");
    const description = parseMoshtixDescription(html);
    expect(description).not.toBeNull();
    expect(description!.length).toBeGreaterThan(200);
    expect(description).toContain("AUSTRALIA'S BIGGEST");
    expect(description).not.toMatch(/<\/?\w+/);
  });

  it("returns null when the detail page has no fr-view block", () => {
    const html = `<html><body><section id="event-details-section"><p>Nothing useful</p></section></body></html>`;
    expect(parseMoshtixDescription(html)).toBeNull();
  });
});

describe("parseMegatixDescription", () => {
  it("extracts the event-description body from a real detail page", () => {
    const html = fixture("megatix-event.html");
    const description = parseMegatixDescription(html);
    expect(description).not.toBeNull();
    expect(description!.length).toBeGreaterThan(200);
    expect(description).toContain("Sunset Yoga");
    expect(description).not.toMatch(/<\/?\w+/);
  });

  it("returns null when the event-description div is absent", () => {
    expect(parseMegatixDescription("<html><body><p>Nada</p></body></html>")).toBeNull();
  });
});
