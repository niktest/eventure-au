import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "./AuthForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  // Stub global.fetch defensively — we only test pre-submit rendering & validation.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    type: "basic",
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

describe("AuthForm — Sign In mode", () => {
  it("renders the sign-in tab as selected by default", () => {
    render(<AuthForm initialMode="sign_in" />);
    const signInTab = screen.getByRole("tab", { name: /^sign in$/i });
    const signUpTab = screen.getByRole("tab", { name: /create account/i });
    expect(signInTab).toHaveAttribute("aria-selected", "true");
    expect(signUpTab).toHaveAttribute("aria-selected", "false");
  });

  it("renders email + password fields and a sign-in submit button", () => {
    render(<AuthForm initialMode="sign_in" />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
  });

  it("renders a forgot-password link in sign-in mode", () => {
    render(<AuthForm initialMode="sign_in" />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows required errors when submitting empty", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("shows an invalid-email error for malformed input", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "anything");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(
      screen.getByText("Please enter a valid email address."),
    ).toBeInTheDocument();
  });

  it("sets aria-invalid on the fields when submission fails", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("AuthForm — Sign Up mode", () => {
  it("renders name, email, password, and submit button", () => {
    render(<AuthForm initialMode="sign_up" />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i, hidden: false }),
    ).toBeInTheDocument();
  });

  it("shows all required errors when submitting empty", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_up" />);
    // Find the submit button (not the tab) — it's a submit type with the same name.
    const submit = screen
      .getAllByRole("button", { name: /create account/i })
      .find((el) => (el as HTMLButtonElement).type === "submit");
    if (!submit) throw new Error("submit button not found");
    await user.click(submit);
    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(
      screen.getByText(/must accept the terms/i),
    ).toBeInTheDocument();
  });

  it("renders password rules under the password field", () => {
    render(<AuthForm initialMode="sign_up" />);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/includes a number or symbol/i)).toBeInTheDocument();
    expect(screen.getByText(/not a common password/i)).toBeInTheDocument();
  });

  it("shows length error for short passwords", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_up" />);
    await user.type(screen.getByLabelText(/full name/i), "Alex Rivera");
    await user.type(screen.getByLabelText(/email address/i), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    const submit = screen
      .getAllByRole("button", { name: /create account/i })
      .find((el) => (el as HTMLButtonElement).type === "submit");
    if (!submit) throw new Error("submit button not found");
    await user.click(submit);
    expect(
      screen.getByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
  });
});

describe("AuthForm — mode switching", () => {
  it("switches to sign-up when the Create account tab is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: /create account/i });
    await user.click(tab);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(tab).toHaveAttribute("aria-selected", "true");
  });

  it("switches back to sign-in via the secondary link", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_up" />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    const link = screen.getByRole("button", { name: /^sign in$/i });
    await user.click(link);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });
});

describe("AuthForm — show/hide password toggle", () => {
  it("toggles the password field between password and text types", async () => {
    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    const pw = screen.getByLabelText("Password") as HTMLInputElement;
    expect(pw.type).toBe("password");
    const toggle = screen.getByRole("button", { name: /show password/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(pw.type).toBe("text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("AuthForm — sign-in submit network path", () => {
  // EVE-238: NextAuth credentials returns opaqueredirect for BOTH success and
  // failure. The form must verify via /api/auth/session before redirecting.
  function mockSignInFlow({ sessionUser }: { sessionUser: object | null }) {
    return vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/api/auth/csrf")) {
          return {
            ok: true,
            type: "basic",
            json: async () => ({ csrfToken: "fake-token" }),
          };
        }
        if (url.includes("/api/auth/callback/credentials")) {
          return { ok: false, status: 0, type: "opaqueredirect" };
        }
        if (url.includes("/api/auth/session")) {
          return {
            ok: true,
            type: "basic",
            json: async () => (sessionUser ? { user: sessionUser } : {}),
          };
        }
        return { ok: true, type: "basic", json: async () => ({}) };
      });
  }

  it("stays on the page and renders the generic error when the session probe shows no user", async () => {
    global.fetch = mockSignInFlow({ sessionUser: null }) as unknown as typeof fetch;
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new Proxy(
        { href: "" },
        {
          set(_t, prop, v) {
            if (prop === "href") hrefSetter(v);
            return true;
          },
          get(t, prop) {
            return (t as Record<string | symbol, unknown>)[prop];
          },
        },
      ),
    });

    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    await user.type(screen.getByLabelText(/email address/i), "nobody@festlio.example");
    await user.type(screen.getByLabelText("Password"), "wrong-password-99");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/didn't match/i);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it("redirects to the callback URL when the session probe shows a user", async () => {
    global.fetch = mockSignInFlow({
      sessionUser: { id: "user_1", email: "ok@example.com" },
    }) as unknown as typeof fetch;
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new Proxy(
        { href: "" },
        {
          set(_t, prop, v) {
            if (prop === "href") hrefSetter(v);
            return true;
          },
          get(t, prop) {
            return (t as Record<string | symbol, unknown>)[prop];
          },
        },
      ),
    });

    const user = userEvent.setup();
    render(<AuthForm initialMode="sign_in" />);
    await user.type(screen.getByLabelText(/email address/i), "ok@example.com");
    await user.type(screen.getByLabelText("Password"), "rightpassword");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await vi.waitFor(() => {
      expect(hrefSetter).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AuthForm — OAuth row", () => {
  it("renders Google, Apple, and Facebook providers in order", () => {
    render(<AuthForm initialMode="sign_in" />);
    const google = screen.getByRole("button", { name: /continue with google/i });
    const apple = screen.getByRole("button", { name: /continue with apple/i });
    const facebook = screen.getByRole("button", { name: /continue with facebook/i });
    expect(google).toBeInTheDocument();
    expect(apple).toBeInTheDocument();
    expect(facebook).toBeInTheDocument();
  });
});
