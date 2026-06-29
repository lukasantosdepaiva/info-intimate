import { ShieldAlert, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

/**
 * Componente que exibe uma mensagem de "Acesso não permitido"
 * e um botão de logout, usado quando o usuário está logado
 * mas não tem permissão para a rota atual.
 */
export function AcessoNegado({ mensagem }: { mensagem?: string }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Acesso não permitido</h2>
          <p className="text-sm text-muted-foreground">
            {mensagem ?? "Seu perfil de usuário não tem permissão para acessar esta página."}
          </p>
          <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2 mt-2">
            <LogOut className="h-4 w-4" />
            Sair e voltar ao login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
