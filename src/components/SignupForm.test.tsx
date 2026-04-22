import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "./SignupForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("SignupForm", () => {
  it("renders name, email, and password fields", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders create account button", () => {
    render(<SignupForm />);

    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows all required field errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("shows invalid email error for malformed email", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Alex Rivera");
    await user.type(screen.getByLabelText(/email address/i), "bad-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
  });

  it("shows password length error for short passwords", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Alex Rivera");
    await user.type(screen.getByLabelText(/email address/i), "alex@example.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("shows no errors when all fields are valid", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Alex Rivera");
    await user.type(screen.getByLabelText(/email address/i), "alex@example.com");
    await user.type(screen.getByLabelText(/password/i), "securepassword123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.queryByText("Full name is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Email address is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Please enter a valid email address.")).not.toBeInTheDocument();
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });

  it("sets aria-invalid on fields with errors", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("displays error messages with alert role for accessibility", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(3);
  });

  it("has proper input types", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });

  it("accepts 8-character password as valid", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Test User");
    await user.type(screen.getByLabelText(/email address/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });
});
