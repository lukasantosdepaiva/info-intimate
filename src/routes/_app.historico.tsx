import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { getSupabase } from "@/lib/supabase";
import { History, AlertCircle, RefreshCw, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricoRow {
  id: number;
  data_hora: string;
  tipo_evento: string;
  codigo_pallet: string;
  nf_entrada: string;
  referencia: string;
  sd: string;
  op: string;
  origem: string;
  destino: string;
  quantidade: number;
  responsavel: string;
  descricao: string;
  detalhes: string;
}

const TIPO_EVENTO_LABELS: Record<string, string> = {
  recebimento: "Recebimento",
  movimentacao: "Movimentação",
  inspecao: "Inspeção",
  rnc: "RNC",
  saida: "Saída",
  veiculo: "Veículo",
};

const TIPO_EVENTO_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recebimento: "default",
  movimentacao: "secondary",
  inspecao: "outline",
  rnc: "destructive",
  saida: "outline",
  veiculo: "secondary",
};

function HistoricoContent({ initialPallet = "" }: { initialPallet?: string }) {
  const [data, setData] = useState<HistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fNf, setFNf] = useState("");
  const [fOp, setFOp] = useState("");
  const [fPallet, setFPallet] = useState(initialPallet);
  const [fReferencia, setFReferencia] = useState("");
  const [fSd, setFSd] = useState("");
  const [fTipo, setFTipo] = useState("");
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);
  const [fDataInicio, setFDataInicio] = useState(trintaDiasAtras.toISOString().split("T")[0]);
  const [fDataFim, setFDataFim] = useState(hoje.toISOString().split("T")[0]);
  const [fResponsavel, setFResponsavel] = useState("");

  const fetchHistorico = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      let query = supabase
        .from("vw_historico_completo")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (fDataInicio) query = query.gte("created_at", `${fDataInicio}T00:00:00`);
      if (fDataFim) query = query.lte("created_at", `${fDataFim}T23:59:59`);
      const { data: rows, error: dbError } = await query;

      if (dbError) throw new Error(dbError.message);
      setData((rows as HistoricoRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar histórico.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fDataInicio, fDataFim]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (fNf && !r.nf_entrada?.toLowerCase().includes(fNf.toLowerCase())) return false;
      if (fOp && !r.op?.toLowerCase().includes(fOp.toLowerCase())) return false;
      if (fPallet && !r.codigo_pallet?.toLowerCase().includes(fPallet.toLowerCase())) return false;
      if (fReferencia && !r.referencia?.toLowerCase().includes(fReferencia.toLowerCase()))
        return false;
      if (fSd && !r.sd?.toLowerCase().includes(fSd.toLowerCase())) return false;
      if (fTipo && r.tipo_evento !== fTipo) return false;
      if (fDataInicio && r.data_hora && new Date(r.data_hora) < new Date(fDataInicio)) return false;
      if (fDataFim && r.data_hora && new Date(r.data_hora) > new Date(fDataFim + "T23:59:59"))
        return false;
      if (fResponsavel && !r.responsavel?.toLowerCase().includes(fResponsavel.toLowerCase()))
        return false;
      return true;
    });
  }, [data, fNf, fOp, fPallet, fReferencia, fSd, fTipo, fDataInicio, fDataFim, fResponsavel]);

  const hasFilters =
    fNf || fOp || fPallet || fReferencia || fSd || fTipo || fDataInicio || fDataFim || fResponsavel;

  const clearFilters = () => {
    setFNf("");
    setFOp("");
    setFPallet("");
    setFReferencia("");
    setFSd("");
    setFTipo("");
    setFDataInicio("");
    setFDataFim("");
    setFResponsavel("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Erro ao carregar histórico</h2>
            <p className="max-w-md text-xs text-muted-foreground font-mono">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistorico} className="mt-2 gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} evento{filtered.length !== 1 ? "s" : ""} encontrado
            {filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchHistorico} aria-label="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground underline">
              Limpar todos
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="NF de entrada"
            value={fNf}
            onChange={(e) => setFNf(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            placeholder="OP"
            value={fOp}
            onChange={(e) => setFOp(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            placeholder="Pallet"
            value={fPallet}
            onChange={(e) => setFPallet(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            placeholder="Referência"
            value={fReferencia}
            onChange={(e) => setFReferencia(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            placeholder="SD"
            value={fSd}
            onChange={(e) => setFSd(e.target.value)}
            className="h-9 text-xs"
          />
          <select
            value={fTipo}
            onChange={(e) => setFTipo(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-xs"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_EVENTO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={fDataInicio}
            onChange={(e) => setFDataInicio(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            type="date"
            value={fDataFim}
            onChange={(e) => setFDataFim(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            placeholder="Responsável"
            value={fResponsavel}
            onChange={(e) => setFResponsavel(e.target.value)}
            className="h-9 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFDataInicio("");
              setFDataFim("");
            }}
          >
            Ver tudo
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <History className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum evento encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Nenhum evento corresponde aos filtros aplicados."
                : "O histórico será preenchido conforme as operações forem realizadas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Pallet</th>
                <th className="p-3">NF</th>
                <th className="p-3">Ref</th>
                <th className="p-3">SD</th>
                <th className="p-3">OP</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Destino</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {r.data_hora ? new Date(r.data_hora).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={TIPO_EVENTO_COLORS[r.tipo_evento] ?? "secondary"}
                      className="text-[10px]"
                    >
                      {TIPO_EVENTO_LABELS[r.tipo_evento] ?? r.tipo_evento ?? "—"}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.codigo_pallet ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.nf_entrada ?? "—"}</td>
                  <td className="p-3 text-xs">{r.referencia ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.sd ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.op ?? "—"}</td>
                  <td className="p-3 text-xs">{r.origem ?? "—"}</td>
                  <td className="p-3 text-xs">{r.destino ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {r.quantidade?.toLocaleString("pt-BR") ?? "—"}
                  </td>
                  <td className="p-3 text-xs">{r.responsavel ?? "—"}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate" title={r.descricao}>
                    {r.descricao ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HistoricoPage({ initialPallet = "" }: { initialPallet?: string }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32" />
            ))}
          </div>
        </div>
      }
    >
      <HistoricoContent initialPallet={initialPallet} />
    </Suspense>
  );
}

function HistoricoRoutePage() {
  const search = Route.useSearch() as Record<string, string>;
  return <HistoricoPage initialPallet={search.pallet ?? ""} />;
}

export const Route = createFileRoute("/_app/historico")({ component: HistoricoRoutePage });
