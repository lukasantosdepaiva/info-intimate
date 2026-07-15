import { useNavigate, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { getAuthenticatedLandingPath } from "@/lib/auth-landing";
import type { User } from "@supabase/supabase-js";
import { LocaisEstoqueProvider } from "@/contexts/locais-estoque-context";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const redirectRequest = useRef(0);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (active) setUser(data.user ?? null);
      } catch {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
    if (!user && !isPublic) {
      redirectRequest.current += 1;
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (user && isPublic) {
      const requestId = ++redirectRequest.current;
      void getAuthenticatedLandingPath(user.id)
        .then((to) => {
          if (redirectRequest.current === requestId) {
            void navigate({ to, replace: true });
          }
        })
        .catch(() => {
          if (redirectRequest.current === requestId) {
            void navigate({ to: "/", replace: true });
          }
        });
    }
  }, [user, loading, pathname, navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabase();
    try {
      await supabase.auth.signOut();
    } finally {
      if (import.meta.env.DEV && typeof window !== "undefined") {
        window.sessionStorage.setItem("info-intimate:skip-pcp-auto-login-once", "true");
      }
      redirectRequest.current += 1;
      setUser(null);
      setLoading(false);
      void navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      <LocaisEstoqueProvider userId={user?.id ?? null}>{children}</LocaisEstoqueProvider>
    </AuthContext.Provider>
  );
}
