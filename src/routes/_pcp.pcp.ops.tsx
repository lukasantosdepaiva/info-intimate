import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  FileText,
  Save,
  Eye,
  X,
  CornerDownRight,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ReferenciaRow, SdRow, OpCompleta as OpCompletaBase } from "@/lib/types";

type OpCompleta = OpCompletaBase & {
  created_at: string;
  updated_at?: string;
  codigo_referencia?: string;
  numero_sd?: string;
  cliente_nome?: string;
};

type HierarchicalOp = OpCompleta & { _depth: number };

interface OpsQueryResponse {
  items: HierarchicalOp[];
  total: number;
}

interface ClienteRow {
  id: string;
  nome: string;
}

interface LiderPcpRow {
  id: string;
  nome: string;
}

const STATUS_OP = [
  { value: "aberta", label: "Aberta" },
  { value: "liberada", label: "Liberada" },
  { value: "em_producao", label: "Em Produção" },
  { value: "finalizada", label: "Finalizada" },
  { value: "cancelada", label: "Cancelada" },
];

const OPS_PAGE_SIZE = 50;

const canCancelOp = (status: string) => !["cancelada", "concluida"].includes(status);

const statusBadgeVariant = (s: string) => {
  switch (s) {
    case "liberada":
      return "default";
    case "aberta":
      return "secondary";
    case "em_producao":
      return "outline";
    case "finalizada":
      return "secondary";
    case "cancelada":
      return "destructive";
    default:
      return "outline";
  }
};

function GerarOpModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [referenciaId, setReferenciaId] = useState("");
  const [sdId, setSdId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [produtoFinal, setProdutoFinal] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [referencias, setReferencias] = useState<ReferenciaRow[]>([]);
  const [sds, setSds] = useState<SdRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const supabase = getSupabase();
      const { data: refs } = await supabase
        .from("referencias")
        .select("id,codigo_referencia,descricao")
        .eq("ativo", true);
      setReferencias((refs as ReferenciaRow[]) ?? []);
      const { data: cli } = await supabase.from("clientes").select("id,nome").eq("ativo", true);
      setClientes((cli as ClienteRow[]) ?? []);
    })();
  }, [open]);

  const onRefChange = useCallback(async (refId: string) => {
    setReferenciaId(refId);
    setSdId("");
    if (!refId) {
      setSds([]);
      return;
    }
    const supabase = getSupabase();
    const { data } = await supabase
      .from("sds")
      .select("id,numero_sd,referencia_id")
      .eq("referencia_id", refId)
      .eq("ativo", true);
    const sdsData = (data as SdRow[]) ?? [];
    setSds(sdsData);
    if (sdsData.length === 1) setSdId(sdsData[0].id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenciaId || !sdId || !produtoFinal.trim() || !quantidade) {
      toast.error("Preencha referência, SD, produto e quantidade.");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("gerar_op_com_explosao", {
        p_referencia_id: referenciaId,
        p_sd_id: sdId,
        p_cliente_id: clienteId || null,
        p_quantidade: Number(quantidade),
        p_produto_final: produtoFinal.trim(),
      });
      if (error) throw error;
      const count = Array.isArray(data) ? data.length : 1;
      toast.success(`OP gerada com explosão. ${count} ordem(ns) criada(s).`);
      onDone();
      onClose();
      setReferenciaId("");
      setSdId("");
      setClienteId("");
      setProdutoFinal("");
      setQuantidade("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar OP.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Gerar OP (com explosão de BOM)</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Referência (produto pai) *</Label>
            <Select value={referenciaId} onValueChange={onRefChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {referencias.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.codigo_referencia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SD *</Label>
            <Select value={sdId} onValueChange={setSdId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {sds.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.numero_sd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produto final *</Label>
            <Input value={produtoFinal} onChange={(e) => setProdutoFinal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
            ℹ️ Se a estrutura tiver componentes com BOM própria, OPs filhas serão geradas
            automaticamente vinculadas por <code>op_pai_id</code>.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Gerar OP
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CancelarOpModal({
  open,
  op,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  op: OpCompleta | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [motivo, setMotivo] = useState("");
  const [liderId, setLiderId] = useState("");
  const [codigoLider, setCodigoLider] = useState("");
  const [lideres, setLideres] = useState<LiderPcpRow[]>([]);
  const [lideresLoading, setLideresLoading] = useState(false);
  const [lideresError, setLideresError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setMotivo("");
    setLiderId("");
    setCodigoLider("");
    setLideres([]);
    setLideresError(null);
    setCancelError(null);

    let active = true;
    const fetchLideresPcp = async () => {
      setLideresLoading(true);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("lideres")
        .select("id,nome")
        .eq("modulo", "pcp")
        .eq("ativo", true)
        .order("nome");

      if (!active) return;

      if (error) {
        setLideresError(error.message);
        setLideres([]);
      } else {
        setLideres((data as LiderPcpRow[]) ?? []);
      }
      setLideresLoading(false);
    };

    void fetchLideresPcp();
    return () => {
      active = false;
    };
  }, [open]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && cancelling) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!op || !motivo.trim() || !liderId || !codigoLider.trim()) return;

    setCancelling(true);
    setCancelError(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("cancelar_op_pcp", {
        p_op_id: op.id,
        p_lider_id: liderId,
        p_codigo_lider: codigoLider.trim(),
        p_motivo: motivo.trim(),
      });

      if (error) {
        setCancelError(error.message);
        return;
      }

      onOpenChange(false);
      toast.success("OP cancelada com sucesso");
      await onDone();
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Erro ao cancelar OP.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center justify-between gap-4 pr-6">
            <DialogTitle>Cancelar OP {op?.numero_op}</DialogTitle>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Etapa {step} de 2
            </Badge>
          </div>
          <DialogDescription>
            O cancelamento também alcança as OPs filhas e libera os empenhos ativos vinculados.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-cancelamento">Motivo do cancelamento *</Label>
              <textarea
                id="motivo-cancelamento"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Descreva por que esta OP deve ser cancelada"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                disabled={!motivo.trim()}
                onClick={() => {
                  setCancelError(null);
                  setStep(2);
                }}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
              Autorização exclusiva de um líder ativo do módulo PCP.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lider-pcp">Líder PCP *</Label>
              <Select value={liderId} onValueChange={setLiderId} disabled={lideresLoading}>
                <SelectTrigger id="lider-pcp">
                  <SelectValue
                    placeholder={lideresLoading ? "Carregando líderes..." : "Selecione o líder PCP"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {lideres.map((lider) => (
                    <SelectItem key={lider.id} value={lider.id}>
                      {lider.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!lideresLoading && !lideresError && lideres.length === 0 && (
                <p className="text-xs text-destructive">Nenhum líder PCP ativo disponível.</p>
              )}
              {lideresError && <p className="text-xs text-destructive">{lideresError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="codigo-lider-pcp">Código do líder *</Label>
              <Input
                id="codigo-lider-pcp"
                type="password"
                value={codigoLider}
                onChange={(event) => setCodigoLider(event.target.value)}
                placeholder="Digite o código"
                autoComplete="off"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleConfirm();
                }}
              />
            </div>

            {cancelError && (
              <div
                role="alert"
                className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={cancelling}
                onClick={() => {
                  setCancelError(null);
                  setCodigoLider("");
                  setStep(1);
                }}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={cancelling || !liderId || !codigoLider.trim() || Boolean(lideresError)}
                onClick={() => void handleConfirm()}
                className="gap-1.5"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OpsPage() {
  const { user } = useAuth();
  const { perfil } = usePerfil(user);
  const canWrite = perfil?.perfil === "pcp" || perfil?.perfil === "admin";

  const [ops, setOps] = useState<HierarchicalOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("all");
  const [page, setPage] = useState(0);
  const [totalRoots, setTotalRoots] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OpCompleta | null>(null);
  const [cancelOp, setCancelOp] = useState<OpCompleta | null>(null);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await (supabase as any).rpc("listar_ops_pcp", {
        p_busca: buscaDebounced || null,
        p_status: statusFiltro === "all" ? null : statusFiltro,
        p_offset: page * OPS_PAGE_SIZE,
        p_limit: OPS_PAGE_SIZE,
      });
      if (dbError) throw new Error(dbError.message);

      const result = data as OpsQueryResponse | null;
      setOps(Array.isArray(result?.items) ? result.items : []);
      setTotalRoots(Number(result?.total ?? 0));
      setSelectedOp(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar OPs.");
    } finally {
      setLoading(false);
    }
  }, [buscaDebounced, page, statusFiltro]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBuscaDebounced(busca.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [busca]);

  useEffect(() => {
    fetchOps();
  }, [fetchOps]);

  const pageCount = Math.max(1, Math.ceil(totalRoots / OPS_PAGE_SIZE));

  const handleOpCreated = useCallback(() => {
    if (page === 0) void fetchOps();
    else setPage(0);
  }, [fetchOps, page]);

  const handleOpCancelled = useCallback(async () => {
    await fetchOps();
  }, [fetchOps]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Produção</h1>
          <p className="text-sm text-muted-foreground">
            Planejamento de OPs. Explosão automática de BOM.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchOps}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canWrite && (
            <Button size="sm" className="gap-1" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Gerar OP
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por OP, ref, SD, produto, cliente..."
            className="pl-10 text-xs"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={statusFiltro}
            onValueChange={(value) => {
              setStatusFiltro(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OP.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOps}>
              <RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && ops.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhuma OP encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {busca || statusFiltro !== "all"
                ? "Ajuste os filtros."
                : 'Use "Gerar OP" para criar a primeira ordem.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && ops.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Nº OP</th>
                <th className="p-3">Ref</th>
                <th className="p-3">SD</th>
                <th className="p-3">Produto</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3">Status</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Criado</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op) => (
                <tr key={op.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono font-semibold">
                    <div
                      className="flex items-center"
                      style={{ paddingLeft: `${op._depth * 16}px` }}
                    >
                      {op._depth > 0 && (
                        <CornerDownRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      )}
                      {op.numero_op}
                    </div>
                  </td>
                  <td className="p-3">{op.codigo_referencia}</td>
                  <td className="p-3 font-mono text-xs">{op.numero_sd}</td>
                  <td className="p-3">{op.produto_final}</td>
                  <td className="p-3 text-right tabular-nums">
                    {op.quantidade_op?.toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3">
                    <Badge variant={statusBadgeVariant(op.status_op)} className="text-[10px]">
                      {STATUS_OP.find((s) => s.value === op.status_op)?.label ?? op.status_op}
                    </Badge>
                  </td>
                  <td className="p-3">{op.cliente_nome}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {op.created_at ? new Date(op.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Detalhes"
                        onClick={() => setSelectedOp(selectedOp?.id === op.id ? null : op)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canWrite && canCancelOp(op.status_op) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title={`Cancelar OP ${op.numero_op}`}
                          onClick={() => setCancelOp(op)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Cancelar OP
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalRoots > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {totalRoots} grupo(s) de OP — página {page + 1} de {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {selectedOp && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">
              <FileText className="h-4 w-4 inline mr-2" />
              Detalhes: {selectedOp.numero_op}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Referência:</span>{" "}
                {selectedOp.codigo_referencia}
              </div>
              <div>
                <span className="text-muted-foreground">SD:</span>{" "}
                <span className="font-mono">{selectedOp.numero_sd}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                {selectedOp.cliente_nome || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Produto:</span> {selectedOp.produto_final}
              </div>
              <div>
                <span className="text-muted-foreground">Qtd:</span>{" "}
                {selectedOp.quantidade_op?.toLocaleString("pt-BR")}
              </div>
              <div>
                <span className="text-muted-foreground">OP pai:</span>{" "}
                {selectedOp.op_pai_id ? "Sim" : "—"}
              </div>
              {selectedOp.observacao && (
                <div className="col-span-full">
                  <span className="text-muted-foreground">Obs:</span> {selectedOp.observacao}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
        ℹ️ O PCP planeja OPs. A movimentação física de estoque e o apontamento de produção pertencem
        a outros módulos.
      </div>

      <GerarOpModal open={modalOpen} onClose={() => setModalOpen(false)} onDone={handleOpCreated} />
      <CancelarOpModal
        open={Boolean(cancelOp)}
        op={cancelOp}
        onOpenChange={(open) => {
          if (!open) setCancelOp(null);
        }}
        onDone={handleOpCancelled}
      />
    </main>
  );
}

export const Route = createFileRoute("/_pcp/pcp/ops")({
  component: OpsPage,
});
