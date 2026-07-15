import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import { RefreshCw, Plus, Search, AlertCircle, Route as RouteIcon, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoteiroProducao } from "@/lib/types";

type Row = RoteiroProducao & { codigo_referencia?: string };

function RoteirosPage() {
  const { user } = useAuth();
  const { perfil } = usePerfil(user);
  const canWrite = perfil?.perfil === "pcp" || perfil?.perfil === "admin";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: e } = await supabase
        .from("roteiros_producao")
        .select("*, referencias!referencia_id(codigo_referencia)")
        .order("created_at", { ascending: false });
      if (e) throw new Error(e.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRows(((data ?? []) as any[]).map((r: any) => ({ ...r, codigo_referencia: r.referencias?.codigo_referencia ?? "—" })));
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar roteiros."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    if (!busca.trim()) return rows;
    const q = busca.toLowerCase();
    return rows.filter((r) => (r.codigo_referencia ?? "").toLowerCase().includes(q) || (r.descricao ?? "").toLowerCase().includes(q));
  }, [rows, busca]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roteiros de Produção</h1>
          <p className="text-sm text-muted-foreground">Sequência de operações por produto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
          {canWrite && (
            <Button size="sm" className="gap-1" asChild>
              <Link to="/pcp/roteiros/$id" params={{ id: "novo" }}><Plus className="h-4 w-4" /> Novo Roteiro</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por referência ou descrição..." className="pl-10 text-xs" />
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {!loading && error && <Card className="border-destructive/50 bg-destructive/5"><CardContent className="flex items-center gap-3 py-6"><AlertCircle className="h-5 w-5 text-destructive" /><p className="text-sm">{error}</p></CardContent></Card>}
      {!loading && !error && filtered.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <RouteIcon className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Nenhum roteiro</h3>
        </CardContent></Card>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Produto (Ref)</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono">{r.codigo_referencia}</td>
                  <td className="p-3">{r.descricao ?? "—"}</td>
                  <td className="p-3"><Badge variant={r.ativo ? "default" : "secondary"} className="text-[10px]">{r.ativo ? "ativo" : "inativo"}</Badge></td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="sm" className="h-7 gap-1" asChild>
                      <Link to="/pcp/roteiros/$id" params={{ id: r.id }}>Abrir <ChevronRight className="h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_pcp/pcp/roteiros")({
  component: RoteirosPage,
});
