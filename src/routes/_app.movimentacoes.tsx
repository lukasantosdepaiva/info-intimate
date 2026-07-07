"use client";

import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { ArrowRightLeft, AlertCircle, Loader2, CheckCircle2, Package, Send, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PalletSearchDialog, type PalletSearchResult } from "@/components/pallet-search-dialog";

interface PalletResumoRow {
  pallet_id: string;
  codigo_pallet: string | null;
  status: string | null;
  quantidade_inicial: number | string | null;
  quantidade_atual: number | string | null;
  nf_entrada: string | null;
  cliente: string | null;
  fornecedor: string | null;
  codigo_referencia: string | null;
  numero_sd: string | null;
  locais_e_saldos: string | null;
}

interface SaldoLocal {
  local_id: string;
  local_codigo: string;
  saldo_fisico: number;
  saldo_pendente: number;
  saldo_disponivel: number;
}

interface LocalRow {
  id: string;
  codigo_local: string | null;
  armazem_codigo: string | null;
  armazem_nome: string | null;
  galpao: string | null;
  rua: string | null;
  processo: string | null;
  descricao: string | null;
}

interface SaldoPalletQueryRow {
  local_estoque_id: string;
  quantidade: number | string | null;
  locais_estoque:
    | {
        codigo_local?: string | null;
      }
    | {
        codigo_local?: string | null;
      }[]
    | null;
}

interface MovimentacaoPendenteRow {
  local_origem_id: string;
  quantidade: number | string | null;
}

const textoFiltro = (valor: unknown) => String(valor ?? "").toLowerCase();

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

