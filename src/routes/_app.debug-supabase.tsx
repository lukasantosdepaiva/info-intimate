import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, RefreshCw, XCircle, Loader2 } from "lucide-react";

interface QueryResult {
  name: string;
  count: number | null;
  data: unknown | null;
  error: string | null;
  status: "pending" | "success" | "error";
}

function DebugSupabasePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const runTests = useCallback(async () => {
    setLoading(true);
    setGeneralError(null);
    setResults([]);

    try {
      const supabase = getSupabase();

      const queries = [
        { name: "referencias", fn: () => supabase.from("referencias").select("*", { count: "exact", head: true }) },
        { name: "sds", fn: () => supabase.from("sds").select("*", { count: "exact", head: true }) },
        { name: "locais_estoque", fn: () => supabase.from("locais_estoque").select("*", { count: "exact", head: true }) },
        { name: "vw_saldos_por_local", fn: () => supabase.from("vw_saldos_por_local").select("*", { count: "exact", head: true }) },
        { name: "vw_dashboard_logistica", fn: () => supabase.from("vw_dashboard_logistica").select("*").limit(1) },
      ];

      const outputs: QueryResult[] = [];

      for (const q of queries) {
        try {
          const { data, error, count } = await q.fn();
          outputs.push({
            name: q.name,
            count: count ?? (Array.isArray(data) ? data.length : null),
            data: q.name === "vw_dashboard_logistica" ? (Array.isArray(data) ? data[0] ?? null : data) : null,
            error: error ? (error as { message?: string }).message || String(error) : null,
            status: error ? "error" : "success",
          });
        } catch (err) {
          outputs.push({
            name: q.name,
            count: null,
            data: null,
            error: err instanceof Error ? err.message : "Erro desconhecido",
            status: "error",
          });
        }
      }

      setResults(outputs);
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Erro ao criar client Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      runTests();
    }
  }, [mounted, runTests]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">/debug-supabase</h1>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const allSuccess = results.length > 0 && results.every((r) => r.status === "success");
  const expectedReferencias = 3;
  const expectedSds = 3;
  const expectedLocais = 83;
  const expectedSaldos = 83;

  const refResult = results.find((r) => r.name === "referencias");
  const sdsResult = results.find((r) => r.name === "sds");
  const locaisResult = results.find((r) => r.name === "locais_estoque");
  const saldosResult = results.find((r) => r.name === "vw_saldos_por_local");
  const dashResult = results.find((r) => r.name === "vw_dashboard_logistica");

  const anyWrong =
    refResult?.count !== expectedReferencias ||
    sdsResult?.count !== expectedSds ||
    locaisResult?.count !== expectedLocais ||
    saldosResult?.count !== expectedSaldos;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">/debug-supabase</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teste de conectividade direta com o Supabase.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runTests}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Testar novamente
        </Button>
      </div>

      {loading && results.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {generalError && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Erro ao conectar no Supabase</h2>
            <code className="max-w-md rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              {generalError}
            </code>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <>
          <div
            className={`rounded-lg border p-4 ${
              allSuccess && !anyWrong
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-destructive/50 bg-destructive/5"
            }`}
          >
            <div className="flex items-center gap-2">
              {allSuccess && !anyWrong ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="text-sm font-medium">
                {allSuccess && !anyWrong
                  ? "✅ Todas as consultas retornaram os valores esperados."
                  : "❌ O frontend está apontando para ambiente errado, variáveis não carregadas, cache antigo ou RLS/permissão impedindo leitura."}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <Card
                key={r.name}
                className={`shadow-none ${
                  r.status === "error" ? "border-destructive/50 bg-destructive/5" : ""
                }`}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {r.status === "pending" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {r.status === "success" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    {r.status === "error" && (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    {r.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Count: </span>
                    <span className="font-mono font-bold tabular-nums">
                      {r.count !== null ? r.count : "—"}
                    </span>
                  </div>
                  {r.name === "vw_dashboard_logistica" && r.data !== null && r.data !== undefined && (
                    <div className="max-h-24 overflow-auto rounded bg-muted p-1.5 text-[10px]">
                      <pre className="whitespace-pre-wrap font-mono break-all">
                        {JSON.stringify(r.data, null, 1)}
                      </pre>
                    </div>
                  )}
                  {r.error && (
                    <div className="rounded bg-red-500/10 px-2 py-1 text-red-400">
                      {r.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo dos testes</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Tabela/View</th>
                    <th className="py-2 font-medium">Esperado</th>
                    <th className="py-2 font-medium">Obtido</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "referencias", expected: expectedReferencias, result: refResult },
                    { name: "sds", expected: expectedSds, result: sdsResult },
                    { name: "locais_estoque", expected: expectedLocais, result: locaisResult },
                    { name: "vw_saldos_por_local", expected: expectedSaldos, result: saldosResult },
                    {
                      name: "vw_dashboard_logistica",
                      expected: "1 linha",
                      result: dashResult,
                      isData: true,
                    },
                  ].map(({ name, expected, result, isData }) => {
                    const ok = isData
                      ? result?.status === "success" && result?.data !== null
                      : result?.count === expected && result?.status === "success";
                    return (
                      <tr key={name} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{name}</td>
                        <td className="py-2 tabular-nums text-muted-foreground">
                          {expected}
                        </td>
                        <td className="py-2 font-mono font-bold tabular-nums">
                          {isData
                            ? result?.data ? "1 linha" : "—"
                            : result?.count != null
                            ? result.count
                            : "—"}
                        </td>
                        <td className="py-2">
                          {result?.status === "pending" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


export const Route = createFileRoute("/_app/debug-supabase")({
  component: DebugSupabasePage,
});
