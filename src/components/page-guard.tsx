import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import { ROTAS_POR_PERFIL, type Perfil } from "@/lib/perfis";
import { AcessoNegado } from "@/components/permission-gate";
import { Loader2 } from "lucide-react";

/**
 * PageGuard — verifica se o perfil do usuário tem permissão
 * para acessar a rota atual. Se não tiver, renderiza AcessoNegado.
 *
 * Uso: envolva o conteúdo da página com <PageGuard>...</PageGuard>
 */
export function PageGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { perfil, perfilLoading, perfilBlock, perfilError } = usePerfil(user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Enquanto carrega, mostra spinner simples
  if (authLoading || perfilLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se não tem perfil ou erro no carregamento, bloqueia
  if (!perfil || perfilBlock) {
    return (
      <AcessoNegado
        mensagem={perfilError || "Usuário autenticado, mas sem perfil cadastrado. Peça ao administrador para liberar o acesso."}
      />
    );
  }

  // Se perfil está desativado
  if (!perfil.ativo) {
    return (
      <AcessoNegado mensagem="Seu perfil de acesso está desativado. Contate o administrador." />
    );
  }

  // Verifica se a rota está nas rotas permitidas para o perfil
  const rotas = ROTAS_POR_PERFIL[perfil.perfil as Perfil] || [];
  const temPermissao = rotas.some((r) => {
    if (r === "/") return pathname === "/";
    return pathname.startsWith(r);
  });

  if (!temPermissao) {
    return (
      <AcessoNegado mensagem="Acesso não permitido para o seu perfil." />
    );
  }

  // ✅ Permitido
  return <>{children}</>;
}
