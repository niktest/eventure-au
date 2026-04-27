import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

const ENV_KEY = "NEXT_PUBLIC_SITE_URL";

describe("getSiteUrl", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("falls back to the staging URL when env var is unset", () => {
    delete process.env[ENV_KEY];
    expect(getSiteUrl()).toBe("https://eventure-au.vercel.app");
  });

  it("falls back to the staging URL when env var is empty or whitespace", () => {
    process.env[ENV_KEY] = "   ";
    expect(getSiteUrl()).toBe("https://eventure-au.vercel.app");
  });

  it("strips a trailing newline", () => {
    process.env[ENV_KEY] = "https://example.com\n";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("strips surrounding whitespace including \\r\\n", () => {
    process.env[ENV_KEY] = "  https://example.com\r\n  ";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("strips trailing slashes", () => {
    process.env[ENV_KEY] = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("returns the value unchanged when clean", () => {
    process.env[ENV_KEY] = "https://eventure-au.vercel.app";
    expect(getSiteUrl()).toBe("https://eventure-au.vercel.app");
  });
});
