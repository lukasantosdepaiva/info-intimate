import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import {
  AlertCircle, RefreshCw, Loader2, Plus, Search, FileText, Save, Eye, X, CornerDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ReferenciaRow, SdRow, OpCompleta as OpCompletaBase } from "@/lib/types";

type OpCompleta = OpCompletaBase & {
  created_at: string;
  updated_at?: string;
  codigo_referencia?: string;
  numero_sd?: string;
  cliente_nome?: string;
};

interface ClienteRow { id: string; nome: string; }

const STATUS_OP = [
  { value: "aberta", label: "Aberta" },
  { value: "liberada", label: "Liberada" },
  { value: "em_producao", label: "Em Produção" },
  { value: "finalizada", label: "Finalizada" },
  { value: "cancelada", label: "Cancelada" },
];

const statusBadgeVariant = (s: string) => {
  switch (s) {
    case "liberada": return "default";
    case "aberta": return "secondary";
    case "em_producao": return "outline";
    case "finalizada": return "secondary";
    case "cancelada": return "destructive";
    default: return "outline";
  }
};

function GerarOpModal({ open, onClose, onDone }: {
  open: boolean; onClose: () => void; onDone: () => void;
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
      const { data: refs } = await supabase.from("referencias").select("id,codigo_referencia,descricao").eq("ativo", true);
      setReferencias((refs as ReferenciaRow[]) ?? []);
      const { data: cli } = await supabase.from("clientes").select("id,nome").eq("ativo", true);
      setClientes((cli as ClienteRow[]) ?? []);
    })();
  }, [open]);

  const onRefChange = useCallback(async (refId: string) => {
    setReferenciaId(refId); setSdId("");
    if (!refId) { setSds([]); return; }
    const supabase = getSupabase();
    const { data } = await supabase.from("sds").select("id,numero_sd,referencia_id").eq("referencia_id", refId).eq("ativo", true);
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
      onDone(); onClose();
      setReferenciaId(""); setSdId(""); setClienteId(""); setProdutoFinal(""); setQuantidade("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar OP.");
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Gerar OP (com explosão de BOM)</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Referência (produto pai) *</Label>
            <Select value={referenciaId} onValueChange={onRefChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{referencias.map((r) => (<SelectItem key={r.id} value={r.id}>{r.codigo_referencia}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SD *</Label>
            <Select value={sdId} onValueChange={setSdId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{sds.map((s) => (<SelectItem key={s.id} value={s.id}>{s.numero_sd}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produto final *</Label>
            <Input value={produtoFinal} onChange={(e) => setProdutoFinal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Quantidade *</Label>
            <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
            ℹ️ Se a estrutura tiver componentes com BOM própria, OPs filhas serão geradas automaticamente vinculadas por <code>op_pai_id</code>.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
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

function OpsPage() {
  const { user } = useAuth();
  const { perfil } = usePerfil(user);
  const canWrite = perfil?.perfil === "pcp" || perfil?.perfil === "admin";

  const [ops, setOps] = useState<OpCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OpCompleta | null>(null);

  const fetchOps = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: dbError } = await supabase
        .from("ops_pcp")
        .select("*, referencias!referencia_id(codigo_referencia), sds!sd_id(numero_sd), clientes!cliente_id(nome)")
        .order("created_at", { ascending: false });
      if (dbError) throw new Error(dbError.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOps(((data ?? []) as any[]).map((r: any) => ({
        ...r,
        codigo_referencia: r.referencias?.codigo_referencia ?? "—",
        numero_sd: r.sds?.numero_sd ?? "—",
        cliente_nome: r.clientes?.nome ?? "—",
      })) as OpCompleta[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar OPs."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOps(); }, [fetchOps]);

  // Hierarquia: pais primeiro, filhas indentadas logo abaixo do pai
  const orderedFiltered = useMemo(() => {
    let base = ops;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      base = base.filter((op) => op.numero_op.toLowerCase().includes(q) ||
        (op.codigo_referencia ?? "").toLowerCase().includes(q) ||
        (op.numero_sd ?? "").toLowerCase().includes(q) ||
        (op.produto_final ?? "").toLowerCase().includes(q) ||
        (op.cliente_nome ?? "").toLowerCase().includes(q));
    }
    if (statusFiltro) base = base.filter((op) => op.status_op === statusFiltro);

    const byPai = new Map<string | null, OpCompleta[]>();
    for (const op of base) {
      const key = op.op_pai_id ?? null;
      if (!byPai.has(key)) byPai.set(key, []);
      byPai.get(key)!.push(op);
    }
    const out: Array<OpCompleta & { _depth: number }> = [];
    const visit = (paiId: string | null, depth: number) => {
      for (const op of byPai.get(paiId) ?? []) {
        out.push({ ...op, _depth: depth });
        visit(op.id, depth + 1);
      }
    };
    visit(null, 0);
    // adiciona órfãs (pai não presente na lista atual) no fim
    const included = new Set(out.map((o) => o.id));
    for (const op of base) if (!included.has(op.id)) out.push({ ...op, _depth: 0 });
    return out;
  }, [ops, busca, statusFiltro]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Produção</h1>
          <p className="text-sm text-muted-foreground">Planejamento de OPs. Explosão automática de BOM.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchOps}><RefreshCw className="h-4 w-4" /></Button>
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
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por OP, ref, SD, produto, cliente..." className="pl-10 text-xs" />
        </div>
        <div className="w-full sm:w-44">
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              {STATUS_OP.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}

      {!loading && error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOps}><RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && orderedFiltered.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Nenhuma OP encontrada</h3>
          <p className="text-sm text-muted-foreground">{busca || statusFiltro ? "Ajuste os filtros." : 'Use "Gerar OP" para criar a primeira ordem.'}</p>
        </CardContent></Card>
      )}

      {!loading && !error && orderedFiltered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Nº OP</th><th className="p-3">Ref</th><th className="p-3">SD</th>
                <th className="p-3">Produto</th><th className="p-3 text-right">Qtd</th>
                <th className="p-3">Status</th><th className="p-3">Cliente</th>
                <th className="p-3">Criado</th><th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orderedFiltered.map((op) => (
                <tr key={op.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono font-semibold">
                    <div className="flex items-center" style={{ paddingLeft: `${op._depth * 16}px` }}>
                      {op._depth > 0 && <CornerDownRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />}
                      {op.numero_op}
                    </div>
                  </td>
                  <td className="p-3">{op.codigo_referencia}</td>
                  <td className="p-3 font-mono text-xs">{op.numero_sd}</td>
                  <td className="p-3">{op.produto_final}</td>
                  <td className="p-3 text-right tabular-nums">{op.quantidade_op?.toLocaleString("pt-BR")}</td>
                  <td className="p-3"><Badge variant={statusBadgeVariant(op.status_op)} className="text-[10px]">{STATUS_OP.find((s) => s.value === op.status_op)?.label ?? op.status_op}</Badge></td>
                  <td className="p-3">{op.cliente_nome}</td>
                  <td className="p-3 text-xs text-muted-foreground">{op.created_at ? new Date(op.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={() => setSelectedOp(selectedOp?.id === op.id ? null : op)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOp && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-base"><FileText className="h-4 w-4 inline mr-2" />Detalhes: {selectedOp.numero_op}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Referência:</span> {selectedOp.codigo_referencia}</div>
              <div><span className="text-muted-foreground">SD:</span> <span className="font-mono">{selectedOp.numero_sd}</span></div>
              <div><span className="text-muted-foreground">Cliente:</span> {selectedOp.cliente_nome || "—"}</div>
              <div><span className="text-muted-foreground">Produto:</span> {selectedOp.produto_final}</div>
              <div><span className="text-muted-foreground">Qtd:</span> {selectedOp.quantidade_op?.toLocaleString("pt-BR")}</div>
              <div><span className="text-muted-foreground">OP pai:</span> {selectedOp.op_pai_id ? "Sim" : "—"}</div>
              {selectedOp.observacao && <div className="col-span-full"><span className="text-muted-foreground">Obs:</span> {selectedOp.observacao}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
        ℹ️ O PCP planeja OPs. A movimentação física de estoque e o apontamento de produção pertencem a outros módulos.
      </div>

      <GerarOpModal open={modalOpen} onClose={() => setModalOpen(false)} onDone={fetchOps} />
    </main>
  );
}

export const Route = createFileRoute("/_pcp/pcp/ops")({
  component: OpsPage,
});
