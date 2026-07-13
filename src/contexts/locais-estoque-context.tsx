import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { LocalRow } from "@/components/local-cascade-selector";

interface LocaisEstoqueContextValue {
  locais: LocalRow[];
  loading: boolean;
  error: string | null;
}

const LocaisEstoqueContext = createContext<LocaisEstoqueContextValue>({
  locais: [],
  loading: true,
  error: null,
});

export function useLocaisEstoque() {
  return useContext(LocaisEstoqueContext);
}

export function LocaisEstoqueProvider({ children }: { children: React.ReactNode }) {
  const [locais, setLocais] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();
        const { data, error: dbError } = await supabase
          .from("locais_estoque")
          .select("*")
          .order("codigo_local");
        if (dbError) throw new Error(dbError.message);
        if (!cancelado) {
          setLocais(((data ?? []) as unknown as LocalRow[]));
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Erro ao carregar locais.");
          setLocais([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <LocaisEstoqueContext.Provider value={{ locais, loading, error }}>
      {children}
    </LocaisEstoqueContext.Provider>
  );
}
