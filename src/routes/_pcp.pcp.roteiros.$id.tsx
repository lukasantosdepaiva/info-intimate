import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { usePerfil } from "@/hooks/use-perfil";
import { useLocaisEstoque } from "@/contexts/locais-estoque-context";
import { ArrowLeft, Save, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { RoteiroProducao, RoteiroOperacao, ReferenciaRow } from "@/lib/types";

type OpDraft = {
  id?: string;
  sequencia: number;
  descricao: string;
  local_execucao_id: string;
  tempo_padrao_min: number;
};

function RoteiroEditor() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil } = usePerfil(user);
  const canWrite = perfil?.perfil === "pcp" || perfil?.perfil === "admin";
  const { locais } = useLocaisEstoque();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencias, setReferencias] = useState<ReferenciaRow[]>([]);
  const [referenciaId, setReferenciaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [ops, setOps] = useState<OpDraft[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("referencias")
        .select("id,codigo_referencia,descricao")
        .eq("ativo", true);
      setReferencias((data as ReferenciaRow[]) ?? []);
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: rot, error: e1 } = await supabase
        .from("roteiros_producao")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw new Error(e1.message);
      const r = rot as RoteiroProducao;
      setReferenciaId(r.produto_id);
      setDescricao(r.nome);
      setAtivo(r.status === "ativo");
      const { data: opsData } = await supabase
        .from("roteiro_operacoes")
        .select("*")
        .eq("roteiro_id", id)
        .order("sequencia");
      setOps(
        ((opsData as RoteiroOperacao[]) ?? []).map((o) => ({
          id: o.id,
          sequencia: o.sequencia,
          descricao: o.descricao_operacao,
          local_execucao_id: o.local_execucao_id ?? "",
          tempo_padrao_min: Number(o.tempo_padrao_minutos ?? 0),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addOp = () =>
    setOps((prev) => [
      ...prev,
      {
        sequencia: (prev[prev.length - 1]?.sequencia ?? 0) + 10,
        descricao: "",
        local_execucao_id: "",
        tempo_padrao_min: 0,
      },
    ]);
  const removeOp = (idx: number) => setOps((prev) => prev.filter((_, i) => i !== idx));
  const updateOp = (idx: number, patch: Partial<OpDraft>) =>
    setOps((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  const salvar = async () => {
    if (!canWrite) {
      toast.error("Sem permissão.");
      return;
    }
    if (!referenciaId) {
      toast.error("Selecione a referência.");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: savedId, error: saveError } = await (supabase as any).rpc(
        "salvar_roteiro_producao",
        {
          p_roteiro_id: isNew ? null : id,
          p_produto_id: referenciaId,
          p_nome: descricao || null,
          p_status: ativo ? "ativo" : "inativo",
          p_operacoes: ops.map((o) => ({
            sequencia: o.sequencia,
            descricao_operacao: o.descricao,
            local_execucao_id: o.local_execucao_id || null,
            tempo_padrao_minutos: o.tempo_padrao_min,
          })),
        },
      );
      if (saveError) throw saveError;
      const roteiroId = savedId as string;
      if (!roteiroId) throw new Error("A função não retornou o roteiro salvo.");
      toast.success(isNew ? "Roteiro criado." : "Roteiro atualizado.");
      if (isNew) navigate({ to: "/pcp/roteiros/$id", params: { id: roteiroId! } });
      else fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  if (error)
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pcp/roteiros">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight flex-1">
          {isNew ? "Novo Roteiro" : "Editar Roteiro"}
        </h1>
        {canWrite && (
          <Button size="sm" onClick={salvar} disabled={saving} className="gap-1">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do roteiro</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Produto (referência) *</Label>
            <Select
              value={referenciaId}
              onValueChange={setReferenciaId}
              disabled={!isNew || !canWrite}
            >
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
            <Label>Status</Label>
            <Select
              value={ativo ? "1" : "0"}
              onValueChange={(v) => setAtivo(v === "1")}
              disabled={!canWrite}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Ativo</SelectItem>
                <SelectItem value="0">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={!canWrite}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Operações</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={addOp} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {ops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma operação.</p>
          )}
          {ops.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                    <th className="p-2 w-16">Seq.</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 w-64">Local de execução</th>
                    <th className="p-2 w-28 text-right">Tempo (min)</th>
                    {canWrite && <th className="p-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {ops.map((o, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">
                        <Input
                          type="number"
                          value={o.sequencia}
                          onChange={(e) => updateOp(idx, { sequencia: Number(e.target.value) })}
                          className="h-7 text-xs"
                          disabled={!canWrite}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={o.descricao}
                          onChange={(e) => updateOp(idx, { descricao: e.target.value })}
                          className="h-7 text-xs"
                          disabled={!canWrite}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={o.local_execucao_id}
                          onValueChange={(v) => updateOp(idx, { local_execucao_id: v })}
                          disabled={!canWrite}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {locais.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.descricao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={o.tempo_padrao_min}
                          onChange={(e) =>
                            updateOp(idx, { tempo_padrao_min: Number(e.target.value) })
                          }
                          className="h-7 text-xs text-right"
                          disabled={!canWrite}
                        />
                      </td>
                      {canWrite && (
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeOp(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export const Route = createFileRoute("/_pcp/pcp/roteiros/$id")({
  component: RoteiroEditor,
});
