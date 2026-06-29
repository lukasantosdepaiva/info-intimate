import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useState, useCallback, Suspense } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  FileWarning,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Package,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RncForm() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();

  const pallet_id = searchParams.get("pallet_id") ?? "";
  const codigo_pallet = searchParams.get("codigo_pallet") ?? "";
  const nf_numero = searchParams.get("nf_numero") ?? "";
  const referencia_codigo = searchParams.get("referencia_codigo") ?? "";
  const sd_numero = searchParams.get("sd_numero") ?? "";
  const qtdInspecionada = searchParams.get("quantidade_inspecionada") ?? "";

  const [quantidadeAfetada, setQuantidadeAfetada] = useState(qtdInspecionada);
  const [tipoDefeito, setTipoDefeito] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resposta, setResposta] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Validar ──────────────────────────────────────────────
  const errosValidacao: string[] = [];
  if (!pallet_id) errosValidacao.push("Pallet não informado.");
  const qaf = Number(quantidadeAfetada);
  if (!quantidadeAfetada || isNaN(qaf) || qaf <= 0)
    errosValidacao.push("Quantidade afetada deve ser maior que zero.");
  if (!tipoDefeito.trim()) errosValidacao.push("Tipo de defeito é obrigatório.");
  if (!descricao.trim())
    errosValidacao.push("Descrição da não conformidade é obrigatória.");
  if (!responsavel.trim())
    errosValidacao.push("Responsável pela abertura é obrigatório.");

  // ─── Submit RNC ───────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (errosValidacao.length > 0) return;
      setSubmitting(true);
      setError(null);
      setResposta(null);
      try {
        const supabase = getSupabase();
        const obsFinal = [
          "Referência: " + (referencia_codigo || "—"),
          "SD: " + (sd_numero || "—"),
          "NF: " + (nf_numero || "—"),
          observacao ? observacao : null,
        ]
          .filter(Boolean)
          .join(" | ");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcError } = await (supabase as any).rpc("abrir_rnc_basica", {
          p_pallet_id: pallet_id,
          p_tipo_defeito: tipoDefeito.trim(),
          p_descricao: descricao.trim(),
          p_quantidade_afetada: Number(quantidadeAfetada),
          p_responsavel: responsavel,
          p_observacao: obsFinal,
        });

        if (rpcError) {
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResposta({
              sucesso: false,
              mensagem:
                "Fun\u00e7\u00e3o de RNC bloqueada por seguran\u00e7a. \u00c9 necess\u00e1rio liberar a RPC abrir_rnc_basica para teste ou chamar por backend seguro.",
            });
            return;
          }
          throw new Error(rpcError.message);
        }

        setResposta({
          sucesso: true,
          mensagem: "RNC b\u00e1sica aberta com sucesso.",
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erro ao abrir RNC.";
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      errosValidacao,
      pallet_id,
      nf_numero,
      referencia_codigo,
      sd_numero,
      observacao,
      tipoDefeito,
      descricao,
      quantidadeAfetada,
      responsavel,
    ]
  );

  // ─── UI ───────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Abrir RNC &mdash; N\u00e3o Conformidade
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            RNC completa depende do procedimento/formul\u00e1rio completo FQ023/PQ010.
            Esta \u00e9 uma RNC b\u00e1sica inicial.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => navigate({ to: "/inspecao" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
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
              {resposta.sucesso ? "RNC aberta" : "Fun\u00e7\u00e3o bloqueada"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {resposta.mensagem}
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/inspecao" })}
              >
                Voltar para inspe\u00e7\u00e3o
              </Button>
              {resposta.sucesso && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: "/rnc" })}
                >
                  Ver RNCs
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
            <h2 className="text-lg font-semibold">Erro ao abrir RNC</h2>
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
          {/* Dados do pallet */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Pallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">C\u00f3digo:</span>
                <span className="font-mono font-bold">{codigo_pallet}</span>
                <span className="text-muted-foreground">NF Entrada:</span>
                <span className="font-mono text-xs">{nf_numero}</span>
                <span className="text-muted-foreground">Refer\u00eancia:</span>
                <span className="font-mono text-xs">{referencia_codigo}</span>
                <span className="text-muted-foreground">SD:</span>
                <span className="font-mono text-xs">{sd_numero}</span>
              </div>
            </CardContent>
          </Card>

          {/* Campos RNC */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-muted-foreground" />
                Abertura de RNC B\u00e1sica
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qtd-af">Quantidade afetada *</Label>
                <Input
                  id="qtd-af"
                  type="number"
                  min="1"
                  value={quantidadeAfetada}
                  onChange={(e) => setQuantidadeAfetada(e.target.value)}
                  placeholder="Ex: 1000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipo-def">Tipo de defeito *</Label>
                <Input
                  id="tipo-def"
                  value={tipoDefeito}
                  onChange={(e) => setTipoDefeito(e.target.value)}
                  placeholder="Ex: Defeito teste"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="desc">Descri\u00e7\u00e3o da n\u00e3o conformidade *</Label>
                <Input
                  id="desc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a n\u00e3o conformidade encontrada"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resp-rnc">Respons\u00e1vel pela abertura *</Label>
                <Input
                  id="resp-rnc"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do respons\u00e1vel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs-rnc">Observa\u00e7\u00e3o</Label>
                <Input
                  id="obs-rnc"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Aviso */}
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-4 text-xs text-yellow-600 dark:text-yellow-400">
            \u26a0\ufe0f RNC completa depende do procedimento/formul\u00e1rio completo
            FQ023/PQ010. Esta \u00e9 uma RNC b\u00e1sica inicial.
          </div>

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
                  Abrindo RNC...
                </>
              ) : (
                <>
                  <FileWarning className="h-4 w-4" />
                  Abrir RNC b\u00e1sica
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => navigate({ to: "/inspecao" })}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

function RncPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RncForm />
    </Suspense>
  );
}

export const Route = createFileRoute("/_app/inspecao/rnc")({
  component: RncPage,
});
