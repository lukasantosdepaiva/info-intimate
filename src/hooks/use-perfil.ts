import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { PerfilUsuario } from "@/lib/perfis";

const TABELA_PERFIS = "perfis_usuarios";

export function usePerfil(user: import("@supabase/supabase-js").User | null) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilBlock, setPerfilBlock] = useState(false);
  const [perfilError, setPerfilError] = useState<string | null>(null);

  const buscarPerfil = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setPerfilBlock(false);
      setPerfilError(null);
      return;
    }

    setPerfilLoading(true);
    setPerfilError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from(TABELA_PERFIS)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // PGRST116 = nenhum registro encontrado (single retorna vazio)
        if (error.code === "PGRST116") {
          setPerfil(null);
          setPerfilBlock(true);
          setPerfilError("Usuário autenticado, mas sem perfil cadastrado. Peça ao administrador para liberar o acesso.");
        } else {
          // Erro real de conexão ou consulta (tabela não existe, banco offline, etc.)
          setPerfil(null);
          setPerfilBlock(true);
          setPerfilError("Não foi possível carregar seu perfil de acesso. Tente novamente ou fale com o administrador.");
        }
        return;
      }

      if (!data) {
        setPerfil(null);
        setPerfilBlock(true);
        setPerfilError("Usuário autenticado, mas sem perfil cadastrado. Peça ao administrador para liberar o acesso.");
        return;
      }

      // Sucesso — perfil encontrado
      setPerfil(data as PerfilUsuario);
      setPerfilBlock(false);
      setPerfilError(null);
    } catch (err) {
      // Erro inesperado (rede, exceção, etc.)
      setPerfil(null);
      setPerfilBlock(true);
      setPerfilError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar seu perfil de acesso. Tente novamente ou fale com o administrador."
      );
    } finally {
      setPerfilLoading(false);
    }
  }, [user]);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  return { perfil, perfilLoading, perfilBlock, perfilError, refetchPerfil: buscarPerfil };
}
