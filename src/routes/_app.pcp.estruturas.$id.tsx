import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import { ArrowLeft, Save, Loader2, Plus, Trash2, GitBranch, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { EstruturaProduto, EstruturaProdutoItem, ReferenciaRow } from "@/lib/types";

type ItemDraft = {
  id?: string;
  componente_id: string;
  quantidade: number;
  indice_perda: number;
  sequencia: number;
};

function EstruturaEditor() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil } = usePerfil(user);
  const canWrite = perfil?.perfil === "pcp" || perfil?.perfil === "admin";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [referencias, setReferencias] = useState<ReferenciaRow[]>([]);
  const [estrutura, setEstrutura] = useState<EstruturaProduto | null>(null);
  const [referenciaId, setReferenciaId] = useState("");
  const [revisao, setRevisao] = useState(1);
  const [status, setStatus] = useState("ativa");
  const [inicioVig, setInicioVig] = useState<string>(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<ItemDraft[]>([]);

  const vigente = estrutura?.status === "ativa" && !estrutura?.data_fim_vigencia;

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: refs } = await supabase.from("referencias").select("id,codigo_referencia,descricao").eq("ativo", true);
      setReferencias((refs as ReferenciaRow[]) ?? []);
    })();
  }, []);

  const fetchEstrutura = useCallback(async () => {
    if (isNew) return;
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data: est, error: e1 } = await supabase.from("estruturas_produto").select("*").eq("id", id).single();
      if (e1) throw new Error(e1.message);
      const e = est as EstruturaProduto;
      setEstrutura(e);
      setReferenciaId(e.referencia_id);
      setRevisao(e.revisao);
      setStatus(e.status ?? "ativa");
      setInicioVig(e.data_inicio_vigencia ? e.data_inicio_vigencia.slice(0, 10) : "");
      setObservacao(e.observacao ?? "");
      const { data: its } = await supabase.from("estruturas_produto_itens").select("*").eq("estrutura_id", id).order("sequencia");
      setItens(((its as EstruturaProdutoItem[]) ?? []).map((x) => ({
        id: x.id, componente_id: x.componente_id, quantidade: Number(x.quantidade),
        indice_perda: Number(x.indice_perda ?? 0), sequencia: x.sequencia,
      })));
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }, [id, isNew]);

  useEffect(() => { fetchEstrutura(); }, [fetchEstrutura]);

  const addItem = () => setItens((prev) => [...prev, {
    componente_id: "", quantidade: 1, indice_perda: 0, sequencia: (prev[prev.length - 1]?.sequencia ?? 0) + 10,
  }]);
  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const salvar = async () => {
    if (!canWrite) { toast.error("Sem permissão."); return; }
    if (!referenciaId) { toast.error("Selecione a referência."); return; }
    if (itens.length === 0) { toast.error("Adicione ao menos um componente."); return; }
    if (itens.some((it) => !it.componente_id || it.quantidade <= 0)) {
      toast.error("Preencha componente e quantidade em todos os itens."); return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      if (isNew) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: created, error: eIns } = await (supabase as any).from("estruturas_produto").insert({
          referencia_id: referenciaId, revisao, status, data_inicio_vigencia: inicioVig || null,
          observacao: observacao || null,
        }).select().single();
        if (eIns) throw eIns;
        const estId = created.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: eItens } = await (supabase as any).from("estruturas_produto_itens").insert(
          itens.map((it) => ({
            estrutura_id: estId, componente_id: it.componente_id,
            quantidade: it.quantidade, indice_perda: it.indice_perda, sequencia: it.sequencia,
          }))
        );
        if (eItens) throw eItens;
        toast.success("Estrutura criada.");
        navigate({ to: "/pcp/estruturas/$id", params: { id: estId } });
      } else {
        if (vigente) {
          toast.error("Estrutura vigente não pode ser editada. Use 'Nova revisão'.");
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: eUpd } = await (supabase as any).from("estruturas_produto").update({
          observacao: observacao || null,
        }).eq("id", id);
        if (eUpd) throw eUpd;
        toast.success("Observação atualizada.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  const criarNovaRevisao = async () => {
    if (!canWrite || !estrutura) return;
    if (!confirm(`Criar revisão ${estrutura.revisao + 1} e inativar a atual?`)) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const agora = new Date().toISOString();
      // 1. Marcar atual como inativa
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: eUpd } = await (supabase as any).from("estruturas_produto").update({
        status: "inativa", data_fim_vigencia: agora,
      }).eq("id", estrutura.id);
      if (eUpd) throw eUpd;
      // 2. Criar nova revisão
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: nova, error: eIns } = await (supabase as any).from("estruturas_produto").insert({
        referencia_id: estrutura.referencia_id, revisao: estrutura.revisao + 1, status: "ativa",
        data_inicio_vigencia: agora, observacao: estrutura.observacao,
      }).select().single();
      if (eIns) throw eIns;
      const novoId = nova.id as string;
      // 3. Duplicar itens
      if (itens.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: eItens } = await (supabase as any).from("estruturas_produto_itens").insert(
          itens.map((it) => ({
            estrutura_id: novoId, componente_id: it.componente_id,
            quantidade: it.quantidade, indice_perda: it.indice_perda, sequencia: it.sequencia,
          }))
        );
        if (eItens) throw eItens;
      }
      toast.success(`Revisão ${estrutura.revisao + 1} criada.`);
      navigate({ to: "/pcp/estruturas/$id", params: { id: novoId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar revisão.");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <main className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }
  if (error) {
    return <Card className="border-destructive/50 bg-destructive/5"><CardContent className="flex items-center gap-3 py-6"><AlertCircle className="h-5 w-5 text-destructive" /><p className="text-sm">{error}</p></CardContent></Card>;
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/pcp/estruturas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            {isNew ? "Nova Estrutura" : `Estrutura rev. ${revisao}`}
            {vigente && <Badge variant="default" className="ml-2 text-[10px]">vigente</Badge>}
          </h1>
        </div>
        {!isNew && canWrite && (
          <Button variant="outline" size="sm" onClick={criarNovaRevisao} disabled={saving} className="gap-1">
            <GitBranch className="h-3.5 w-3.5" /> Nova revisão
          </Button>
        )}
        {canWrite && !vigente && (
          <Button size="sm" onClick={salvar} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da estrutura</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Produto pai (referência) *</Label>
            <Select value={referenciaId} onValueChange={setReferenciaId} disabled={!isNew}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{referencias.map((r) => (<SelectItem key={r.id} value={r.id}>{r.codigo_referencia}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Revisão</Label>
            <Input type="number" value={revisao} onChange={(e) => setRevisao(Number(e.target.value))} disabled={!isNew} />
          </div>
          <div className="space-y-1.5">
            <Label>Início vigência</Label>
            <Input type="date" value={inicioVig} onChange={(e) => setInicioVig(e.target.value)} disabled={!isNew} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Input value={status} disabled />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observação</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} disabled={!canWrite} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens (componentes)</CardTitle>
          {canWrite && !vigente && (
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar</Button>
          )}
        </CardHeader>
        <CardContent>
          {itens.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum componente.</p>}
          {itens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                    <th className="p-2 w-16">Seq.</th>
                    <th className="p-2">Componente</th>
                    <th className="p-2 w-28 text-right">Quantidade</th>
                    <th className="p-2 w-24 text-right">Perda %</th>
                    {canWrite && !vigente && <th className="p-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2"><Input type="number" value={it.sequencia} onChange={(e) => updateItem(idx, { sequencia: Number(e.target.value) })} className="h-7 text-xs" disabled={vigente || !canWrite} /></td>
                      <td className="p-2">
                        <Select value={it.componente_id} onValueChange={(v) => updateItem(idx, { componente_id: v })} disabled={vigente || !canWrite}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>{referencias.map((r) => (<SelectItem key={r.id} value={r.id}>{r.codigo_referencia}</SelectItem>))}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Input type="number" step="0.001" value={it.quantidade} onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })} className="h-7 text-xs text-right" disabled={vigente || !canWrite} /></td>
                      <td className="p-2"><Input type="number" step="0.01" value={it.indice_perda} onChange={(e) => updateItem(idx, { indice_perda: Number(e.target.value) })} className="h-7 text-xs text-right" disabled={vigente || !canWrite} /></td>
                      {canWrite && !vigente && (
                        <td className="p-2"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {vigente && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          ℹ️ Esta é a revisão vigente. Para alterar itens, use <strong>Nova revisão</strong> — a atual será inativada automaticamente.
        </div>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_app/pcp/estruturas/$id")({
  component: EstruturaEditor,
});
