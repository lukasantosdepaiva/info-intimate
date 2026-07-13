import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────
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

interface GraficoPonto {
  dia: string;
  movimentacoes: number;
  saidas: number;
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

const PIE_COLORS = ["#1E3A5F", "#F97316", "#10B981", "#8B5CF6", "#06B6D4"];

function formatDiaMes(d: Date): string {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardRow>(EMPTY_DASHBOARD);
  const [graficoData, setGraficoData] = useState<GraficoPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const INTERVALO_REFRESH_MS = 5 * 60 * 1000;

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const supabase = getSupabase();

      const subDays30 = new Date();
      subDays30.setDate(subDays30.getDate() - 30);

      const [dashRes, movRes, saidasRes] = await Promise.all([
        supabase.from("vw_dashboard_logistica").select("*").limit(1),
        supabase
          .from("movimentacoes")
          .select("created_at, status")
          .gte("created_at", subDays30.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("saidas_armazem_05")
          .select("created_at")
          .gte("created_at", subDays30.toISOString())
          .order("created_at", { ascending: true }),
      ]);

      if (dashRes.error) throw dashRes.error;

      const row = Array.isArray(dashRes.data) ? dashRes.data[0] : dashRes.data;
      setDashboardData((row as DashboardRow) ?? EMPTY_DASHBOARD);

      // Agrupar histórico por dia
      const mapa = new Map<string, { movimentacoes: number; saidas: number; ts: number }>();

      const addRow = (createdAt: string | null | undefined, tipo: "mov" | "sai") => {
        if (!createdAt) return;
        const d = new Date(createdAt);
        if (isNaN(d.getTime())) return;
        const key = formatDiaMes(d);
        const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const cur = mapa.get(key) ?? { movimentacoes: 0, saidas: 0, ts };
        if (tipo === "mov") cur.movimentacoes += 1;
        else cur.saidas += 1;
        cur.ts = ts;
        mapa.set(key, cur);
      };

      (movRes.data ?? []).forEach((r: { created_at: string | null }) =>
        addRow(r.created_at, "mov"),
      );
      (saidasRes.data ?? []).forEach((r: { created_at: string | null }) =>
        addRow(r.created_at, "sai"),
      );

      const arr: GraficoPonto[] = Array.from(mapa.entries())
        .map(([dia, v]) => ({ dia, movimentacoes: v.movimentacoes, saidas: v.saidas, ts: v.ts }))
        .sort((a, b) => a.ts - b.ts)
        .map(({ dia, movimentacoes, saidas }) => ({ dia, movimentacoes, saidas }));

      setGraficoData(arr);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dashboard.";
      setError(message);
      setDashboardData(EMPTY_DASHBOARD);
      setGraficoData([]);
    } finally {
      setLoading(false);
      setAtualizando(false);
      setUltimaAtualizacao(new Date());
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const intervalo = setInterval(loadDashboard, INTERVALO_REFRESH_MS);
    return () => clearInterval(intervalo);
  }, [loadDashboard, INTERVALO_REFRESH_MS]);

  const handleRefresh = () => {
    setAtualizando(true);
    loadDashboard();
  };

  const posicoesGalpao = dashboardData.posicoes_galpao_1 + dashboardData.posicoes_galpao_2;

  const pieData = useMemo(
    () =>
      [
        { name: "Arm 02", value: dashboardData.total_armazem_02 },
        { name: "Arm 05", value: dashboardData.total_armazem_05 },
        { name: "Pin 11", value: dashboardData.total_11_pintura },
        { name: "Ser 11", value: dashboardData.total_11_serigrafia },
        { name: "Arm 14", value: dashboardData.total_armazem_14 },
      ].filter((d) => d.value > 0),
    [dashboardData],
  );

  const totalEstoque = pieData.reduce((acc, d) => acc + d.value, 0);

