import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Database,
  CheckCircle2,
  XCircle,
  Shield,
  Info,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

const STORAGE_KEY = "special_decor_prefs";

function safeJsonParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;

  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

interface UserPrefs {
  showBanner: boolean;
  tema: "light" | "dark" | "system";
  densidade: "comfortable" | "compact";
  pagina: number;
}

const defaultPrefs: UserPrefs = {
  showBanner: true,
  tema: "system",
  densidade: "comfortable",
  pagina: 25,
};

function ConfiguracoesPage() {
  const [mounted, setMounted] = useState(false);
  const { setTheme } = useTheme();

  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">(
    "checking"
  );
  const [modulos, setModulos] = useState<
    Record<string, { status: "ok" | "erro"; label: string }>
  >({});
  const [dadosTeste, setDadosTeste] = useState<Record<string, number>>({});
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = safeJsonParse<Partial<UserPrefs> | null>(
      localStorage.getItem(STORAGE_KEY),
      null
    );

    if (saved) {
      setPrefs((prev) => ({ ...prev, ...saved }));
    }
  }, []);

  const savePrefs = useCallback((updates: Partial<UserPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Mantém silencioso para não quebrar a tela caso o navegador bloqueie storage.
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (prefs.tema === "system") {
      setTheme("system");
    } else if (prefs.tema === "light") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }, [prefs.tema, mounted, setTheme]);

  const rodarDiagnostico = useCallback(async () => {
    setAtualizando(true);
    setDbStatus("checking");

    const tabelas = [
      { key: "recebimentos", label: "Recebimento" },
      { key: "pallets", label: "Pallets" },
      { key: "movimentacoes", label: "Movimentação" },
      { key: "inspecoes", label: "Inspeção" },
      { key: "rncs", label: "RNC" },
      { key: "saidas_armazem_05", label: "Saída" },
      { key: "veiculos", label: "Veículos" },
      { key: "ops_pcp", label: "PCP" },
      { key: "historico_eventos", label: "Histórico" },
    ];

    const mods: Record<string, { status: "ok" | "erro"; label: string }> = {};
    const dados: Record<string, number> = {};

    try {
      const supabase = getSupabase();

      const { error: pingErr } = await supabase
        .from("referencias")
        .select("id", { count: "exact", head: true });

      setDbStatus(pingErr ? "error" : "connected");

      for (const t of tabelas) {
        try {
          const { count, error } = await supabase
            .from(t.key)
            .select("*", { count: "exact", head: true });

          mods[t.key] = {
            status: error ? "erro" : "ok",
            label: t.label,
          };

          dados[t.label] = count ?? 0;
        } catch {
          mods[t.key] = {
            status: "erro",
            label: t.label,
          };

          dados[t.label] = 0;
        }
      }
    } catch {
      setDbStatus("error");

      for (const t of tabelas) {
        mods[t.key] = {
          status: "erro",
          label: t.label,
        };

        dados[t.label] = 0;
      }
    } finally {
      setModulos(mods);
      setDadosTeste(dados);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    rodarDiagnostico();
  }, [rodarDiagnostico]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-600">
          Ambiente de teste. Não inserir dados reais, pessoais ou sigilosos.
        </div>

        <Skeleton className="h-8 w-48" />

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      {prefs.showBanner && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-600">
          Ambiente de teste. Não inserir dados reais, pessoais ou sigilosos.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preferências e diagnóstico do sistema.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={rodarDiagnostico}
          disabled={atualizando}
          title="Atualizar diagnóstico"
        >
          <RefreshCw
            className={`h-4 w-4 ${atualizando ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-muted-foreground" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Nome:</span>
            <p className="font-semibold">Special Decor — Gestão Logística</p>
          </div>

          <div>
            <span className="text-muted-foreground">Ambiente:</span>
            <div className="mt-0.5">
              <Badge variant="secondary" className="text-[10px]">
                Teste
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Versão:</span>
            <p className="font-mono text-xs">1.0.0-teste</p>
          </div>

          <div>
            <span className="text-muted-foreground">Supabase:</span>

            <div className="mt-0.5 flex items-center gap-1">
              {dbStatus === "checking" ? (
                <Skeleton className="h-4 w-20" />
              ) : dbStatus === "connected" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">
                    Desconectado
                  </span>
                </>
              )}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Última validação:</span>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Preferências Visuais
          </CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tema</label>

            <div className="flex gap-2">
              <button
                onClick={() => savePrefs({ tema: "light" })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  prefs.tema === "light"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <Sun className="h-4 w-4" />
                Claro
              </button>

              <button
                onClick={() => savePrefs({ tema: "dark" })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  prefs.tema === "dark"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <Moon className="h-4 w-4" />
                Escuro
              </button>

              <button
                onClick={() => savePrefs({ tema: "system" })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  prefs.tema === "system"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <Monitor className="h-4 w-4" />
                Sistema
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Densidade</label>

            <Select
              value={prefs.densidade}
              onValueChange={(v) =>
                savePrefs({ densidade: v as "comfortable" | "compact" })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="compact">Compacta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Itens por página</label>

            <Select
              value={String(prefs.pagina)}
              onValueChange={(v) => savePrefs({ pagina: Number(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />

            <label
              htmlFor="banner-toggle"
              className="flex-1 cursor-pointer text-xs"
            >
              Exibir banner &ldquo;Ambiente de teste&rdquo;
            </label>

            <Switch
              id="banner-toggle"
              checked={prefs.showBanner}
              onCheckedChange={(v) => savePrefs({ showBanner: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Diagnóstico do Sistema
          </CardTitle>
        </CardHeader>

        <CardContent>
          {atualizando ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(modulos).map(([key, m]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                >
                  {m.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}

                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-muted-foreground" />
            Dados no Sistema
          </CardTitle>
        </CardHeader>

        <CardContent>
          {atualizando ? (
            <Skeleton className="h-20 w-full" />
          ) : Object.keys(dadosTeste).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(dadosTeste).map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-md border bg-muted/20 px-3 py-2 text-center"
                >
                  <div className="text-lg font-bold tabular-nums">
                    {count.toLocaleString("pt-BR")}
                  </div>

                  <div className="text-[10px] text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-destructive" />
            Segurança
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            RLS Fase 1 aplicada. Acesso anônimo bloqueado. RLS final por perfil
            ainda pendente antes de produção.
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Login implementado", done: true },
              { label: "Perfis implementados", done: true },
              { label: "Permissões visuais implementadas", done: true },
              { label: "RLS Fase 1 aplicada", done: true },
              { label: "RLS final por perfil", done: false },
              { label: "Dados reais permitidos", done: false },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}

                <span className={item.done ? "" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});
