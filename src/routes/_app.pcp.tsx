import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  FileText,
  Save,
  Eye,
  Edit,
  X,
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
import { toast } from "sonner";
import type { ReferenciaRow, SdRow, OpCompleta as OpCompletaBase } from "@/lib/types";

type OpCompleta = OpCompletaBase & {
  created_at: string;
  updated_at: string;
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

function OpModal({ open, onClose, onSave, editOp }: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<OpCompleta>) => Promise<void>; editOp: OpCompleta | null;
}) {
  const [numeroOp, setNumeroOp] = useState("");
  const [referenciaId, setReferenciaId] = useState("");
  const [sdId, setSdId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [produtoFinal, setProdutoFinal] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [statusOp, setStatusOp] = useState("aberta");
  const [observacao, setObservacao] = useState("");
  const [referencias, setReferencias] = useState<ReferenciaRow[]>([]);
  const [sds, setSds] = useState<SdRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [sdError, setSdError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!editOp;

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

  useEffect(() => {
    if (!editOp) {
      setNumeroOp(""); setReferenciaId(""); setSdId(""); setClienteId("");
      setProdutoFinal(""); setQuantidade(""); setStatusOp("aberta"); setObservacao(""); setSdError(""); setSds([]);
      return;
    }
    setNumeroOp(editOp.numero_op); setReferenciaId(editOp.referencia_id); setSdId(editOp.sd_id);
    setClienteId(editOp.cliente_id ?? ""); setProdutoFinal(editOp.produto_final);
    setQuantidade(String(editOp.quantidade_op)); setStatusOp(editOp.status_op);
    setObservacao(editOp.observacao ?? ""); setSdError("");
    if (editOp.referencia_id) {
      (async () => {
        const supabase = getSupabase();
        const { data: sdsData } = await supabase.from("sds").select("id,numero_sd,referencia_id").eq("referencia_id", editOp.referencia_id).eq("ativo", true);
        setSds((sdsData as SdRow[]) ?? []);
      })();
    }
  }, [editOp, open]);

  const handleRefChange = useCallback(async (refId: string) => {
    setReferenciaId(refId); setSdId(""); setSdError("");
    if (!refId) { setSds([]); return; }
    const supabase = getSupabase();
    const { data } = await supabase.from("sds").select("id,numero_sd,referencia_id").eq("referencia_id", refId).eq("ativo", true);
    const sdsData = (data as SdRow[]) ?? [];
    setSds(sdsData);
    if (sdsData.length === 0) setSdError("Não existe SD vinculada a esta referência.");
    else if (sdsData.length === 1) setSdId(sdsData[0].id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await onSave({
        numero_op: numeroOp.trim(), referencia_id: referenciaId, sd_id: sdId,
        cliente_id: clienteId || null, produto_final: produtoFinal.trim(),
        quantidade_op: Number(quantidade), status_op: statusOp, observacao: observacao.trim() || null,
      });
      onClose();
    } catch { } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar OP" : "Nova Ordem de Produção"}</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Número da OP *</Label>
            <Input value={numeroOp} onChange={(e) => setNumeroOp(e.target.value)} placeholder="Ex: OP-TESTE-002" className="font-mono text-xs" disabled={isEdit} />
            {isEdit && <p className="text-[10px] text-muted-foreground">O número não pode ser alterado após a criação.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Referência *</Label>
            <Select value={referenciaId} onValueChange={(v) => isEdit ? setReferenciaId(v) : handleRefChange(v)} disabled={isEdit}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{referencias.map((r) => (<SelectItem key={r.id} value={r.id}>{r.codigo_referencia}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SD *</Label>
            <Select value={sdId} onValueChange={setSdId} disabled={isEdit}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={sdError || "Selecione..."} /></SelectTrigger>
              <SelectContent>{sds.map((s) => (<SelectItem key={s.id} value={s.id}>{s.numero_sd}</SelectItem>))}</SelectContent>
            </Select>
            {sdError && <p className="text-xs text-destructive">{sdError}</p>}
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
            <Input value={produtoFinal} onChange={(e) => setProdutoFinal(e.target.value)} placeholder="Ex: Produto Final Teste PCP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade *</Label>
              <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 15000" />
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={statusOp} onValueChange={setStatusOp}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OP.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {isEdit ? "Salvar" : "Criar OP"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PcpPage() {
  const [ops, setOps] = useState<OpCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editOp, setEditOp] = useState<OpCompleta | null>(null);
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
        ...r, codigo_referencia: r.referencias?.codigo_referencia ?? "—",
        numero_sd: r.sds?.numero_sd ?? "—", cliente_nome: r.clientes?.nome ?? "—",
      })) as OpCompleta[]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Erro ao carregar OPs."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOps(); }, [fetchOps]);

  const filtered = useMemo(() => {
    let result = ops;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter((op) => op.numero_op.toLowerCase().includes(q) ||
        (op.codigo_referencia ?? "").toLowerCase().includes(q) ||
        (op.numero_sd ?? "").toLowerCase().includes(q) ||
        (op.produto_final ?? "").toLowerCase().includes(q) ||
        (op.cliente_nome ?? "").toLowerCase().includes(q));
    }
    if (statusFiltro) result = result.filter((op) => op.status_op === statusFiltro);
    return result;
  }, [ops, busca, statusFiltro]);

  const handleSave = useCallback(async (data: Partial<OpCompleta>) => {
    const supabase = getSupabase();
    if (editOp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any).from("ops_pcp").update({
        produto_final: data.produto_final, quantidade_op: data.quantidade_op,
        status_op: data.status_op, observacao: data.observacao || null, cliente_id: data.cliente_id || null,
      }).eq("id", editOp.id);
      if (updateError) throw updateError;
      toast.success("OP atualizada com sucesso.");
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from("ops_pcp").insert({
        numero_op: data.numero_op, referencia_id: data.referencia_id, sd_id: data.sd_id,
        cliente_id: data.cliente_id || null, produto_final: data.produto_final,
        quantidade_op: data.quantidade_op, status_op: data.status_op,
        observacao: data.observacao || null, created_by_pcp: true,
      });
      if (insertError) {
        if (insertError.code === "23505") { toast.error("Número de OP já existe."); return; }
        throw insertError;
      }
      toast.success("OP criada com sucesso.");
    }
    fetchOps(); setEditOp(null);
  }, [editOp, fetchOps]);

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-600">
        Ambiente de teste. Não inserir dados reais, pessoais ou sigilosos.
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PCP / Ordens de Produção</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerenciamento de OPs. Apenas o PCP pode criar e editar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchOps}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" className="gap-1" onClick={() => { setEditOp(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova OP
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por OP, ref, SD, produto..." className="pl-10 text-xs" />
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

      {loading && (<div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>)}

      {!loading && error && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOps}><RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhuma OP encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {busca || statusFiltro ? "Nenhuma OP corresponde aos filtros." : 'Crie a primeira OP usando "Nova OP".'}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
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
              {filtered.map((op) => (
                <tr key={op.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-3 font-mono font-semibold">{op.numero_op}</td>
                  <td className="p-3">{op.codigo_referencia}</td>
                  <td className="p-3 font-mono text-xs">{op.numero_sd}</td>
                  <td className="p-3">{op.produto_final}</td>
                  <td className="p-3 text-right tabular-nums">{op.quantidade_op?.toLocaleString("pt-BR")}</td>
                  <td className="p-3"><Badge variant={statusBadgeVariant(op.status_op)} className="text-[10px]">{STATUS_OP.find((s) => s.value === op.status_op)?.label ?? op.status_op}</Badge></td>
                  <td className="p-3">{op.cliente_nome}</td>
                  <td className="p-3 text-xs text-muted-foreground">{op.created_at ? new Date(op.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={() => setSelectedOp(selectedOp?.id === op.id ? null : op)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => { setEditOp(op); setModalOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOp && (
        <Card className="shadow-none border-primary/30">
          <CardHeader><CardTitle className="text-base"><FileText className="h-4 w-4 inline mr-2 text-muted-foreground" />Detalhes: {selectedOp.numero_op}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Número:</span> <span className="font-mono font-semibold">{selectedOp.numero_op}</span></div>
              <div><span className="text-muted-foreground">Referência:</span> {selectedOp.codigo_referencia}</div>
              <div><span className="text-muted-foreground">SD:</span> <span className="font-mono">{selectedOp.numero_sd}</span></div>
              <div><span className="text-muted-foreground">Cliente:</span> {selectedOp.cliente_nome || "—"}</div>
              <div><span className="text-muted-foreground">Produto final:</span> {selectedOp.produto_final}</div>
              <div><span className="text-muted-foreground">Quantidade:</span> {selectedOp.quantidade_op?.toLocaleString("pt-BR")}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadgeVariant(selectedOp.status_op)} className="text-[10px]">{STATUS_OP.find((s) => s.value === selectedOp.status_op)?.label ?? selectedOp.status_op}</Badge></div>
              <div><span className="text-muted-foreground">PCP:</span> {selectedOp.created_by_pcp ? "Sim" : "Não"}</div>
              <div><span className="text-muted-foreground">Criado em:</span> {selectedOp.created_at ? new Date(selectedOp.created_at).toLocaleString("pt-BR") : "—"}</div>
              {selectedOp.observacao && <div className="col-span-full"><span className="text-muted-foreground">Observação:</span> {selectedOp.observacao}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-blue-600 dark:text-blue-400">
        ℹ️ A logística <strong>não cria</strong> OP. Apenas o PCP pode criar e editar OPs.
        A logística consulta OPs para realizar saídas do Armazém 05.
      </div>

      <OpModal open={modalOpen} onClose={() => { setModalOpen(false); setEditOp(null); }} onSave={handleSave} editOp={editOp} />
    </main>
  );
}


export const Route = createFileRoute("/_app/pcp")({
  component: PcpPage,
});
