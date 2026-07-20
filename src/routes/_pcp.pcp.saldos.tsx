import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { useLocaisEstoque } from "@/contexts/locais-estoque-context";
import { RefreshCw, AlertCircle, Search, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A view vw_saldo_disponivel_pallet é a mesma fonte usada por
// gerar_op_com_explosao para calcular disponibilidade real (líquida de
// empenhos ativos). Mantemos os campos permissivos porque a view pode
// expor colunas adicionais dependendo da revisão do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaldoRow = Record<string, any>;

// Helpers null-safe (regra do projeto).
const textoExibicao = (v: unknown, fb = "—") => {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s === "" ? fb : s;
};
const numeroSeguro = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

function pickCodigoRef(r: SaldoRow): string {
  return (
    r.codigo_referencia ?? r.referencia_codigo ?? r.pallets?.referencias?.codigo_referencia ?? ""
  );
}
function pickDescricao(r: SaldoRow): string {
  return r.descricao_referencia ?? r.descricao ?? r.referencia_descricao ?? "";
}
function pickArmazem(r: SaldoRow): string {
  return r.armazem_codigo ?? r.locais_estoque?.armazem_codigo ?? "";
}
function pickLocalDesc(r: SaldoRow): string {
  return (
    r.descricao_local ?? r.local_descricao ?? r.codigo_local ?? r.locais_estoque?.descricao ?? ""
  );
}
function pickCodigoPallet(r: SaldoRow): string {
  return r.codigo_pallet ?? r.pallets?.codigo_pallet ?? "";
}
function pickQtdDisponivel(r: SaldoRow): number {
  return numeroSeguro(
    r.quantidade_disponivel ?? r.qtd_disponivel ?? r.saldo_disponivel ?? r.quantidade,
  );
}

function SaldosPage() {
  const { locais } = useLocaisEstoque();
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [armazem, setArmazem] = useState("all");

  const armazens = useMemo(() => {
    const s = new Set(locais.map((l) => l.armazem_codigo));
    return Array.from(s).sort();
  }, [locais]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase as any)
        .from("vw_saldo_disponivel_pallet")
        .select("*")
        .limit(2000);
      if (e) throw new Error(e.message);
      setRows((data ?? []) as SaldoRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar saldos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return rows.filter((r) => {
      const codigo = pickCodigoRef(r).toLowerCase();
      const desc = pickDescricao(r).toLowerCase();
      const pallet = pickCodigoPallet(r).toLowerCase();
      const arm = pickArmazem(r);
      if (termo && !codigo.includes(termo) && !desc.includes(termo) && !pallet.includes(termo))
        return false;
      if (armazem !== "all" && arm !== armazem) return false;
      return true;
    });
  }, [rows, busca, armazem]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulta de Saldo</h1>
          <p className="text-sm text-muted-foreground">
            Somente leitura. Saldo disponível já desconta empenhos ativos (view
            <code className="mx-1 rounded bg-muted px-1 text-[10px]">
              vw_saldo_disponivel_pallet
            </code>
            ).
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetch}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por referência, descrição ou pallet..."
            className="pl-10 text-xs"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select value={armazem} onValueChange={setArmazem}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Todos os armazéns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {armazens.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {!loading && error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}
      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Warehouse className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Sem saldos disponíveis</h3>
          </CardContent>
        </Card>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Referência</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Pallet</th>
                <th className="p-3">Armazém</th>
                <th className="p-3">Local</th>
                <th className="p-3 text-right">Disponível</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id ?? `${pickCodigoPallet(r)}-${i}`}
                  className="border-b hover:bg-muted/30"
                >
                  <td className="p-3 font-mono">{textoExibicao(pickCodigoRef(r))}</td>
                  <td className="p-3">{textoExibicao(pickDescricao(r))}</td>
                  <td className="p-3 font-mono text-xs">{textoExibicao(pickCodigoPallet(r))}</td>
                  <td className="p-3 text-xs">{textoExibicao(pickArmazem(r))}</td>
                  <td className="p-3 text-xs">{textoExibicao(pickLocalDesc(r))}</td>
                  <td className="p-3 text-right tabular-nums">
                    {pickQtdDisponivel(r).toLocaleString("pt-BR")}
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

export const Route = createFileRoute("/_pcp/pcp/saldos")({
  component: SaldosPage,
});
