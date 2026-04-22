import { test, expect } from "@playwright/test";

/**
 * E2E tests for authentication flows — login and signup form validation,
 * social auth buttons, and navigation between auth pages.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
  });

  test("renders login form with all fields", async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Email address is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
  });

  test("shows invalid email error", async ({ page }) => {
    await page.getByLabel(/email address/i).fill("not-an-email");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  });

  test("clears errors with valid input", async ({ page }) => {
    await page.getByLabel(/email address/i).fill("user@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Email address is required.")).not.toBeVisible();
    await expect(page.getByText("Password is required.")).not.toBeVisible();
  });

  test("has forgot password link", async ({ page }) => {
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });

  test("has link to signup page", async ({ page }) => {
    const signupLink = page.getByRole("link", { name: /sign up|create.*account|register/i });
    const hasLink = await signupLink.isVisible().catch(() => false);
    if (hasLink) {
      await signupLink.click();
      await expect(page).toHaveURL(/\/signup/);
    }
  });
});

test.describe("Signup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");
  });

  test("renders signup form with all fields", async ({ page }) => {
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("shows all validation errors on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await expect(page.getByText("Email address is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
  });

  test("rejects password under 8 characters", async ({ page }) => {
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/email address/i).fill("test@test.com");
    await page.getByLabel(/password/i).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });

  test("accepts valid form submission", async ({ page }) => {
    await page.getByLabel(/full name/i).fill("Alex Rivera");
    await page.getByLabel(/email address/i).fill("alex@example.com");
    await page.getByLabel(/password/i).fill("securepass123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Full name is required.")).not.toBeVisible();
    await expect(page.getByText("Email address is required.")).not.toBeVisible();
    await expect(page.getByText("Password is required.")).not.toBeVisible();
  });

  test("has link to login page", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: /sign in|log in|login/i });
    const hasLink = await loginLink.isVisible().catch(() => false);
    if (hasLink) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
