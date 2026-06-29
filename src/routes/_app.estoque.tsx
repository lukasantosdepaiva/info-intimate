import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Warehouse,
  AlertCircle,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SaldoRow {
  id?: string;
  codigo_local: string;
  armazem_nome: string;
  armazem_codigo: string;
  galpao: string;
  rua: string;
  processo: string;
  descricao: string;
  total_pallets: number;
  quantidade_total: number;
  quantidade_pendente?: number;
}

type FilterKey = "armazem_02" | "armazem_05" | "armazem_11" | "armazem_14" | "galpao_1" | "galpao_2" | "pintura" | "serigrafia";

const FILTERS: { key: FilterKey; label: string; match: (r: SaldoRow) => boolean }[] = [
  { key: "armazem_02", label: "Armazém 02", match: (r) => r.armazem_codigo?.includes("02") || r.codigo_local?.toLowerCase().includes("02") },
  { key: "armazem_05", label: "Armazém 05", match: (r) => r.armazem_codigo?.includes("05") || r.codigo_local?.toLowerCase().includes("05") },
  { key: "armazem_11", label: "Armazém 11", match: (r) => r.armazem_codigo?.includes("11") || r.codigo_local?.toLowerCase().includes("11") },
  { key: "armazem_14", label: "Armazém 14", match: (r) => r.armazem_codigo?.includes("14") || r.codigo_local?.toLowerCase().includes("14") },
  { key: "galpao_1", label: "Galpão 1", match: (r) => r.galpao?.toLowerCase().includes("1") },
  { key: "galpao_2", label: "Galpão 2", match: (r) => r.galpao?.toLowerCase().includes("2") },
  { key: "pintura", label: "Pintura", match: (r) => r.processo?.toLowerCase().includes("pintura") || r.descricao?.toLowerCase().includes("pintura") },
  { key: "serigrafia", label: "Serigrafia", match: (r) => r.processo?.toLowerCase().includes("serigrafia") || r.descricao?.toLowerCase().includes("serigrafia") },
];

function EstoquePage() {
  const [data, setData] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);

  const fetchEstoque = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();

      const [rowsResult, pendentesResult] = await Promise.all([
        supabase.from("vw_saldos_por_local").select("*").order("codigo_local"),
        supabase
          .from("movimentacoes")
          .select("local_origem_id, quantidade, local_origem:locais_estoque!movimentacoes_local_origem_id_fkey(codigo_local)")
          .eq("status", "pendente"),
      ]);

      if (rowsResult.error) throw new Error(rowsResult.error.message);
      if (pendentesResult.error) throw new Error(pendentesResult.error.message);

      const pendencias = (
        (pendentesResult.data as unknown as {
          local_origem_id: string | null;
          quantidade: number | string | null;
          local_origem: { codigo_local: string | null } | null;
        }[]) ?? []
      ).reduce<Map<string, number>>((map, item) => {
        const codigoLocal =
          item.local_origem?.codigo_local ?? item.local_origem_id ?? "";
        if (!codigoLocal) return map;
        const quantidade = Number(item.quantidade) || 0;
        map.set(codigoLocal, (map.get(codigoLocal) ?? 0) + quantidade);
        return map;
      }, new Map());

      const mapped = ((rowsResult.data as SaldoRow[]) ?? []).map((row) => ({
        ...row,
        quantidade_pendente: pendencias.get(row.codigo_local) ?? 0,
      }));

      setData(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar estoque.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstoque();
  }, [fetchEstoque]);

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const filtered = useMemo(() => {
    if (activeFilters.length === 0) return data;
    return data.filter((r) =>
      activeFilters.some((key) => {
        const f = FILTERS.find((f) => f.key === key);
        return f ? f.match(r) : false;
      })
    );
  }, [data, activeFilters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
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
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Erro ao carregar estoque</h2>
            <p className="max-w-md text-xs text-muted-foreground font-mono">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEstoque}
              className="mt-2 gap-2"
            >
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
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} local{filtered.length !== 1 ? "is" : ""}{" "}
            encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchEstoque} aria-label="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {FILTERS.map((f) => {
          const active = activeFilters.includes(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              {active && <X className="h-3 w-3" />}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            className="text-xs text-muted-foreground underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Warehouse className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum local encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Os dados de estoque aparecerão aqui conforme forem cadastrados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Código</th>
                <th className="p-3">Armazém</th>
                <th className="p-3">Galpão</th>
                <th className="p-3">Rua</th>
                <th className="p-3">Processo</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Pallets</th>
                <th className="p-3 text-right">Qtd Total</th>
                <th className="p-3 text-right">Pend.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.codigo_local}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="p-3 font-mono font-semibold">
                    {r.codigo_local}
                  </td>
                  <td className="p-3">{r.armazem_nome ?? "—"}</td>
                  <td className="p-3">{r.galpao ?? "—"}</td>
                  <td className="p-3">{r.rua ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">
                      {r.processo ?? "—"}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs">{r.descricao ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums font-semibold">
                    {r.total_pallets?.toLocaleString("pt-BR") ?? "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {r.quantidade_total?.toLocaleString("pt-BR") ?? "—"}
                  </td>
                  <td className="p-3 text-right">
                    {r.quantidade_pendente && r.quantidade_pendente > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {r.quantidade_pendente.toLocaleString("pt-BR")} pend.
                      </Badge>
                    ) : (
                      "—"
                    )}
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


export const Route = createFileRoute("/_app/estoque")({
  component: EstoquePage,
});
