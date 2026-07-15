import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { RefreshCw, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CronogramaPcpRow } from "@/lib/types";

function isoWeek(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}

function weekRange(weekStr: string): { start: Date; end: Date } | null {
  const m = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const start = new Date(simple);
  start.setUTCDate(simple.getUTCDate() - ((dow + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

const statusBadge = (s: string | null) => {
  switch (s) {
    case "liberada": return "default";
    case "aberta": return "secondary";
    case "em_producao": return "outline";
    case "finalizada": return "secondary";
    case "cancelada": return "destructive";
    default: return "outline";
  }
};

function DashboardPcp() {
  const [rows, setRows] = useState<CronogramaPcpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [semana, setSemana] = useState(isoWeek(new Date()));

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: dbErr } = await supabase
        .from("vw_cronograma_pcp")
        .select("*")
        .order("data_criacao", { ascending: false })
        .limit(500);
      if (dbErr) throw new Error(dbErr.message);
      setRows((data ?? []) as CronogramaPcpRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar cronograma.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    const range = weekRange(semana);
    if (!range) return rows;
    return rows.filter((r) => {
      const ref = r.data_prevista_veiculo ?? r.data_criacao;
      if (!ref) return false;
      const d = new Date(ref);
      return d >= range.start && d < range.end;
    });
  }, [rows, semana]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard PCP</h1>
          <p className="text-sm text-muted-foreground">Cronograma de OPs por semana.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">Semana</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="week" value={semana} onChange={(e) => setSemana(e.target.value)} className="h-8 pl-7 text-xs w-48" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSemana(isoWeek(new Date()))}>Esta semana</Button>
          <Button variant="ghost" size="icon" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}

      {!loading && error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Nº OP</th>
                <th className="p-3">Referência</th>
                <th className="p-3">Produto</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3">Status</th>
                <th className="p-3">Prevista</th>
                <th className="p-3">Criada</th>
                <th className="p-3">Pai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Nenhuma OP na semana selecionada.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.op_id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono font-semibold">
                    {r.op_pai_id && <span className="text-muted-foreground mr-1">↳</span>}
                    {r.numero_op}
                  </td>
                  <td className="p-3">{r.codigo_referencia ?? "—"}</td>
                  <td className="p-3">{r.produto_final ?? r.descricao_produto ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{r.quantidade_op?.toLocaleString("pt-BR") ?? "—"}</td>
                  <td className="p-3"><Badge variant={statusBadge(r.status_op)} className="text-[10px]">{r.status_op ?? "—"}</Badge></td>
                  <td className="p-3 text-xs">{r.data_prevista_veiculo ? new Date(r.data_prevista_veiculo).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.data_criacao ? new Date(r.data_criacao).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-xs">{r.op_pai_id ? "Filha" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_pcp/pcp/")({
  component: DashboardPcp,
});
