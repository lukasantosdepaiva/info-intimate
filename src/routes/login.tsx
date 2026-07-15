import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase";
import { Package, Eye, EyeOff, AlertCircle, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const TEST_EMAIL = "admin@specialdecor.test";
const TEST_PASSWORD = "Admin@123456";

async function redirectByPerfil(navigate: ReturnType<typeof useNavigate>) {
  try {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      navigate({ to: "/" });
      return;
    }
    const { data } = await supabase
      .from("perfis_usuarios")
      .select("perfil")
      .eq("user_id", uid)
      .single<{ perfil: string }>();
    if (data?.perfil === "pcp") {
      navigate({ to: "/pcp" });
    } else {
      navigate({ to: "/" });
    }
  } catch {
    navigate({ to: "/" });
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      await redirectByPerfil(navigate);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login.";
      if (message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos.");
      } else if (message.includes("Email not confirmed")) {
        setError("Confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
      } else if (message.includes("User already registered")) {
        setError("Este email já está cadastrado. Faça login.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const entrarComoAdminTeste = async () => {
    setEmail(TEST_EMAIL);
    setPassword(TEST_PASSWORD);
    setError(null);
    setLoading(true);
    try {
      await login(TEST_EMAIL, TEST_PASSWORD);
      await redirectByPerfil(navigate);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login.";
      setError(
        message.includes("Invalid login credentials")
          ? "Usuário de teste não encontrado neste ambiente."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Package className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle className="text-xl font-bold">Special Decor</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={entrarComoAdminTeste}
                disabled={loading}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Entrar como Admin Teste
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                Ambiente de teste. Não usar dados reais.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


export const Route = createFileRoute("/login")({
  component: LoginPage,
});
