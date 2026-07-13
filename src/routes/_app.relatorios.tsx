import { createFileRoute } from "@tanstack/react-router";

import { useState, useCallback, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  BarChart3,
  Filter,
  RefreshCw,
  FileDown,
  Warehouse,
  Package,
  ArrowRightLeft,
  AlertCircle,
  Truck,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Tipos das linhas do Supabase ---
interface RecebimentoRow {
  created_at: string;
  quantidade_recebida: number;
  responsavel: string | null;
  nfs_entrada?: { numero_nf?: string; clientes?: { nome?: string }; fornecedores?: { nome?: string } } | null;
  referencias?: { codigo_referencia?: string } | null;
  sds?: { numero_sd?: string } | null;
  pallets?: { codigo_pallet?: string } | null;
}

interface PalletFullRow {
  created_at: string;
  codigo_pallet: string;
  status: string | null;
  quantidade_inicial: number;
  referencias?: { codigo_referencia?: string } | null;
  sds?: { numero_sd?: string } | null;
  nfs_entrada?: { numero_nf?: string } | null;
  saldos_pallet?: { quantidade: number }[];
}

interface EstoqueRow {
  armazem_codigo: string | null;
  codigo_local: string;
  total_pallets: number;
  quantidade_total: number;
}

interface MovimentacaoFullRow {
  created_at: string;
  quantidade: number;
  status: string | null;
  responsavel_solicitacao: string | null;
  pallets?: { codigo_pallet?: string } | null;
  local_origem?: { codigo_local?: string } | null;
  local_destino?: { codigo_local?: string } | null;
  lideres?: { nome?: string } | null;
  pallet_id: string;
}

interface InspecaoFullRow {
  created_at: string;
  resultado: string | null;
  quantidade_inspecionada: number;
  responsavel_inspecao: string | null;
  observacao: string | null;
  pallets?: { codigo_pallet?: string } | null;
  pallet_id: string;
}

interface RncFullRow {
  created_at: string;
  tipo_defeito: string | null;
  quantidade_afetada: number;
  status: string | null;
  responsavel_abertura: string | null;
  descricao_nao_conformidade: string | null;
  pallets?: { codigo_pallet?: string } | null;
  pallet_id: string;
  referencias?: { codigo_referencia?: string } | null;
  sds?: { numero_sd?: string } | null;
}

interface SaidaFullRow {
  created_at: string;
  quantidade_saida: number;
  nf_saida_numero: string | null;
  produto_final: string | null;
  liberado_por: string | null;
  responsavel_baixa: string | null;
  pallets?: { codigo_pallet?: string } | null;
  ops_pcp?: { numero_op?: string; produto_final?: string } | null;
  nfs_entrada?: { numero_nf?: string } | null;
  pallet_id: string;
}

interface VeiculoControleRow {
  created_at: string;
  status_aprovacao: string | null;
  responsavel_conferencia: string | null;
  veiculos?: { placa?: string; tipo_veiculo?: string; transportadora?: string; motorista?: string } | null;
  saidas_armazem_05?: { nf_saida_numero?: string } | null;
}

// --- Tipos ---
interface ReportFilters {
  dataInicio?: string;
  dataFim?: string;
  pallet?: string;
  nf?: string;
  op?: string;
  referencia?: string;
  sd?: string;
  status?: string;
  armazemLocal?: string;
  responsavel?: string;
  placa?: string;
}

interface SummaryData {
  total_recebido: number;
  total_estoque: number;
  total_movimentado: number;
  total_armazem05: number;
  total_saidas: number;
  total_rncs_abertas: number;
  total_veiculos: number;
}

// --- DateRangePicker ---
function DateRangePicker({
  date,
  setDate,
  label,
}: {
  date: { from?: Date; to?: Date } | undefined;
  setDate: (d: { from?: Date; to?: Date } | undefined) => void;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                `${format(date.from, "dd/MM/yy")} - ${format(date.to, "dd/MM/yy")}`
              ) : (
                format(date.from, "dd/MM/yy")
              )
            ) : (
              "Selecionar período"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selected={date as any}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --- FilterControls ---
function FilterPanel({
  filters,
  setFilters,
  onApply,
  onClear,
}: {
  filters: ReportFilters;
  setFilters: (f: ReportFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>();

  useEffect(() => {
    setFilters({
      ...filters,
      dataInicio: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      dataFim: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Filtros</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <RefreshCw className="mr-1 h-3 w-3" /> Limpar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <DateRangePicker label="Período" date={dateRange} setDate={setDateRange} />
          <div className="grid gap-1">
            <Label className="text-xs">Pallet</Label>
            <Input className="h-8 text-xs" placeholder="Código" value={filters.pallet ?? ""}
              onChange={e => setFilters({ ...filters, pallet: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">NF</Label>
            <Input className="h-8 text-xs" placeholder="Número" value={filters.nf ?? ""}
              onChange={e => setFilters({ ...filters, nf: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Referência</Label>
            <Input className="h-8 text-xs" placeholder="Código" value={filters.referencia ?? ""}
              onChange={e => setFilters({ ...filters, referencia: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">SD</Label>
            <Input className="h-8 text-xs" placeholder="Número" value={filters.sd ?? ""}
              onChange={e => setFilters({ ...filters, sd: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Status</Label>
            <Input className="h-8 text-xs" placeholder="Status" value={filters.status ?? ""}
              onChange={e => setFilters({ ...filters, status: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Armazém/Local</Label>
            <Input className="h-8 text-xs" placeholder="Código" value={filters.armazemLocal ?? ""}
              onChange={e => setFilters({ ...filters, armazemLocal: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Responsável</Label>
            <Input className="h-8 text-xs" placeholder="Nome" value={filters.responsavel ?? ""}
              onChange={e => setFilters({ ...filters, responsavel: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Placa</Label>
            <Input className="h-8 text-xs" placeholder="Veículo" value={filters.placa ?? ""}
              onChange={e => setFilters({ ...filters, placa: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onApply}>
            <Filter className="mr-1 h-3 w-3" /> Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- CSV Export ---
function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows?.length) { toast.info("Nenhum dado para exportar."); return; }
  const header = Object.keys(rows[0]).join(",");
  const body = rows.map(r => Object.values(r).map(v => String(v ?? "")).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado!");
}

// --- TIPOS DE RELATÓRIO ---
interface ReportDef {
  key: string;
  label: string;
}

const REPORTS: ReportDef[] = [
  { key: "recebimentos", label: "Recebimentos" },
  { key: "pallets", label: "Pallets" },
  { key: "estoque", label: "Estoque" },
  { key: "movimentacoes", label: "Movimentações" },
  { key: "inspecoes", label: "Inspeções" },
  { key: "rncs", label: "RNC" },
  { key: "saidas", label: "Saídas Armazém 05" },
  { key: "veiculos", label: "Veículos" },
];

// --- Main Page ---
function RelatoriosPage() {
  const [activeReport, setActiveReport] = useState("recebimentos");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData>({
    total_recebido: 0, total_estoque: 0, total_movimentado: 0,
    total_armazem05: 0, total_saidas: 0, total_rncs_abertas: 0, total_veiculos: 0,
  });

  const fetchResumo = useCallback(async () => {
    try {
      const supabase = getSupabase();
      // Recebimentos
      const { count: totalRec } = await supabase.from("recebimentos").select("*", { count: "exact", head: true });
      // Saldos
      const { data: saldos } = await supabase.from("saldos_pallet").select("quantidade");
      const totalEstoque = (saldos as { quantidade: number }[] ?? []).reduce((a, b) => a + (b.quantidade ?? 0), 0);
      // Movimentações
      const { count: totalMov } = await supabase.from("movimentacoes").select("*", { count: "exact", head: true });
      // Saídas Arm 05
      const { data: locaisData } = await supabase.from("locais_estoque").select("id").ilike("codigo_local", "05-%");
      const locaisIds = ((locaisData ?? []) as { id: string }[]).map(l => l.id);
      const { data: saidas05 } = await supabase.from("saldos_pallet").select("quantidade")
        .in("local_estoque_id", locaisIds.length > 0 ? locaisIds : ["none"]);
      const totalArm05 = (saidas05 as { quantidade: number }[] ?? []).reduce((a, b) => a + (b.quantidade ?? 0), 0);
      // Saídas
      const { count: totalSai } = await supabase.from("saidas_armazem_05").select("*", { count: "exact", head: true });
      // RNCs abertas
      const { count: totalRnc } = await supabase.from("rncs").select("*", { count: "exact", head: true }).eq("status", "aberta");
      // Veículos
      const { count: totalVei } = await supabase.from("veiculos").select("*", { count: "exact", head: true });

      setSummary({
        total_recebido: totalRec ?? 0,
        total_estoque: totalEstoque,
        total_movimentado: totalMov ?? 0,
        total_armazem05: totalArm05,
        total_saidas: totalSai ?? 0,
        total_rncs_abertas: totalRnc ?? 0,
        total_veiculos: totalVei ?? 0,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchResumo(); }, [fetchResumo]);

  const fetchDadosRelatorio = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData([]);
    try {
      const supabase = getSupabase();
      let rows: Record<string, unknown>[] = [];

      switch (activeReport) {
        case "recebimentos": {
          const { data } = await supabase
            .from("recebimentos")
            .select("*, nfs_entrada!nf_entrada_id(*, clientes!cliente_id(*), fornecedores!fornecedor_id(*)), referencias!referencia_id(*), sds!sd_id(*), pallets!recebimento_id(*)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as RecebimentoRow[]).map(r => ({
            data: r.created_at,
            nf_entrada: r.nfs_entrada?.numero_nf ?? "—",
            cliente: r.nfs_entrada?.clientes?.nome ?? "—",
            fornecedor: r.nfs_entrada?.fornecedores?.nome ?? "—",
            referencia: r.referencias?.codigo_referencia ?? "—",
            sd: r.sds?.numero_sd ?? "—",
            quantidade: r.quantidade_recebida,
            pallet: r.pallets?.codigo_pallet ?? "—",
            responsavel: r.responsavel ?? "—",
          }));
          break;
        }
        case "pallets": {
          const { data } = await supabase
            .from("pallets")
            .select("*, referencias!referencia_id(*), sds!sd_id(*), nfs_entrada!nf_entrada_id(*), saldos_pallet(*)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as PalletFullRow[]).map(r => ({
            codigo: r.codigo_pallet,
            status: r.status ?? "—",
            referencia: r.referencias?.codigo_referencia ?? "—",
            sd: r.sds?.numero_sd ?? "—",
            nf_entrada: r.nfs_entrada?.numero_nf ?? "—",
            qtd_inicial: r.quantidade_inicial,
            qtd_atual: (r.saldos_pallet ?? []).reduce((a: number, b: { quantidade: number }) => a + (b.quantidade ?? 0), 0),
            locais: (r.saldos_pallet ?? []).length + " local(is)",
          }));
          break;
        }
        case "estoque": {
          const { data } = await supabase
            .from("vw_saldos_por_local")
            .select("*")
            .order("codigo_local");
          rows = ((data ?? []) as EstoqueRow[]).map(r => ({
            armazem: r.armazem_codigo ?? "—",
            local: r.codigo_local ?? "—",
            total_pallets: r.total_pallets ?? 0,
            quantidade: r.quantidade_total ?? 0,
          }));
          break;
        }
        case "movimentacoes": {
          const { data } = await supabase
            .from("movimentacoes")
            .select("*, pallets!pallet_id(codigo_pallet), local_origem!local_origem_id(codigo_local), local_destino!local_destino_id(codigo_local), lideres!lider_id(nome)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as MovimentacaoFullRow[]).map(r => ({
            data: r.created_at,
            pallet: r.pallets?.codigo_pallet ?? r.pallet_id?.slice(0, 8) ?? "—",
            origem: r.local_origem?.codigo_local ?? "—",
            destino: r.local_destino?.codigo_local ?? "—",
            quantidade: r.quantidade,
            status: r.status ?? "—",
            responsavel: r.responsavel_solicitacao ?? "—",
            lider: r.lideres?.nome ?? "—",
          }));
          break;
        }
        case "inspecoes": {
          const { data } = await supabase
            .from("inspecoes")
            .select("*, pallets!pallet_id(codigo_pallet)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as InspecaoFullRow[]).map(r => ({
            data: r.created_at,
            pallet: r.pallets?.codigo_pallet ?? r.pallet_id?.slice(0, 8) ?? "—",
            resultado: r.resultado ?? "—",
            qtd_inspecionada: r.quantidade_inspecionada,
            responsavel: r.responsavel_inspecao ?? "—",
            observacao: r.observacao ?? "—",
          }));
          break;
        }
        case "rncs": {
          const { data } = await supabase
            .from("rncs")
            .select("*, pallets!pallet_id(codigo_pallet), referencias!referencia_id(codigo_referencia), sds!sd_id(numero_sd)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as RncFullRow[]).map(r => ({
            data: r.created_at,
            pallet: r.pallets?.codigo_pallet ?? r.pallet_id?.slice(0, 8) ?? "—",
            tipo_defeito: r.tipo_defeito ?? "—",
            qtd_afetada: r.quantidade_afetada,
            status: r.status ?? "—",
            responsavel: r.responsavel_abertura ?? "—",
            descricao: r.descricao_nao_conformidade ?? "—",
          }));
          break;
        }
        case "saidas": {
          const { data } = await supabase
            .from("saidas_armazem_05")
            .select("*, pallets!pallet_id(codigo_pallet), ops_pcp!op_id(numero_op, produto_final), nfs_entrada!nf_entrada_id(numero_nf)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as SaidaFullRow[]).map(r => ({
            data: r.created_at,
            pallet: r.pallets?.codigo_pallet ?? r.pallet_id?.slice(0, 8) ?? "—",
            op: r.ops_pcp?.numero_op ?? "—",
            produto: r.ops_pcp?.produto_final ?? r.produto_final ?? "—",
            nf_saida: r.nf_saida_numero ?? "—",
            quantidade: r.quantidade_saida,
            liberado: r.liberado_por ?? "—",
            responsavel_baixa: r.responsavel_baixa ?? "—",
          }));
          break;
        }
        case "veiculos": {
          const { data } = await supabase
            .from("controle_veiculos")
            .select("*, veiculos!veiculo_id(placa, tipo_veiculo, transportadora, motorista), saidas_armazem_05!saida_id(nf_saida_numero)")
            .order("created_at", { ascending: false });
          rows = ((data ?? []) as VeiculoControleRow[]).map(r => ({
            data: r.created_at,
            placa: r.veiculos?.placa ?? "—",
            tipo: r.veiculos?.tipo_veiculo ?? "—",
            transportadora: r.veiculos?.transportadora ?? "—",
            motorista: r.veiculos?.motorista ?? "—",
            saida_vinculada: r.saidas_armazem_05?.nf_saida_numero ?? "Sem saída",
            status: r.status_aprovacao ?? "—",
            responsavel: r.responsavel_conferencia ?? "—",
          }));
          break;
        }
      }

      // Apply in-memory filters
      let filtered = rows;
      if (filters.dataInicio) filtered = filtered.filter(r => String(r.data ?? "").startsWith(filters.dataInicio!));
      if (filters.dataFim) filtered = filtered.filter(r => String(r.data ?? "").startsWith(filters.dataFim!));
      if (filters.pallet) {
        const q = filters.pallet.toLowerCase();
        filtered = filtered.filter(r =>
          String(r.pallet ?? r.codigo ?? "").toLowerCase().includes(q) ||
          String(r.pallet_codigo ?? "").toLowerCase().includes(q)
        );
      }
      if (filters.nf) {
        const q = filters.nf.toLowerCase();
        filtered = filtered.filter(r =>
          String(r.nf_entrada ?? r.nf_saida ?? "").toLowerCase().includes(q)
        );
      }
      if (filters.referencia) {
        const q = filters.referencia.toLowerCase();
        filtered = filtered.filter(r => String(r.referencia ?? "").toLowerCase().includes(q));
      }
      if (filters.sd) {
        const q = filters.sd.toLowerCase();
        filtered = filtered.filter(r => String(r.sd ?? "").toLowerCase().includes(q));
      }
      if (filters.status) {
        const q = filters.status.toLowerCase();
        filtered = filtered.filter(r => String(r.status ?? "").toLowerCase().includes(q));
      }
      if (filters.armazemLocal) {
        const q = filters.armazemLocal.toLowerCase();
        filtered = filtered.filter(r =>
          String(r.origem ?? r.destino ?? r.armazem ?? r.local ?? "").toLowerCase().includes(q)
        );
      }
      if (filters.responsavel) {
        const q = filters.responsavel.toLowerCase();
        filtered = filtered.filter(r =>
          String(r.responsavel ?? r.lider ?? r.liberado ?? "").toLowerCase().includes(q) ||
          String(r.responsavel_baixa ?? "").toLowerCase().includes(q)
        );
      }
      if (filters.placa) {
        const q = filters.placa.toLowerCase();
        filtered = filtered.filter(r => String(r.placa ?? "").toLowerCase().includes(q));
      }

      setData(filtered);
      if (filtered.length === 0 && rows.length > 0) {
        toast.info("Nenhum registro corresponde aos filtros.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar relatório.";
      setError(msg);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [activeReport, filters]);

  useEffect(() => {
    fetchDadosRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport]);

  const renderTable = () => {
    if (loading) {
      return (
        <div className="space-y-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <Card className="border-destructive/50 mt-4">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDadosRelatorio}>
              <RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (data.length === 0) {
      return (
        <EmptyState
          icon={BarChart3}
          title="Nenhum registro encontrado"
          description="Ajuste os filtros ou selecione outro relatório."
        />
      );
    }

    const cols = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map(col => (
                <TableHead key={col} className="text-xs whitespace-nowrap">
                  {col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {cols.map(col => (
                  <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                    {row[col] == null ? "—" :
                     typeof row[col] === "number" ? Number(row[col]).toLocaleString("pt-BR") :
                     typeof row[col] === "boolean" ? (row[col] ? "Sim" : "Não") :
                     String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-600">
        Ambiente de teste. Não inserir dados reais, pessoais ou sigilosos.
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Relatórios gerenciais da operação logística.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <Card><CardContent className="p-3 text-center">
          <ClipboardList className="h-4 w-4 mx-auto text-blue-400" />
          <div className="text-lg font-bold">{summary.total_recebido.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Total Recebido</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Warehouse className="h-4 w-4 mx-auto text-emerald-400" />
          <div className="text-lg font-bold">{summary.total_estoque.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Total em Estoque</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <ArrowRightLeft className="h-4 w-4 mx-auto text-orange-400" />
          <div className="text-lg font-bold">{summary.total_movimentado.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Movimentações</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Package className="h-4 w-4 mx-auto text-purple-400" />
          <div className="text-lg font-bold">{summary.total_armazem05.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Em Armazém 05</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Truck className="h-4 w-4 mx-auto text-cyan-400" />
          <div className="text-lg font-bold">{summary.total_saidas.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Total Saídas</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertCircle className="h-4 w-4 mx-auto text-red-400" />
          <div className="text-lg font-bold">{summary.total_rncs_abertas.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">RNCs Abertas</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Truck className="h-4 w-4 mx-auto text-amber-400" />
          <div className="text-lg font-bold">{summary.total_veiculos.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">Veículos</div>
        </CardContent></Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:w-56">
          <Label className="text-xs">Relatório</Label>
          <Select value={activeReport} onValueChange={setActiveReport}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORTS.map(r => (
                <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="mt-auto" onClick={() => exportCSV(`relatorio-${activeReport}`, data)} disabled={data.length === 0}>
          <FileDown className="mr-1 h-3 w-3" /> Exportar CSV
        </Button>
        <Button variant="ghost" size="sm" className="mt-auto" onClick={fetchDadosRelatorio}>
          <RefreshCw className="mr-1 h-3 w-3" /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} setFilters={setFilters} onApply={fetchDadosRelatorio} onClear={() => { setFilters({}); fetchDadosRelatorio(); }} />

      {/* Table */}
      <div className="text-xs text-muted-foreground">{data.length} registro(s) encontrado(s)</div>
      {renderTable()}
    </div>
  );
}

export const Route = createFileRoute("/_app/relatorios")({
  component: RelatoriosPage,
});
