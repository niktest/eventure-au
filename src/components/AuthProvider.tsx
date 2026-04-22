"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type User = { name?: string | null; email?: string | null; image?: string | null };
type AuthState = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthState & { refresh: () => void }>({
  user: null,
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refresh = useCallback(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        setState({ user: data?.user ?? null, loading: false });
      })
      .catch(() => {
        setState({ user: null, loading: false });
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ ...state, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
