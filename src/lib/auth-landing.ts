import { getSupabase } from "@/lib/supabase";

export type AuthenticatedLandingPath = "/" | "/pcp";

interface AccessProfile {
  perfil: string;
  ativo: boolean;
}

/** Resolve o destino inicial sem duplicar a regra entre login e provider. */
export async function getAuthenticatedLandingPath(
  userId: string,
): Promise<AuthenticatedLandingPath> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const profile = data as AccessProfile | null;
  if (!profile) throw new Error("Usuário autenticado sem perfil de acesso.");
  if (!profile.ativo) throw new Error("Perfil de acesso desativado.");

  return profile.perfil === "pcp" ? "/pcp" : "/";
}
