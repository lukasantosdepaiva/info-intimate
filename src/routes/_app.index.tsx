import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Warehouse,
  PaintBucket,
  Printer,
  QrCode,
  ArrowRightLeft,
  Truck,
  MapPin,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Card definitions (label, icon, color, db column) ─────────
interface KpiDef {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  col: keyof DashboardRow;
}

interface DashboardRow {
  total_armazem_02: number;
  total_armazem_05: number;
  total_11_pintura: number;
  total_11_serigrafia: number;
  total_armazem_14: number;
  pallets_ativos: number;
  movimentacoes_pendentes: number;
  movimentacoes_executadas_hoje: number;
  saidas_hoje: number;
  posicoes_galpao_1: number;
  posicoes_galpao_2: number;
}

const EMPTY_DASHBOARD: DashboardRow = {
  total_armazem_02: 0,
  total_armazem_05: 0,
  total_11_pintura: 0,
  total_11_serigrafia: 0,
  total_armazem_14: 0,
  movimentacoes_pendentes: 0,
  movimentacoes_executadas_hoje: 0,
  saidas_hoje: 0,
  pallets_ativos: 0,
  posicoes_galpao_1: 0,
  posicoes_galpao_2: 0,
};

const KPIS: KpiDef[] = [
  { label: "Total Armazém 02", icon: Warehouse, color: "text-blue-400", bg: "bg-blue-500/10", col: "total_armazem_02" },
  { label: "Total Armazém 05", icon: Warehouse, color: "text-emerald-400", bg: "bg-emerald-500/10", col: "total_armazem_05" },
  { label: "Total 11 / Pintura", icon: PaintBucket, color: "text-rose-400", bg: "bg-rose-500/10", col: "total_11_pintura" },
  { label: "Total 11 / Serigrafia", icon: Printer, color: "text-purple-400", bg: "bg-purple-500/10", col: "total_11_serigrafia" },
  { label: "Total Armazém 14", icon: Warehouse, color: "text-cyan-400", bg: "bg-cyan-500/10", col: "total_armazem_14" },
  { label: "Pallets Ativos", icon: QrCode, color: "text-amber-400", bg: "bg-amber-500/10", col: "pallets_ativos" },
  { label: "Movimentações Pendentes", icon: ArrowRightLeft, color: "text-orange-400", bg: "bg-orange-500/10", col: "movimentacoes_pendentes" },
  { label: "Movimentações Executadas Hoje", icon: ArrowRightLeft, color: "text-teal-400", bg: "bg-teal-500/10", col: "movimentacoes_executadas_hoje" },
  { label: "Saídas Hoje", icon: Truck, color: "text-yellow-400", bg: "bg-yellow-500/10", col: "saidas_hoje" },
  { label: "Posições Galpão 1", icon: MapPin, color: "text-indigo-400", bg: "bg-indigo-500/10", col: "posicoes_galpao_1" },
  { label: "Posições Galpão 2", icon: MapPin, color: "text-pink-400", bg: "bg-pink-500/10", col: "posicoes_galpao_2" },
];

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardRow>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const INTERVALO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();

      const { data, error: queryError } = await supabase
        .from("vw_dashboard_logistica")
        .select("*")
        .limit(1);

      if (queryError) throw queryError;

      const row = Array.isArray(data) ? data[0] : data;
      setDashboardData(row ?? EMPTY_DASHBOARD);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dashboard";
      setError(message);
      setDashboardData(EMPTY_DASHBOARD);
    } finally {
      setLoading(false);
      setUltimaAtualizacao(new Date());
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const intervalo = setInterval(loadDashboard, INTERVALO_REFRESH_MS);
    return () => clearInterval(intervalo);
  }, [loadDashboard, INTERVALO_REFRESH_MS]);


  // ─── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 11 }).map((_, i) => (
            <Card key={i} className="shadow-none">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da operação logística — Special Decor
          </p>
        </div>

        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">
              Não foi possível carregar o dashboard
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Ocorreu um erro ao buscar os dados.
            </p>
            <p className="max-w-md rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground font-mono">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
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

  // ─── Data ───────────────────────────────────────────────
  const allZero =
    dashboardData.total_armazem_02 === 0 &&
    dashboardData.total_armazem_05 === 0 &&
    dashboardData.total_11_pintura === 0 &&
    dashboardData.total_11_serigrafia === 0 &&
    dashboardData.total_armazem_14 === 0 &&
    dashboardData.pallets_ativos === 0 &&
    dashboardData.movimentacoes_pendentes === 0 &&
    dashboardData.movimentacoes_executadas_hoje === 0 &&
    dashboardData.saidas_hoje === 0 &&
    dashboardData.posicoes_galpao_1 === 0 &&
    dashboardData.posicoes_galpao_2 === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da operação logística — Special Decor
          </p>
          {ultimaAtualizacao && (
            <span className="text-xs text-muted-foreground">
              Atualizado às {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadDashboard}
          className="shrink-0"
          aria-label="Atualizar dashboard"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          const value = dashboardData[kpi.col] ?? 0;

          return (
            <Card
              key={kpi.col}
              className="shadow-none transition-all hover:shadow-md"
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div className={`rounded-full p-2.5 ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <span className="text-2xl font-bold tabular-nums">
                  {typeof value === "number" ? value.toLocaleString("pt-BR") : "—"}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  {kpi.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer note */}
      {allZero && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Nenhum dado disponível no momento. O dashboard será preenchido
          conforme as operações forem iniciadas.
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});
