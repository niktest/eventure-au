import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(<LoginForm />);

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows email required error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("shows invalid email error for malformed email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
  });

  it("does not show email error for valid input", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.queryByText("Email address is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Please enter a valid email address.")).not.toBeInTheDocument();
    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
  });

  it("sets aria-invalid on fields with errors", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("displays error messages with alert role", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  it("has proper input types for security", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });
});
