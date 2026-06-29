import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Shield,
  User,
  Key,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const LIDER_TESTE_ID = "6c19eceb-ced3-4b7d-9bb7-5903764177f1";

interface MovimentacaoRow {
  id: string;
  pallet_id: string;
  local_origem_id: string;
  local_destino_id: string;
  quantidade: number;
  responsavel_solicitacao: string | null;
  motivo: string | null;
  status: string;
  created_at: string;
  codigo_pallet?: string;
  origem_codigo?: string;
  origem_descricao?: string;
  destino_codigo?: string;
  destino_descricao?: string;
  lider_nome?: string | null;
  observacao_lider?: string | null;
}

interface LocalJoin {
  codigo_local: string | null;
  armazem_nome: string | null;
  galpao: string | null;
  rua: string | null;
  processo: string | null;
  descricao: string | null;
}

interface MovimentacaoFullJoin {
  id: string;
  pallet_id: string;
  local_origem_id: string;
  local_destino_id: string;
  quantidade: number | string;
  responsavel_solicitacao: string | null;
  motivo: string | null;
  status: string;
  created_at: string;
  observacao_lider?: string | null;
  pallet?: { codigo_pallet: string | null } | null;
  local_origem?: LocalJoin | null;
  local_destino?: LocalJoin | null;
  lider?: { nome: string | null } | null;
}

const textoExibicao = (valor: unknown, fallback = "—") => {
  const texto = String(valor ?? "").trim();
  return texto || fallback;
};

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const formatarNumero = (valor: unknown) => {
  return numeroSeguro(valor).toLocaleString("pt-BR");
};

const formatarLocal = (local?: LocalJoin | null) => {
  if (!local) return "—";

  const partes = [local.armazem_nome, local.galpao, local.rua]
    .map((valor) => String(valor ?? "").trim())
    .filter(Boolean);

  return partes.length > 0
    ? partes.join(" / ")
    : textoExibicao(local.descricao);
};

function AprovacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liderNome, setLiderNome] = useState("Líder Teste");
  const [codigoLider, setCodigoLider] = useState("");
  const [obsAprovacao, setObsAprovacao] = useState("");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    titulo: string;
    mensagem: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchMovimentacoes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      const { data, error: dbError } = await supabase
        .from("movimentacoes")
        .select(`
          *,
          pallet:pallets!movimentacoes_pallet_id_fkey(
            codigo_pallet
          ),
          local_origem:locais_estoque!movimentacoes_local_origem_id_fkey(
            codigo_local,
            armazem_nome,
            galpao,
            rua,
            processo,
            descricao
          ),
          local_destino:locais_estoque!movimentacoes_local_destino_id_fkey(
            codigo_local,
            armazem_nome,
            galpao,
            rua,
            processo,
            descricao
          ),
          lider:lideres!movimentacoes_lider_id_fkey(
            nome
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (dbError) throw new Error(dbError.message);

      const mapped: MovimentacaoRow[] = (
        (data ?? []) as unknown as MovimentacaoFullJoin[]
      ).map((r) => ({
        id: r.id,
        pallet_id: r.pallet_id,
        local_origem_id: r.local_origem_id,
        local_destino_id: r.local_destino_id,
        quantidade: numeroSeguro(r.quantidade),
        responsavel_solicitacao: r.responsavel_solicitacao,
        motivo: r.motivo,
        status: r.status,
        created_at: r.created_at,
        codigo_pallet:
          r.pallet?.codigo_pallet ?? r.pallet_id?.slice(0, 8) ?? "—",
        origem_codigo:
          r.local_origem?.codigo_local ?? r.local_origem_id?.slice(0, 8) ?? "—",
        origem_descricao: formatarLocal(r.local_origem),
        destino_codigo:
          r.local_destino?.codigo_local ??
          r.local_destino_id?.slice(0, 8) ??
          "—",
        destino_descricao: formatarLocal(r.local_destino),
        lider_nome: r.lider?.nome ?? null,
        observacao_lider: r.observacao_lider ?? null,
      }));

      setMovimentacoes(mapped);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao carregar movimentações.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

  const pendentes = movimentacoes.filter((m) => m.status === "pendente");
  const processadas = movimentacoes.filter((m) => m.status !== "pendente");

  const limparCamposAcao = useCallback(() => {
    setSelectedId(null);
    setCodigoLider("");
    setObsAprovacao("");
    setMotivoRejeicao("");
    setSubmitError(null);
  }, []);

  const validarCodigoLider = useCallback(() => {
    if (!codigoLider.trim()) {
      setSubmitError("Digite o código do líder.");
      return false;
    }

    return true;
  }, [codigoLider]);

  const handleAprovar = useCallback(
    async (movimentacaoId: string) => {
      if (!validarCodigoLider()) return;

      setSubmitting(true);
      setSubmitError(null);
      setResultado(null);

      try {
        const supabase = getSupabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc(
          "aprovar_e_executar_movimentacao",
          {
            p_movimentacao_id: movimentacaoId,
            p_lider_id: LIDER_TESTE_ID,
            p_codigo_lider: codigoLider.trim(),
            p_observacao_lider: obsAprovacao.trim() || null,
          }
        );

        if (rpcError) {
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResultado({
              sucesso: false,
              titulo: "Função bloqueada",
              mensagem:
                "Função de aprovação bloqueada por segurança. É necessário liberar a RPC aprovar_e_executar_movimentacao para teste ou chamar por backend seguro.",
            });
            return;
          }

          throw new Error(rpcError.message);
        }

        setResultado({
          sucesso: true,
          titulo: "Movimentação aceita",
          mensagem: `Movimentação aceita e executada com sucesso. O saldo saiu da origem e entrou no destino.${
            typeof data === "string" ? " Código: " + data : ""
          }`,
        });

        limparCamposAcao();
        await fetchMovimentacoes();
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao aceitar movimentação.";
        setSubmitError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      codigoLider,
      obsAprovacao,
      validarCodigoLider,
      limparCamposAcao,
      fetchMovimentacoes,
    ]
  );

  const handleCancelarMovimentacao = useCallback(
    async (movimentacaoId: string) => {
      if (!validarCodigoLider()) return;

      const confirmar = window.confirm(
        "Deseja cancelar esta movimentação? O saldo físico não será alterado."
      );

      if (!confirmar) return;

      setSubmitting(true);
      setSubmitError(null);
      setResultado(null);

      try {
        const supabase = getSupabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc(
          "cancelar_movimentacao",
          {
            p_movimentacao_id: movimentacaoId,
            p_lider_id: LIDER_TESTE_ID,
            p_codigo_lider: codigoLider.trim(),
            p_observacao_lider:
              obsAprovacao.trim() || "Movimentação cancelada pela aprovação.",
          }
        );

        if (rpcError) {
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResultado({
              sucesso: false,
              titulo: "Função bloqueada",
              mensagem:
                "Função de cancelamento bloqueada por segurança. É necessário liberar a RPC cancelar_movimentacao para teste ou chamar por backend seguro.",
            });
            return;
          }

          throw new Error(rpcError.message);
        }

        setResultado({
          sucesso: true,
          titulo: "Movimentação cancelada",
          mensagem: `Movimentação cancelada com sucesso. Nenhuma alteração de saldo foi feita.${
            typeof data === "string" ? " Código: " + data : ""
          }`,
        });

        limparCamposAcao();
        await fetchMovimentacoes();
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao cancelar movimentação.";
        setSubmitError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      codigoLider,
      obsAprovacao,
      validarCodigoLider,
      limparCamposAcao,
      fetchMovimentacoes,
    ]
  );

  const handleRejeitar = useCallback(
    async (movimentacaoId: string) => {
      if (!validarCodigoLider()) return;

      if (!motivoRejeicao.trim()) {
        setSubmitError("Digite o motivo da rejeição.");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);
      setResultado(null);

      try {
        const supabase = getSupabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc(
          "rejeitar_movimentacao",
          {
            p_movimentacao_id: movimentacaoId,
            p_lider_id: LIDER_TESTE_ID,
            p_codigo_lider: codigoLider.trim(),
            p_motivo_rejeicao: motivoRejeicao.trim(),
          }
        );

        if (rpcError) {
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResultado({
              sucesso: false,
              titulo: "Função bloqueada",
              mensagem:
                "Função de rejeição bloqueada por segurança. É necessário liberar a RPC rejeitar_movimentacao para teste ou chamar por backend seguro.",
            });
            return;
          }

          throw new Error(rpcError.message);
        }

        setResultado({
          sucesso: true,
          titulo: "Movimentação rejeitada",
          mensagem: `Movimentação rejeitada com sucesso. Nenhuma alteração de saldo foi feita; a quantidade deixou de ficar pendente.${
            typeof data === "string" ? " Código: " + data : ""
          }`,
        });

        limparCamposAcao();
        await fetchMovimentacoes();
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao rejeitar movimentação.";
        setSubmitError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      codigoLider,
      motivoRejeicao,
      validarCodigoLider,
      limparCamposAcao,
      fetchMovimentacoes,
    ]
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="secondary" className="text-[10px]">
            Pendente
          </Badge>
        );
      case "aprovada":
      case "executada":
        return (
          <Badge variant="default" className="text-[10px]">
            {status === "executada" ? "Executada" : "Aprovada"}
          </Badge>
        );
      case "rejeitada":
      case "reprovada":
        return (
          <Badge variant="destructive" className="text-[10px]">
            Rejeitada
          </Badge>
        );
      case "cancelada":
        return (
          <Badge variant="outline" className="text-[10px]">
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status ?? "—"}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aprovações</h1>
          <Skeleton className="mt-1 h-4 w-64" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aprovações</h1>
        </div>

        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>

            <h2 className="text-lg font-semibold">
              Erro ao carregar movimentações
            </h2>

            <p className="max-w-md font-mono text-xs text-muted-foreground">
              {error}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchMovimentacoes}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aprovações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aceite, cancelamento ou rejeição de movimentações por líder.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchMovimentacoes}
          aria-label="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {resultado && (
        <Card
          className={`shadow-none ${
            resultado.sucesso
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div
              className={`rounded-full p-3 ${
                resultado.sucesso
                  ? "bg-green-500/10"
                  : "bg-destructive/10"
              }`}
            >
              {resultado.sucesso ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>

            <h2 className="text-lg font-semibold">{resultado.titulo}</h2>

            <p className="max-w-md text-sm text-muted-foreground">
              {resultado.mensagem}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setResultado(null)}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Pendentes de aprovação ({pendentes.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação pendente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendentes.map((m) => (
                <div
                  key={m.id}
                  className={`space-y-3 rounded-md border p-4 ${
                    selectedId === m.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono font-bold">
                      {m.codigo_pallet ||
                        m.pallet_id?.slice(0, 8) ||
                        m.id?.slice(0, 8)}
                    </span>

                    {statusBadge(m.status)}

                    <span className="whitespace-nowrap text-muted-foreground">
                      {m.created_at
                        ? new Date(m.created_at).toLocaleString("pt-BR")
                        : "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Origem: </span>
                      <span className="font-mono">
                        {m.origem_codigo ||
                          m.local_origem_id?.slice(0, 8) ||
                          "—"}
                      </span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {m.origem_descricao}
                      </p>
                    </div>

                    <div>
                      <span className="text-muted-foreground">Destino: </span>
                      <span className="font-mono">
                        {m.destino_codigo ||
                          m.local_destino_id?.slice(0, 8) ||
                          "—"}
                      </span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {m.destino_descricao}
                      </p>
                    </div>

                    <div>
                      <span className="text-muted-foreground">Qtd: </span>
                      <span className="font-bold">
                        {formatarNumero(m.quantidade)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Solicitante:{" "}
                      </span>
                      <span>{m.responsavel_solicitacao ?? "—"}</span>
                    </div>
                  </div>

                  {m.motivo && (
                    <p className="text-xs italic text-muted-foreground">
                      Motivo da solicitação: {m.motivo}
                    </p>
                  )}

                  {selectedId === m.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p>
                          <strong>Aceitar:</strong> movimenta o saldo da origem
                          para o destino.
                        </p>
                        <p>
                          <strong>Cancelar:</strong> cancela a solicitação e não
                          mexe no saldo.
                        </p>
                        <p>
                          <strong>Rejeitar:</strong> rejeita a solicitação, exige
                          motivo e libera a quantidade pendente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            Líder
                          </Label>

                          <Input
                            value={liderNome}
                            onChange={(e) => setLiderNome(e.target.value)}
                            placeholder="Nome do líder"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1 text-xs">
                            <Key className="h-3 w-3" />
                            Código do líder *
                          </Label>

                          <Input
                            type="password"
                            value={codigoLider}
                            onChange={(e) => setCodigoLider(e.target.value)}
                            placeholder="Código"
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Observação para aceitar/cancelar
                        </Label>

                        <Input
                          value={obsAprovacao}
                          onChange={(e) => setObsAprovacao(e.target.value)}
                          placeholder="Opcional"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Motivo da rejeição</Label>

                        <Input
                          value={motivoRejeicao}
                          onChange={(e) => setMotivoRejeicao(e.target.value)}
                          placeholder="Obrigatório somente para rejeitar"
                          className="h-8 text-xs"
                        />
                      </div>

                      {submitError && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {submitError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAprovar(m.id)}
                          disabled={submitting}
                          className="gap-1"
                        >
                          {submitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Aceitar
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejeitar(m.id)}
                          disabled={submitting}
                          className="gap-1"
                        >
                          {submitting && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          Rejeitar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelarMovimentacao(m.id)}
                          disabled={submitting}
                        >
                          {submitting && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Cancelar
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={limparCamposAcao}
                          disabled={submitting}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedId(m.id);
                        setSubmitError(null);
                        setResultado(null);
                      }}
                    >
                      Abrir ações
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {processadas.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Processadas ({processadas.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {processadas.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs"
                >
                  <span className="font-mono font-bold">
                    {m.codigo_pallet || m.pallet_id?.slice(0, 8)}
                  </span>

                  {statusBadge(m.status)}

                  <span className="text-muted-foreground">
                    Qtd: {formatarNumero(m.quantidade)}
                  </span>

                  {m.origem_codigo && (
                    <span className="text-muted-foreground">
                      {m.origem_codigo} → {m.destino_codigo}
                    </span>
                  )}

                  {m.lider_nome && (
                    <span className="text-muted-foreground">
                      Líder: {m.lider_nome}
                    </span>
                  )}

                  {m.observacao_lider && (
                    <span className="text-muted-foreground">
                      Obs: {m.observacao_lider}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_app/aprovacoes")({
  component: AprovacoesPage,
});
