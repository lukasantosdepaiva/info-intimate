import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Package, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuickLogin = {
  label: string;
  email: string;
  password: string;
};

const QUICK_LOGINS: QuickLogin[] = import.meta.env.DEV
  ? [
      {
        label: "Entrar como Administrador",
        email: import.meta.env.VITE_TEST_ADMIN_EMAIL ?? "",
        password: import.meta.env.VITE_TEST_ADMIN_PASSWORD ?? "",
      },
      {
        label: "Entrar como PCP",
        email: import.meta.env.VITE_TEST_PCP_EMAIL ?? "",
        password: import.meta.env.VITE_TEST_PCP_PASSWORD ?? "",
      },
    ].filter((account) => account.email && account.password)
  : [];

function loginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Erro ao fazer login.";
  if (message.includes("Invalid login credentials")) return "Email ou senha incorretos.";
  if (message.includes("Email not confirmed")) {
    return "Confirme seu email antes de fazer login. Verifique sua caixa de entrada.";
  }
  if (message.includes("User already registered")) {
    return "Este email já está cadastrado. Faça login.";
  }
  return message;
}

function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoginLabel, setQuickLoginLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPassword: string, label?: string) => {
    setError(null);
    setLoading(true);
    setQuickLoginLabel(label ?? null);

    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
      setQuickLoginLabel(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
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
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && !quickLoginLabel && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading && !quickLoginLabel ? "Entrando..." : "Entrar"}
            </Button>

            {QUICK_LOGINS.length > 0 && (
              <div className="w-full space-y-2 border-t pt-3">
                <p className="text-center text-xs font-medium text-muted-foreground">
                  Acessos rápidos — somente ambiente de teste
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_LOGINS.map((account) => (
                    <Button
                      key={account.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => performLogin(account.email, account.password, account.label)}
                      className="gap-2"
                    >
                      {quickLoginLabel === account.label && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {quickLoginLabel === account.label ? "Entrando..." : account.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