  const armazens = [
    {
      label: "Armazém 02",
      value: dashboardData.total_armazem_02,
      icon: Warehouse,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Armazém 05",
      value: dashboardData.total_armazem_05,
      icon: Warehouse,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Arm 11 Pin",
      value: dashboardData.total_11_pintura,
      icon: PaintBucket,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "Arm 11 Ser",
      value: dashboardData.total_11_serigrafia,
      icon: Printer,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Armazém 14",
      value: dashboardData.total_armazem_14,
      icon: Warehouse,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];

  const pendentes = dashboardData.movimentacoes_pendentes;
  const pendenteStyle =
    pendentes >= 11
      ? "border-red-500/50 bg-red-500/5"
      : pendentes >= 6
        ? "border-orange-500/50 bg-orange-500/5"
        : "";
  const PendenteIcon = pendentes >= 11 ? AlertCircle : ArrowRightLeft;
  const pendenteIconColor = pendentes >= 11 ? "text-red-500" : pendentes >= 6 ? "text-orange-500" : "text-orange-400";

  // ─── Header helper ─────
  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operação logística · Special Decor
        </p>
      </div>
      <div className="flex items-center gap-3">
        {ultimaAtualizacao && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Atualizado às {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="shrink-0"
          aria-label="Atualizar dashboard"
          disabled={atualizando || loading}
        >
          <RefreshCw className={`h-4 w-4 ${atualizando || loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );

  // ─── Loading ────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="shadow-none lg:col-span-3">
            <CardContent className="p-5">
              <Skeleton className="mb-4 h-4 w-56" />
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>
          <Card className="shadow-none lg:col-span-2">
            <CardContent className="p-5">
              <Skeleton className="mb-4 h-4 w-40" />
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="shadow-none">
              <CardContent className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">
              Não foi possível carregar o dashboard
            </h2>
            <p className="max-w-md rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allZero =
    totalEstoque === 0 &&
    dashboardData.pallets_ativos === 0 &&
    dashboardData.movimentacoes_pendentes === 0 &&
    dashboardData.saidas_hoje === 0 &&
    posicoesGalpao === 0 &&
    graficoData.length === 0;

  // ─── Custom tooltip ──────────
  const BarTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="mb-1 font-semibold">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {header}

      {/* ZONA 2 — KPI STRIP */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to="/pallets" className="group">
          <Card className="cursor-pointer shadow-none transition-transform hover:scale-[1.01]">
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="rounded-full bg-amber-500/10 p-2 w-fit">
                <QrCode className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {dashboardData.pallets_ativos.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                Pallets Ativos
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/aprovacoes" className="group">
          <Card className={`cursor-pointer shadow-none transition-transform hover:scale-[1.01] ${pendenteStyle}`}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="rounded-full bg-orange-500/10 p-2 w-fit">
                <PendenteIcon className={`h-5 w-5 ${pendenteIconColor}`} />
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {pendentes.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                Movimentações Pendentes
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/saidas" className="group">
          <Card className="cursor-pointer shadow-none transition-transform hover:scale-[1.01]">
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="rounded-full bg-yellow-500/10 p-2 w-fit">
                <Truck className="h-5 w-5 text-yellow-400" />
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {dashboardData.saidas_hoje.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                Saídas Hoje
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/estoque" className="group">
          <Card className="cursor-pointer shadow-none transition-transform hover:scale-[1.01]">
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="rounded-full bg-indigo-500/10 p-2 w-fit">
                <MapPin className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {posicoesGalpao.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                Posições Galpão 1+2
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {allZero ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <TrendingUp className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum dado disponível ainda.</p>
          <p className="text-xs opacity-60">
            O dashboard será preenchido conforme as operações iniciarem.
          </p>
        </div>
      ) : (
        <>
          {/* ZONA 3 — GRÁFICOS */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Bar chart */}
            <Card className="shadow-none lg:col-span-3">
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Movimentações vs Saídas (30 dias)
                </h2>
                {graficoData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    Sem movimentações nos últimos 30 dias
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={graficoData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="opacity-20"
                      />
                      <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="movimentacoes" name="Movimentações" fill="#1E3A5F" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="#F97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Donut chart */}
            <Card className="shadow-none lg:col-span-2">
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Estoque por Armazém
                </h2>
                {pieData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    Sem estoque registrado
                  </div>
                ) : (
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => v.toLocaleString("pt-BR")}
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 6,
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-7">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-xl font-bold tabular-nums">
                        {totalEstoque.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ZONA 4 — Armazéns detalhados */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {armazens.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.label} to="/estoque">
                  <Card className="cursor-pointer shadow-none transition-transform hover:scale-[1.01]">
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1.5 ${a.bg}`}>
                          <Icon className={`h-4 w-4 ${a.color}`} />
                        </div>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {a.label}
                        </span>
                      </div>
                      <span className="text-2xl font-bold tabular-nums text-center">
                        {a.value.toLocaleString("pt-BR")}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});
