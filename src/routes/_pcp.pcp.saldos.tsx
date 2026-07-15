import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { useLocaisEstoque } from "@/contexts/locais-estoque-context";
import { RefreshCw, AlertCircle, Search, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaldoRow = Record<string, any>;

function SaldosPage() {
  const { locais } = useLocaisEstoque();
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [armazem, setArmazem] = useState("");

  const armazens = useMemo(() => {
    const s = new Set(locais.map((l) => l.armazem_codigo));
    return Array.from(s).sort();
  }, [locais]);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: e } = await supabase
        .from("saldos_pallet")
        .select("*, locais_estoque!local_id(descricao,armazem_codigo,armazem_nome), referencias!referencia_id(codigo_referencia,descricao)")
        .limit(1000);
      if (e) throw new Error(e.message);
      setRows((data ?? []) as SaldoRow[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar saldos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const codigo = r.referencias?.codigo_referencia ?? "";
      const arm = r.locais_estoque?.armazem_codigo ?? "";
      if (busca.trim() && !codigo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (armazem && arm !== armazem) return false;
      return true;
    });
  }, [rows, busca, armazem]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulta de Saldo</h1>
          <p className="text-sm text-muted-foreground">Somente leitura. O PCP não movimenta estoque.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por referência..." className="pl-10 text-xs" />
        </div>
        <div className="w-full sm:w-52">
          <Select value={armazem} onValueChange={setArmazem}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todos os armazéns" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              {armazens.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {!loading && error && <Card className="border-destructive/50 bg-destructive/5"><CardContent className="flex items-center gap-3 py-6"><AlertCircle className="h-5 w-5 text-destructive" /><p className="text-sm">{error}</p></CardContent></Card>}
      {!loading && !error && filtered.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Warehouse className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Sem saldos</h3>
        </CardContent></Card>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Referência</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Armazém</th>
                <th className="p-3">Local</th>
                <th className="p-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id ?? i} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono">{r.referencias?.codigo_referencia ?? "—"}</td>
                  <td className="p-3">{r.referencias?.descricao ?? "—"}</td>
                  <td className="p-3 text-xs">{r.locais_estoque?.armazem_codigo ?? "—"}</td>
                  <td className="p-3 text-xs">{r.locais_estoque?.descricao ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {(r.saldo_atual ?? r.quantidade ?? r.saldo ?? 0).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
        ℹ️ Tela somente leitura. Para movimentar estoque, use o módulo de Logística.
      </div>
    </main>
  );
}

export const Route = createFileRoute("/_app/pcp/saldos")({
  component: SaldosPage,
});
