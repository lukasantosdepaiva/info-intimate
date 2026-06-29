/**
 * Estrutura e definições de perfis e permissões.
 *
 * Tabela real: perfis_usuarios (sem prefixo — o banco não usa prefixo nas tabelas).
 *
 * Para criar (se ainda não existir), execute no SQL Editor do Supabase:
 *
 * CREATE TABLE IF NOT EXISTS perfis_usuarios (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   nome text,
 *   email text NOT NULL,
 *   perfil text NOT NULL CHECK (perfil IN ('admin', 'pcp', 'logistica', 'qualidade', 'portaria', 'consulta')),
 *   setor text CHECK (setor IN ('administração', 'pcp', 'logística', 'qualidade', 'expedição', 'portaria', 'consulta')),
 *   ativo boolean NOT NULL DEFAULT true,
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * CREATE UNIQUE INDEX IF NOT EXISTS perfis_usuarios_user_id_idx ON perfis_usuarios(user_id);
 * CREATE INDEX IF NOT EXISTS perfis_usuarios_email_idx ON perfis_usuarios(email);
 *
 * -- Policy mínima temporária: usuário autenticado pode ler seu próprio perfil
 * ALTER TABLE perfis_usuarios ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Usuário pode ler seu próprio perfil"
 *   ON perfis_usuarios FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * -- Inserir perfil admin (substituir o UUID pelo real user_id do Auth)
 * INSERT INTO perfis_usuarios (user_id, nome, email, perfil, setor, ativo)
 * VALUES ('SUBSTITUA_PELO_USER_ID_REAL', 'Administrador Teste', 'admin@specialdecor.test', 'admin', 'administração', true);
 */

export type Perfil = "admin" | "pcp" | "logistica" | "qualidade" | "portaria" | "consulta";
export type Setor = "administração" | "pcp" | "logística" | "qualidade" | "expedição" | "portaria" | "consulta";

export interface PerfilUsuario {
  id: string;
  user_id: string;
  nome: string | null;
  email: string;
  perfil: Perfil;
  setor: Setor | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const PERFIS_VALIDOS: Perfil[] = ["admin", "pcp", "logistica", "qualidade", "portaria", "consulta"];
export const SETORES_VALIDOS: Setor[] = ["administração", "pcp", "logística", "qualidade", "expedição", "portaria", "consulta"];

/** Definição das rotas permitidas por perfil.
 *  Se um perfil não estiver listado, não tem acesso àquela rota. */
export const ROTAS_POR_PERFIL: Record<Perfil, string[]> = {
  admin: [
    "/", "/recebimento", "/pallets", "/estoque", "/movimentacoes",
    "/aprovacoes", "/inspecao", "/inspecao/rnc", "/pcp",
    "/saidas", "/veiculos", "/historico", "/relatorios", "/configuracoes",
  ],
  pcp: [
    "/", "/pcp", "/relatorios", "/historico",
  ],
  logistica: [
    "/", "/recebimento", "/pallets", "/estoque", "/movimentacoes",
    "/aprovacoes", "/saidas", "/veiculos", "/historico", "/relatorios",
  ],
  qualidade: [
    "/", "/pallets", "/estoque", "/inspecao", "/inspecao/rnc",
    "/historico", "/relatorios",
  ],
  portaria: [
    "/", "/veiculos", "/saidas", "/historico",
  ],
  consulta: [
    "/", "/pallets", "/estoque", "/historico", "/relatorios",
  ],
};

export const LABELS_PERFIL: Record<Perfil, string> = {
  admin: "Administrador",
  pcp: "PCP",
  logistica: "Logística",
  qualidade: "Qualidade",
  portaria: "Portaria",
  consulta: "Consulta",
};

export const LABELS_SETOR: Record<Setor, string> = {
  administração: "Administração",
  pcp: "PCP",
  logística: "Logística",
  qualidade: "Qualidade",
  expedição: "Expedição",
  portaria: "Portaria",
  consulta: "Consulta",
};
