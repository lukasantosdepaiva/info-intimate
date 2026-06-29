import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  ClipboardCheck,
  AlertCircle,
  Search,
  Loader2,
  CheckCircle2,
  Package,
  FileWarning,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface PalletRow {
  id: string;
  codigo_pallet: string;
  nf_entrada_numero: string;
  cliente_nome: string;
  fornecedor_nome: string;
  referencia_codigo: string;
  sd_numero: string | null;
  quantidade: number;
  status: string;
  locais: string;
}

const RESULTADOS = [
  { value: "pendente", label: "Pendente" },
  { value: "aguardando_inspecao", label: "Aguardando Inspeção" },
  { value: "aprovado", label: "Aprovado" },
  { value: "nao_conforme", label: "Não Conforme" },
];

const statusColor = (s: string) => {
  switch (s) {
    case "aprovado":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    case "nao_conforme":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    case "pendente":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    case "aguardando_inspecao":
      return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    default:
      return "";
  }
};

function InspecaoPage() {
  // Busca de pallet
  const [palletBusca, setPalletBusca] = useState("");
  const [palletLoading, setPalletLoading] = useState(false);
  const [pallet, setPallet] = useState<PalletRow | null>(null);
  const [palletNotFound, setPalletNotFound] = useState(false);

  // Form
  const [resultado, setResultado] = useState("");
  const [quantidadeInspecionada, setQuantidadeInspecionada] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [resposta, setResposta] = useState<{
    sucesso: boolean;
    mensagem: string;
    bloqueada?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarRnc, setMostrarRnc] = useState(false);

  // ─── Buscar pallet ────────────────────────────────────────
  const buscarPallet = useCallback(async (codigo: string) => {
    if (!codigo.trim()) {
      setPallet(null);
      setPalletNotFound(false);
      return;
    }
    setPalletLoading(true);
    setPallet(null);
    setPalletNotFound(false);
    setResposta(null);
    setError(null);
    setMostrarRnc(false);
    try {
      const supabase = getSupabase();
      const { data, error: dbError } = await supabase
        .from("vw_pallet_resumo")
        .select("*")
        .ilike("codigo_pallet", codigo.trim())
        .limit(1);
      if (dbError) throw new Error(dbError.message);
      if (!data || data.length === 0) {
        setPalletNotFound(true);
        return;
      }
      setPallet(data[0] as PalletRow);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar pallet.";
      setError(msg);
    } finally {
      setPalletLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (palletBusca.trim().length >= 3) buscarPallet(palletBusca);
    }, 300);
    return () => clearTimeout(timer);
  }, [palletBusca, buscarPallet]);

  // ─── Validar ──────────────────────────────────────────────
  const errosValidacao: string[] = [];
  if (!pallet) errosValidacao.push("Busque e selecione um pallet.");
  if (!resultado) errosValidacao.push("Selecione o resultado da inspeção.");
  const qtd = Number(quantidadeInspecionada);
  if (!quantidadeInspecionada || isNaN(qtd) || qtd <= 0)
    errosValidacao.push("Quantidade inspecionada deve ser maior que zero.");
  if (!responsavel.trim()) errosValidacao.push("Responsável é obrigatório.");

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (errosValidacao.length > 0) return;
      setSubmitting(true);
      setError(null);
      setResposta(null);
      setMostrarRnc(false);
      try {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcError } = await (supabase as any).rpc(
          "registrar_inspecao_pallet",
          {
            p_pallet_id: pallet!.id,
            p_resultado: resultado,
            p_quantidade_inspecionada: Number(quantidadeInspecionada),
            p_responsavel_inspecao: responsavel.trim(),
            p_observacao: observacao.trim() || null,
          }
        );
        if (rpcError) {
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResposta({
              sucesso: false,
              mensagem:
                "Função bloqueada por segurança. É necessário liberar a RPC registrar_inspecao_pallet para teste ou chamar por backend seguro.",
              bloqueada: true,
            });
            return;
          }
          throw new Error(rpcError.message);
        }
        setResposta({
          sucesso: true,
          mensagem: `Inspeção registrada com sucesso. Resultado: ${resultado}.`,
        });
        if (resultado === "nao_conforme") setMostrarRnc(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao registrar inspeção.";
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [errosValidacao, pallet, resultado, quantidadeInspecionada, responsavel, observacao]
  );

  const limparFormulario = () => {
    setPalletBusca("");
    setPallet(null);
    setPalletNotFound(false);
    setResultado("");
    setQuantidadeInspecionada("");
    setResponsavel("");
    setObservacao("");
    setResposta(null);
    setError(null);
    setMostrarRnc(false);
  };

  // ─── UI ───────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inspeção de Pallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspecione pallets, registre resultado e abra RNC se necessário.
        </p>
      </div>

      {/* Resposta */}
      {resposta && (
        <Card
          className={`shadow-none ${
            resposta.sucesso
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div
              className={`rounded-full p-3 ${
                resposta.sucesso ? "bg-green-500/10" : "bg-destructive/10"
              }`}
            >
              {resposta.sucesso ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h2 className="text-lg font-semibold">
              {resposta.sucesso ? "Inspeção registrada" : "Função bloqueada"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {resposta.mensagem}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {resposta.sucesso && (
                <Button variant="outline" size="sm" onClick={limparFormulario}>
                  Nova inspeção
                </Button>
              )}
              {mostrarRnc && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const params = new URLSearchParams({
                      pallet_id: pallet!.id,
                      codigo_pallet: pallet!.codigo_pallet,
                      nf_numero: pallet!.nf_entrada_numero,
                      referencia_codigo: pallet!.referencia_codigo,
                      sd_numero: pallet!.sd_numero ?? "",
                      quantidade_inspecionada: quantidadeInspecionada,
                    });
                    window.location.href = `/inspecao/rnc?${params.toString()}`;
                  }}
                >
                  <FileWarning className="h-4 w-4" />
                  Abrir RNC
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Erro ao registrar</h2>
            <p className="max-w-md text-xs text-muted-foreground font-mono">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {!resposta && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Busca pallet */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                Buscar Pallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={palletBusca}
                  onChange={(e) => setPalletBusca(e.target.value)}
                  placeholder="Digite o código do pallet (ex: PLT-000001)..."
                  className="pl-10 font-mono text-xs"
                />
                {palletLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {palletNotFound && (
                <p className="text-xs text-destructive">Pallet não encontrado.</p>
              )}

              {pallet && (
                <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {pallet.codigo_pallet}
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${statusColor(pallet.status)}`}
                    >
                      {pallet.status}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">NF Entrada:</span>
                    <span className="font-mono">{pallet.nf_entrada_numero}</span>
                    <span className="text-muted-foreground">Cliente:</span>
                    <span>{pallet.cliente_nome}</span>
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span>{pallet.fornecedor_nome}</span>
                    <span className="text-muted-foreground">Referência:</span>
                    <span className="font-mono">{pallet.referencia_codigo}</span>
                    <span className="text-muted-foreground">SD:</span>
                    <span className="font-mono">{pallet.sd_numero || "—"}</span>
                    <span className="text-muted-foreground">Qtd. Atual:</span>
                    <span className="font-bold">{pallet.quantidade.toLocaleString()}</span>
                    <span className="text-muted-foreground">Locais:</span>
                    <span className="font-mono text-[10px]">{pallet.locais || "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados da inspeção */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                Resultado da Inspeção
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Resultado *</Label>
                <div className="flex flex-wrap gap-2">
                  {RESULTADOS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setResultado(r.value)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-colors ${
                        resultado === r.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qtd">Quantidade inspecionada *</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  value={quantidadeInspecionada}
                  onChange={(e) => setQuantidadeInspecionada(e.target.value)}
                  placeholder="Ex: 10000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resp">Responsável *</Label>
                <Input
                  id="resp"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do inspetor"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obs">Observação</Label>
                <Input
                  id="obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Erros */}
          {errosValidacao.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
              <ul className="space-y-1 text-xs text-destructive">
                {errosValidacao.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={submitting || errosValidacao.length > 0}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  Registrar inspeção
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={limparFormulario}
            >
              Limpar
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_app/inspecao/")({
  component: InspecaoPage,
});
