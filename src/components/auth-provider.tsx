import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
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

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
    if (!user && !isPublic) {
      navigate({ to: "/login" });
    }
    if (user && isPublic) {
      navigate({ to: "/" });
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
    navigate({ to: "/login" });
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
