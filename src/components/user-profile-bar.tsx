import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import { LogOut, Shield, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LABELS_PERFIL, LABELS_SETOR } from "@/lib/perfis";

export function UserProfileBar() {
  const { user, loading, logout } = useAuth();
  const { perfil, perfilLoading } = usePerfil(user);

  // Só mostra depois do login
  if (loading || !user) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs">
      {perfilLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : perfil ? (
        <>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-bold text-xs">
            {(perfil.nome || perfil.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{perfil.nome || "Usuário"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{perfil.email}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {LABELS_PERFIL[perfil.perfil as keyof typeof LABELS_PERFIL] || perfil.perfil}
            </span>
            {perfil.setor && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {LABELS_SETOR[perfil.setor as keyof typeof LABELS_SETOR] || perfil.setor}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => logout()} title="Sair">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-xs">
            {(user.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">Usuário autenticado, mas sem perfil cadastrado.</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => logout()} title="Sair">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