const uniqueSorted = (valores: string[]) => {
  return Array.from(new Set(valores.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
};

const getCodigoLocal = (local: LocalRow) => {
  return textoExibicao(local.codigo_local);
};

const getArmazem = (local: LocalRow) => {
  const codigoLocal = textoExibicao(local.codigo_local, "");
  const armazemPeloCodigo = codigoLocal.includes("-") ? codigoLocal.split("-")[0] : "";

  return textoExibicao(local.armazem_codigo || armazemPeloCodigo, "SEM ARMAZÉM");
};

const getGalpao = (local: LocalRow) => {
  const codigoLocal = textoExibicao(local.codigo_local, "");
  const partes = codigoLocal.split("-");
  const galpaoPeloCodigo = partes.length >= 2 ? partes[1] : "";

  return textoExibicao(local.galpao || galpaoPeloCodigo, "GERAL");
};

const getRuaOuArea = (local: LocalRow) => {
  const codigoLocal = textoExibicao(local.codigo_local, "");
  const partes = codigoLocal.split("-");
  const ruaPeloCodigo = partes.length >= 3 ? partes.slice(2).join("-") : "";

  return textoExibicao(local.rua || ruaPeloCodigo || local.processo || local.descricao, "GERAL");
};

const formatarLocalCurto = (local: LocalRow) => {
  const codigo = textoExibicao(local.codigo_local);
  const armazem = textoExibicao(local.armazem_nome, "");
  const processo = textoExibicao(local.processo, "");
  const descricao = textoExibicao(local.descricao, "");

  const complemento = [armazem, processo || descricao].filter(Boolean).join(" / ");

  return complemento ? `${codigo} — ${complemento}` : codigo;
};

const localCombinaComBusca = (local: LocalRow, busca: string) => {
  const q = textoFiltro(busca).trim();

  if (!q) return true;

  return (
    textoFiltro(local.codigo_local).includes(q) ||
    textoFiltro(local.armazem_codigo).includes(q) ||
    textoFiltro(local.armazem_nome).includes(q) ||
    textoFiltro(local.galpao).includes(q) ||
    textoFiltro(local.rua).includes(q) ||
    textoFiltro(local.processo).includes(q) ||
    textoFiltro(local.descricao).includes(q)
  );
};

function MovimentacoesPage() {
  const [palletDialogOpen, setPalletDialogOpen] = useState(false);
  const [palletSelecionado, setPalletSelecionado] = useState<PalletSearchResult | null>(null);

  const [locais, setLocais] = useState<LocalRow[]>([]);
  const [locaisLoading, setLocaisLoading] = useState(true);

  const [locaisComSaldo, setLocaisComSaldo] = useState<SaldoLocal[]>([]);
  const [saldoLoading, setSaldoLoading] = useState(false);

  const [origemBusca, setOrigemBusca] = useState("");
  const [origemSelecionada, setOrigemSelecionada] = useState<LocalRow | null>(null);

  const [destinoArmazem, setDestinoArmazem] = useState("");
  const [destinoGalpao, setDestinoGalpao] = useState("");
  const [destinoBusca, setDestinoBusca] = useState("");
  const [destinoSelecionado, setDestinoSelecionado] = useState<LocalRow | null>(null);

  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarLocais = async () => {
      setLocaisLoading(true);

      try {
        const supabase = getSupabase();

        const { data, error: dbError } = await supabase.from("locais_estoque").select("*").order("codigo_local");

        if (dbError) throw new Error(dbError.message);

        setLocais((data ?? []) as LocalRow[]);
      } catch {
        setLocais([]);
      } finally {
        setLocaisLoading(false);
      }
    };

    carregarLocais();
  }, []);


  const selecionarPallet = useCallback(async (p: PalletSearchResult) => {
    setPalletSelecionado(p);
    setPalletDialogOpen(false);

    setOrigemSelecionada(null);
    setOrigemBusca("");

    setDestinoSelecionado(null);
    setDestinoArmazem("");
    setDestinoGalpao("");
    setDestinoBusca("");

    setQuantidade("");
    setResultado(null);
    setError(null);

    setSaldoLoading(true);
    setLocaisComSaldo([]);

    try {
      const supabase = getSupabase();

      const { data: saldosData, error: saldosError } = await supabase
        .from("saldos_pallet")
        .select("local_estoque_id, quantidade, locais_estoque!inner(codigo_local)")
        .eq("pallet_id", p.pallet_id)
        .gt("quantidade", 0);

      if (saldosError) throw new Error(saldosError.message);

      const { data: pendentesData, error: pendentesError } = await supabase
        .from("movimentacoes")
        .select("local_origem_id, quantidade")
        .eq("pallet_id", p.pallet_id)
        .eq("status", "pendente");

      if (pendentesError) throw new Error(pendentesError.message);

      const pendentesPorLocal = new Map<string, number>();

      ((pendentesData ?? []) as MovimentacaoPendenteRow[]).forEach((m) => {
        const atual = pendentesPorLocal.get(m.local_origem_id) ?? 0;
        pendentesPorLocal.set(m.local_origem_id, atual + numeroSeguro(m.quantidade));
      });

      const saldos: SaldoLocal[] = ((saldosData ?? []) as unknown as SaldoPalletQueryRow[])
        .map((s) => {
          const localJoin = Array.isArray(s.locais_estoque) ? s.locais_estoque[0] : s.locais_estoque;

          const saldoFisico = numeroSeguro(s.quantidade);
          const saldoPendente = pendentesPorLocal.get(s.local_estoque_id) ?? 0;
          const saldoDisponivel = Math.max(saldoFisico - saldoPendente, 0);

          return {
            local_id: s.local_estoque_id,
            local_codigo: textoExibicao(localJoin?.codigo_local, ""),
            saldo_fisico: saldoFisico,
            saldo_pendente: saldoPendente,
            saldo_disponivel: saldoDisponivel,
          };
        })
        .filter((s) => s.local_id && s.saldo_fisico > 0);

      setLocaisComSaldo(saldos);
    } catch {
      setLocaisComSaldo([]);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  const origensFiltradas = useMemo(() => {
    if (!palletSelecionado) return [];

    const saldoIds = new Set(locaisComSaldo.map((s) => s.local_id));

    return locais
      .filter((l) => saldoIds.has(l.id))
      .filter((l) => localCombinaComBusca(l, origemBusca))
      .sort((a, b) =>
        textoExibicao(a.codigo_local).localeCompare(textoExibicao(b.codigo_local), "pt-BR", { numeric: true }),
      );
  }, [locais, locaisComSaldo, origemBusca, palletSelecionado]);

  const saldoOrigemSelecionada = useMemo(() => {
    if (!origemSelecionada) return null;
    return locaisComSaldo.find((s) => s.local_id === origemSelecionada.id) ?? null;
  }, [origemSelecionada, locaisComSaldo]);

  const saldoDisponivel = useMemo(() => {
    return saldoOrigemSelecionada?.saldo_disponivel ?? 0;
  }, [saldoOrigemSelecionada]);

  const locaisDestinoBase = useMemo(() => {
    return origemSelecionada ? locais.filter((l) => l.id !== origemSelecionada.id) : locais;
  }, [locais, origemSelecionada]);

  const armazensDestino = useMemo(() => {
    return uniqueSorted(locaisDestinoBase.map((l) => getArmazem(l)));
  }, [locaisDestinoBase]);

  const locaisDoArmazemSelecionado = useMemo(() => {
    if (!destinoArmazem) return [];
    return locaisDestinoBase.filter((l) => getArmazem(l) === destinoArmazem);
  }, [locaisDestinoBase, destinoArmazem]);

  const galpoesDestino = useMemo(() => {
    return uniqueSorted(locaisDoArmazemSelecionado.map((l) => getGalpao(l)));
  }, [locaisDoArmazemSelecionado]);

  const locaisDoGalpaoSelecionado = useMemo(() => {
    if (!destinoGalpao) return [];

    return locaisDoArmazemSelecionado
      .filter((l) => getGalpao(l) === destinoGalpao)
      .filter((l) => localCombinaComBusca(l, destinoBusca))
      .sort((a, b) =>
        textoExibicao(a.codigo_local).localeCompare(textoExibicao(b.codigo_local), "pt-BR", { numeric: true }),
      );
  }, [locaisDoArmazemSelecionado, destinoGalpao, destinoBusca]);

  const selecionarDestinoArmazem = (armazem: string) => {
    setDestinoArmazem(armazem);
    setDestinoGalpao("");
    setDestinoSelecionado(null);
    setDestinoBusca("");
  };

  const selecionarDestinoGalpao = (galpao: string) => {
    setDestinoGalpao(galpao);
    setDestinoSelecionado(null);
    setDestinoBusca("");
  };

  const trocarDestino = () => {
    setDestinoArmazem("");
    setDestinoGalpao("");
    setDestinoSelecionado(null);
    setDestinoBusca("");
  };

  const errosValidacao = useMemo(() => {
    const e: string[] = [];

    if (!palletSelecionado) e.push("Selecione um pallet.");
    if (!origemSelecionada) e.push("Selecione o local de origem.");
    if (!destinoSelecionado) e.push("Selecione o local de destino.");

    if (origemSelecionada && destinoSelecionado && origemSelecionada.id === destinoSelecionado.id) {
      e.push("Origem e destino não podem ser iguais.");
    }

    const qtd = Number(quantidade);

    if (!quantidade || Number.isNaN(qtd) || qtd <= 0) {
      e.push("Quantidade deve ser maior que zero.");
    }

    if (origemSelecionada && saldoDisponivel <= 0) {
      e.push("A origem selecionada não possui saldo disponível para nova movimentação.");
    }

    if (origemSelecionada && qtd > saldoDisponivel) {
      e.push(`Quantidade (${formatarNumero(qtd)}) maior que o saldo disponível (${formatarNumero(saldoDisponivel)}).`);
    }

    if (!responsavel.trim()) e.push("Responsável é obrigatório.");

    return e;
  }, [palletSelecionado, origemSelecionada, destinoSelecionado, quantidade, saldoDisponivel, responsavel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (errosValidacao.length > 0) return;

      setSubmitting(true);
      setError(null);
      setResultado(null);

      try {
        const supabase = getSupabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc("solicitar_movimentacao", {
          p_pallet_id: palletSelecionado!.pallet_id,
          p_local_origem_id: origemSelecionada!.id,
          p_local_destino_id: destinoSelecionado!.id,
          p_quantidade: Number(quantidade),
          p_responsavel_solicitacao: responsavel.trim(),
          p_motivo: observacao.trim() || null,
        });

        if (rpcError) {
          if (rpcError.message?.includes("permission") || rpcError.code === "42501" || rpcError.code === "PGRST301") {
            setResultado({
              sucesso: false,
              mensagem:
                "Função de movimentação bloqueada por segurança. É necessário liberar a RPC solicitar_movimentacao para teste ou chamar por backend seguro.",
            });
            return;
          }

          throw new Error(rpcError.message);
        }

        const movId = data as unknown as string;

        setResultado({
          sucesso: true,
          mensagem: `Movimentação solicitada com sucesso. Aguarde aprovação do líder.${
            movId ? " Código: " + movId : ""
          }`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao solicitar movimentação.";
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [errosValidacao, palletSelecionado, origemSelecionada, destinoSelecionado, quantidade, responsavel, observacao],
  );

  const limparFormulario = () => {
    setPalletSelecionado(null);
    setLocaisComSaldo([]);

    setOrigemSelecionada(null);
    setOrigemBusca("");

    setDestinoSelecionado(null);
    setDestinoArmazem("");
    setDestinoGalpao("");
    setDestinoBusca("");

    setQuantidade("");
    setResponsavel("");
    setObservacao("");

    setResultado(null);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimentações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicitar movimentação interna de pallet entre locais de estoque.
        </p>
      </div>

      {resultado && (
        <Card
          className={`shadow-none ${
            resultado.sucesso ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className={`rounded-full p-3 ${resultado.sucesso ? "bg-green-500/10" : "bg-destructive/10"}`}>
              {resultado.sucesso ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>

            <h2 className="text-lg font-semibold">{resultado.sucesso ? "Solicitação enviada" : "Função bloqueada"}</h2>

            <p className="max-w-md text-sm text-muted-foreground">{resultado.mensagem}</p>

            {resultado.sucesso && (
              <Button variant="outline" size="sm" onClick={limparFormulario}>
                Nova movimentação
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>

            <h2 className="text-lg font-semibold">Erro ao solicitar</h2>

            <p className="max-w-md font-mono text-xs text-muted-foreground">{error}</p>

            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!resultado && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-muted-foreground" />
                Buscar Pallet
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={palletBusca}
                  onChange={(e) => setPalletBusca(e.target.value)}
                  placeholder="Digite o código do pallet..."
                  className="pl-10 font-mono text-xs"
                />

                {palletBuscaLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {palletResultados.length > 0 && !palletSelecionado && (
                <div className="max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
                  {palletResultados.map((p) => (
                    <button
                      key={p.pallet_id}
                      type="button"
                      onClick={() => selecionarPallet(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <span className="font-mono font-semibold">{textoExibicao(p.codigo_pallet)}</span>

                      <span className="text-xs text-muted-foreground">Qtd: {formatarNumero(p.quantidade_atual)}</span>
                    </button>
                  ))}
                </div>
              )}

              {palletBusca.trim().length >= 2 &&
                !palletBuscaLoading &&
                palletResultados.length === 0 &&
                !palletSelecionado && <p className="text-xs text-destructive">Nenhum pallet encontrado.</p>}

              {palletSelecionado && (
                <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Pallet selecionado:
                    <span className="font-mono font-bold">{textoExibicao(palletSelecionado.codigo_pallet)}</span>
                  </p>

                  <p>
                    NF: {textoExibicao(palletSelecionado.nf_entrada)} | Ref:{" "}
                    {textoExibicao(palletSelecionado.codigo_referencia)} | SD:{" "}
                    {textoExibicao(palletSelecionado.numero_sd)}
                  </p>

                  <p>Quantidade total: {formatarNumero(palletSelecionado.quantidade_atual)}</p>

                  <p>
                    Status:{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {textoExibicao(palletSelecionado.status)}
                    </Badge>
                    {textoExibicao(palletSelecionado.cliente, "") && (
                      <span className="ml-2">Cliente: {textoExibicao(palletSelecionado.cliente)}</span>
                    )}
                    {textoExibicao(palletSelecionado.fornecedor, "") && (
                      <span className="ml-2">Fornecedor: {textoExibicao(palletSelecionado.fornecedor)}</span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {palletSelecionado && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  Origem e Destino
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Local de origem * / locais com saldo</Label>

                  {saldoLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <Input
                        value={origemBusca}
                        onChange={(e) => setOrigemBusca(e.target.value)}
                        placeholder="Filtrar origem, se necessário..."
                        className="text-xs"
                      />

                      <div className="max-h-56 overflow-y-auto rounded-md border">
                        {origensFiltradas.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum local com saldo disponível.</p>
                        ) : (
                          origensFiltradas.map((l) => {
                            const saldo = locaisComSaldo.find((s) => s.local_id === l.id);
                            const selected = origemSelecionada?.id === l.id;
                            const semDisponivel = (saldo?.saldo_disponivel ?? 0) <= 0;

                            return (
                              <button
                                key={l.id}
                                type="button"
                                disabled={semDisponivel}
                                onClick={() => {
                                  setOrigemSelecionada(l);

                                  if (destinoSelecionado?.id === l.id) {
                                    setDestinoSelecionado(null);
                                  }
                                }}
                                className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                                  selected ? "border-primary bg-primary/10" : "border-transparent"
                                }`}
                              >
                                <span className="w-28 shrink-0 font-mono font-semibold">{getCodigoLocal(l)}</span>

                                <span className="min-w-0 flex-1 truncate">{formatarLocalCurto(l)}</span>

                                <span className="shrink-0 text-right text-[10px] text-muted-foreground">
                                  <span className="block">
                                    Físico: <strong>{formatarNumero(saldo?.saldo_fisico)}</strong>
                                  </span>

                                  <span className="block">
                                    Pendente: <strong>{formatarNumero(saldo?.saldo_pendente)}</strong>
                                  </span>

                                  <span className="block text-green-600">
                                    Disp.: <strong>{formatarNumero(saldo?.saldo_disponivel)}</strong>
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {origemSelecionada && (
                    <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-xs">
                      <p className="flex items-center gap-1 font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Origem selecionada: {formatarLocalCurto(origemSelecionada)}
                      </p>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-muted-foreground">Físico</span>
                          <p className="font-bold">{formatarNumero(saldoOrigemSelecionada?.saldo_fisico)}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Pendente</span>
                          <p className="font-bold">{formatarNumero(saldoOrigemSelecionada?.saldo_pendente)}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Disponível</span>
                          <p className="font-bold text-green-600">
                            {formatarNumero(saldoOrigemSelecionada?.saldo_disponivel)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Local de destino *</Label>

                  {locaisLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">1. Escolha o armazém</p>

                        <div className="flex flex-wrap gap-2">
                          {armazensDestino.map((armazem) => (
                            <Button
                              key={armazem}
                              type="button"
                              size="sm"
                              variant={destinoArmazem === armazem ? "default" : "outline"}
                              onClick={() => selecionarDestinoArmazem(armazem)}
                            >
                              {armazem}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {destinoArmazem && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            2. Escolha o galpão do armazém {destinoArmazem}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {galpoesDestino.map((galpao) => (
                              <Button
                                key={galpao}
                                type="button"
                                size="sm"
                                variant={destinoGalpao === galpao ? "default" : "outline"}
                                onClick={() => selecionarDestinoGalpao(galpao)}
                              >
                                {galpao}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {destinoArmazem && destinoGalpao && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">3. Escolha a rua ou área</p>

                          <Input
                            value={destinoBusca}
                            onChange={(e) => setDestinoBusca(e.target.value)}
                            placeholder="Filtrar rua/área dentro do galpão..."
                            className="text-xs"
                          />

                          <div className="max-h-56 overflow-y-auto rounded-md border">
                            {locaisDoGalpaoSelecionado.length === 0 ? (
                              <p className="px-3 py-3 text-xs text-muted-foreground">
                                Nenhum local disponível neste galpão.
                              </p>
                            ) : (
                              locaisDoGalpaoSelecionado.map((l) => {
                                const selected = destinoSelecionado?.id === l.id;

                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setDestinoSelecionado(l)}
                                    className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                                      selected ? "border-primary bg-primary/10" : "border-transparent"
                                    }`}
                                  >
                                    <span className="w-28 shrink-0 font-mono font-semibold">{getCodigoLocal(l)}</span>

                                    <span className="min-w-0 flex-1 truncate">{formatarLocalCurto(l)}</span>

                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {getRuaOuArea(l)}
                                    </Badge>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {destinoSelecionado && (
                        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-xs">
                          <p className="flex items-center gap-1 font-medium text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Destino selecionado: {formatarLocalCurto(destinoSelecionado)}
                          </p>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-xs"
                            onClick={trocarDestino}
                          >
                            Trocar destino
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quantidade">Quantidade *</Label>

                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    max={saldoDisponivel || undefined}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder={`Máximo disponível: ${formatarNumero(saldoDisponivel)}`}
                  />

                  {origemSelecionada && (
                    <p className="text-xs text-muted-foreground">
                      Saldo disponível na origem: <strong>{formatarNumero(saldoDisponivel)}</strong>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {palletSelecionado && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Finalização</CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="responsavel">Responsável *</Label>

                  <Input
                    id="responsavel"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome do operador"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="observacao">Motivo / Observação</Label>

                  <Input
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {errosValidacao.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
              <ul className="space-y-1 text-xs text-destructive">
                {errosValidacao.map((err, i) => (
                  <li key={err + i} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {palletSelecionado && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || errosValidacao.length > 0} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Solicitar movimentação
                  </>
                )}
              </Button>

              <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={limparFormulario}>
                Limpar
              </Button>
            </div>
          )}
        </form>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_app/movimentacoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    pallet: typeof search.pallet === "string" ? search.pallet : undefined,
  }),
  component: MovimentacoesPage,
});
