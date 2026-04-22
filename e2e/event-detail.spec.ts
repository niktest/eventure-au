import { test, expect } from "@playwright/test";

/**
 * E2E tests for the event detail page — covers the "Interested" button,
 * map rendering, ticket links, and similar events section.
 *
 * Prerequisites:
 * - App running (npm run dev or deployed URL via BASE_URL env)
 * - Database seeded with at least one published event with coordinates
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Event Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the events listing and click the first event
    await page.goto(`${BASE_URL}/events`);
    const firstEventLink = page.locator('a[href^="/events/"]').first();
    await expect(firstEventLink).toBeVisible({ timeout: 10000 });
    await firstEventLink.click();
    await page.waitForLoadState("networkidle");
  });

  test("displays event name and details", async ({ page }) => {
    // The h1 should contain the event name
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test("renders category chip", async ({ page }) => {
    // Category chip is the first span with rounded-full in the header card
    const categoryChip = page.locator(".rounded-full").first();
    await expect(categoryChip).toBeVisible();
  });

  test("shows date and time information", async ({ page }) => {
    // Date & time section
    const dateTimeLabel = page.getByText("Date & Time");
    await expect(dateTimeLabel).toBeVisible();
  });

  test("displays Interested button or Get Tickets link", async ({ page }) => {
    // Either the "Interested" button or "Get Tickets" link should be present
    const interestedBtn = page.getByRole("button", { name: /interested/i });
    const ticketsLink = page.getByRole("link", { name: /get tickets/i });

    const hasInterested = await interestedBtn.isVisible().catch(() => false);
    const hasTickets = await ticketsLink.isVisible().catch(() => false);

    expect(hasInterested || hasTickets).toBe(true);
  });

  test("Interested button is clickable", async ({ page }) => {
    const interestedBtn = page.getByRole("button", { name: /interested/i });
    const isVisible = await interestedBtn.isVisible().catch(() => false);

    if (isVisible) {
      // Verify the button is enabled and clickable
      await expect(interestedBtn).toBeEnabled();
      await interestedBtn.click();
      // Button should still be visible after click (no crash)
      await expect(interestedBtn).toBeVisible();
    }
  });

  test("Get Tickets link opens in new tab", async ({ page }) => {
    const ticketsLink = page.getByRole("link", { name: /get tickets/i });
    const isVisible = await ticketsLink.isVisible().catch(() => false);

    if (isVisible) {
      const target = await ticketsLink.getAttribute("target");
      expect(target).toBe("_blank");
      const rel = await ticketsLink.getAttribute("rel");
      expect(rel).toContain("noopener");
    }
  });
});

test.describe("Event Detail — Map", () => {
  test("renders map iframe when event has coordinates", async ({ page }) => {
    // Go to events listing and find an event with a venue
    await page.goto(`${BASE_URL}/events`);
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 10000 });
    await eventLink.click();
    await page.waitForLoadState("networkidle");

    // Check for the venue details section
    const venueSection = page.getByText("Venue Details");
    const hasVenue = await venueSection.isVisible().catch(() => false);

    if (hasVenue) {
      // If venue details exist, look for a map iframe or location icon
      const mapIframe = page.locator('iframe[title*="Map"]');
      const locationIcon = page.locator('text=location_on');

      const hasMap = await mapIframe.isVisible().catch(() => false);
      const hasLocationIcon = await locationIcon.first().isVisible().catch(() => false);

      // One of these should be present
      expect(hasMap || hasLocationIcon).toBe(true);

      if (hasMap) {
        const src = await mapIframe.getAttribute("src");
        expect(src).toBeTruthy();
        // Should be either Google Maps or OpenStreetMap
        expect(
          src?.includes("google.com/maps") || src?.includes("openstreetmap.org")
        ).toBe(true);
      }
    }
  });

  test("map iframe has proper accessibility attributes", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 10000 });
    await eventLink.click();
    await page.waitForLoadState("networkidle");

    const mapIframe = page.locator('iframe[title*="Map"]');
    const hasMap = await mapIframe.isVisible().catch(() => false);

    if (hasMap) {
      const title = await mapIframe.getAttribute("title");
      expect(title).toBeTruthy();
      expect(title?.length).toBeGreaterThan(0);
    }
  });
});

test.describe("Event Detail — SEO", () => {
  test("page has JSON-LD schema markup", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 10000 });
    await eventLink.click();
    await page.waitForLoadState("networkidle");

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();

    const content = await jsonLd.textContent();
    expect(content).toBeTruthy();

    const parsed = JSON.parse(content!);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Event");
    expect(parsed.name).toBeTruthy();
    expect(parsed.startDate).toBeTruthy();
  });
});

test.describe("Event Detail — Similar Events", () => {
  test("similar events section renders when available", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 10000 });
    await eventLink.click();
    await page.waitForLoadState("networkidle");

    const similarHeading = page.getByText("Similar events you might like");
    const hasSimilar = await similarHeading.isVisible().catch(() => false);

    if (hasSimilar) {
      // Should have event cards
      const cards = page.locator('a[href^="/events/"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
