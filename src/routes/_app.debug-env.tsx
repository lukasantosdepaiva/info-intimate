import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

function DebugEnvPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">/debug-env</h1>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const urlOk = typeof url === "string" && url.length > 0;
  const keyOk = typeof key === "string" && key.length > 0;

  // Extract domain from URL for safe display
  let domain = "—";
  if (urlOk && url) {
    try {
      const u = new URL(url);
      domain = u.hostname;
    } catch {
      domain = url.replace(/\/rest\/v1\/?.*$/, "").replace(/^https?:\/\//, "");
    }
  }

  // Key prefix for safe display
  let keyPrefix = "—";
  if (keyOk && key) {
    keyPrefix = key.substring(0, 16) + "...";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">/debug-env</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diagnóstico de variáveis de ambiente no client-side.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-blue-400" />
            Ambiente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Executando no <strong>client</strong> (navegador)
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="block pl-6">
              typeof window: {typeof window !== "undefined" ? "✅ definido" : "❌ indefinido"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {urlOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            NEXT_PUBLIC_SUPABASE_URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            {urlOk ? (
              <span className="text-emerald-400">✅ Configurada</span>
            ) : (
              <span className="text-red-400">❌ Não configurada</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Domínio:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {domain}
            </code>
          </div>
          {!urlOk && (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                NEXT_PUBLIC_SUPABASE_URL não está definida. Configure-a e faça redeploy.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {keyOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            {keyOk ? (
              <span className="text-emerald-400">✅ Configurada</span>
            ) : (
              <span className="text-red-400">❌ Não configurada</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Prefixo:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {keyPrefix}
            </code>
          </div>
          {!keyOk && (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida. Configure-a e faça redeploy.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!urlOk || !keyOk ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            As variáveis Supabase não estão disponíveis no client-side. O Dashboard e demais
            consultas não funcionarão.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
            estão configuradas como variáveis de ambiente no sandbox e faça redeploy.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-400">
            ✅ Todas as variáveis Supabase estão configuradas no client-side.
          </p>
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/_app/debug-env")({
  component: DebugEnvPage,
});
