import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { Package, AlertCircle, Search, Loader2, CheckCircle2, Truck, QrCode, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { OpResumo } from "@/lib/types";

interface Saldo05 {
  local_estoque_id: string;
  codigo_local: string;
  quantidade: number;
}

interface PalletRow {
  id: string;
  codigo_pallet: string;
  referencia_codigo: string;
  sd_numero: string | null;
  nf_entrada_numero: string | null;
  quantidade_total: number;
  saldo_armazem_05: number;
  local_origem_id: string | null;
  local_origem_codigo: string | null;
  status: string | null;
  locais_e_saldos: string | null;
  saldos_05: Saldo05[];
}

interface PalletViewRow {
  id?: string;
  pallet_id?: string;
  codigo_pallet?: string;
  referencia_codigo?: string;
  codigo_referencia?: string;
  sd_numero?: string | null;
  numero_sd?: string | null;
  nf_entrada_numero?: string | null;
  nf_entrada?: string | null;
  quantidade?: number | string | null;
  quantidade_atual?: number | string | null;
  quantidade_inicial?: number | string | null;
  status?: string | null;
  locais_e_saldos?: string | null;
}

interface SaldoPalletJoinRow {
  local_estoque_id: string;
  quantidade: number | string | null;
  locais_estoque:
    | {
        id?: string;
        codigo_local?: string | null;
        armazem_codigo?: string | null;
        armazem_nome?: string | null;
      }
    | {
        id?: string;
        codigo_local?: string | null;
        armazem_codigo?: string | null;
        armazem_nome?: string | null;
      }[]
    | null;
}


interface OpDbRow {
  id: string;
  numero_op: string;
  produto_final: string | null;
  referencia_id?: string | null;
  status_op: string | null;
}

const LIDER_TESTE_ID = "6c19eceb-ced3-4b7d-9bb7-5903764177f1";

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const formatarNumero = (valor: unknown) => {
  return numeroSeguro(valor).toLocaleString("pt-BR");
};

const textoSeguro = (valor: unknown, fallback = "—") => {
  const texto = String(valor ?? "").trim();
  return texto || fallback;
};

const statusColor = (s?: string | null) => {
  switch (s) {
    case "aprovado":
    case "produto_acabado":
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

function SaidaArmazem05Page() {
  const [palletBusca, setPalletBusca] = useState("");
  const [palletLoading, setPalletLoading] = useState(false);
  const [pallet, setPallet] = useState<PalletRow | null>(null);
  const [palletNotFound, setPalletNotFound] = useState(false);

  const [opBusca, setOpBusca] = useState("");
  const [opLoading, setOpLoading] = useState(false);
  const [op, setOp] = useState<OpResumo | null>(null);
  const [opNotFound, setOpNotFound] = useState(false);

  const [nfSaida, setNfSaida] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [liberadoPor, setLiberadoPor] = useState("");
  const [lider, setLider] = useState("Líder Teste");
  const [liderId, setLiderId] = useState<string | null>(LIDER_TESTE_ID);
  const [liderNotFound, setLiderNotFound] = useState(false);
  const [codigoLider, setCodigoLider] = useState("");
  const [localOrigem, setLocalOrigem] = useState<string | null>(null);
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  // Vínculo com caminhão (opcional)
  const [controleVeiculoId, setControleVeiculoId] = useState<string>("");
  const [controlesVeiculo, setControlesVeiculo] = useState<
    Array<{
      id: string;
      placa: string | null;
      motorista: string | null;
      created_at: string | null;
      tipo_veiculo: string | null;
    }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [resposta, setResposta] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data } = await sb
          .from("controle_veiculos")
          .select("id, created_at, veiculos(placa, motorista, tipo_veiculo)")
          .order("created_at", { ascending: false })
          .limit(30);
        const rows = (data ?? []).map(
          (c: {
            id: string;
            placa: string | null;
            motorista: string | null;
            created_at: string | null;
            veiculos:
              | { placa: string | null; motorista: string | null; tipo_veiculo: string | null }
              | { placa: string | null; motorista: string | null; tipo_veiculo: string | null }[]
              | null;
          }) => {
            const v = Array.isArray(c.veiculos) ? c.veiculos[0] : c.veiculos;
            return {
              id: c.id,
              placa: v?.placa ?? null,
              motorista: v?.motorista ?? null,
              created_at: c.created_at,
              tipo_veiculo: v?.tipo_veiculo ?? null,
            };
          },
        );
        setControlesVeiculo(rows);
      } catch {
        setControlesVeiculo([]);
      }
    };
    carregar();
  }, []);

  const buscarPallet = useCallback(async (codigo: string) => {
    const termo = codigo.trim();

    if (!termo) {
      setPallet(null);
      setPalletNotFound(false);
      setLocalOrigem(null);
      return;
    }

    setPalletLoading(true);
    setPallet(null);
    setPalletNotFound(false);
    setLocalOrigem(null);
    setResposta(null);
    setError(null);

    try {
      const supabase = getSupabase();

      const { data, error: dbError } = await supabase
        .from("vw_pallet_resumo")
        .select("*")
        .ilike("codigo_pallet", `%${termo}%`)
        .limit(1);

      if (dbError) throw new Error(dbError.message);

      if (!data || data.length === 0) {
        setPalletNotFound(true);
        return;
      }

      const row = data[0] as PalletViewRow;
      const palletId = row.pallet_id ?? row.id;

      if (!palletId) {
        throw new Error("Pallet encontrado, mas sem ID válido.");
      }

      const { data: saldosData, error: saldosError } = await supabase
        .from("saldos_pallet")
        .select("local_estoque_id, quantidade, locais_estoque!inner(id, codigo_local, armazem_codigo, armazem_nome)")
        .eq("pallet_id", palletId)
        .gt("quantidade", 0);

      if (saldosError) throw new Error(saldosError.message);

      const saldos = ((saldosData ?? []) as unknown as SaldoPalletJoinRow[]).map((saldo) => {
        const local = Array.isArray(saldo.locais_estoque) ? saldo.locais_estoque[0] : saldo.locais_estoque;

        return {
          local_estoque_id: saldo.local_estoque_id,
          quantidade: numeroSeguro(saldo.quantidade),
          local,
        };
      });

      const saldos05 = saldos.filter((saldo) => {
        const armazemCodigo = String(saldo.local?.armazem_codigo ?? "").trim();
        const codigoLocal = String(saldo.local?.codigo_local ?? "").trim();

        return armazemCodigo === "05" || codigoLocal.startsWith("05-");
      });

      const saldoArmazem05 = saldos05.reduce((total, saldo) => total + saldo.quantidade, 0);

      const primeiroLocal05 = saldos05[0] ?? null;

      const palletNormalizado: PalletRow = {
        id: palletId,
        codigo_pallet: textoSeguro(row.codigo_pallet, "—"),
        referencia_codigo: textoSeguro(row.referencia_codigo ?? row.codigo_referencia, "—"),
        sd_numero: row.sd_numero ?? row.numero_sd ?? null,
        nf_entrada_numero: row.nf_entrada_numero ?? row.nf_entrada ?? null,
        quantidade_total: numeroSeguro(row.quantidade_atual ?? row.quantidade ?? row.quantidade_inicial),
        saldo_armazem_05: saldoArmazem05,
        local_origem_id: primeiroLocal05?.local_estoque_id ?? null,
        local_origem_codigo: primeiroLocal05?.local?.codigo_local ?? null,
        status: row.status ?? null,
        locais_e_saldos: row.locais_e_saldos ?? null,
        saldos_05: saldos05
          .filter((s) => s.local?.codigo_local)
          .map((s) => ({
            local_estoque_id: s.local_estoque_id,
            codigo_local: String(s.local?.codigo_local ?? ""),
            quantidade: s.quantidade,
          })),
      };

      setPallet(palletNormalizado);
      setLocalOrigem(palletNormalizado.local_origem_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar pallet.");
    } finally {
      setPalletLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (palletBusca.trim().length >= 3) buscarPallet(palletBusca);
    }, 300);

    return () => clearTimeout(t);
  }, [palletBusca, buscarPallet]);

  const { pallet: palletFromUrl } = Route.useSearch();
  useEffect(() => {
    if (palletFromUrl && !pallet) {
      setPalletBusca(palletFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palletFromUrl]);

  const buscarOp = useCallback(async (numero: string) => {
    const termo = numero.trim();

    if (!termo) {
      setOp(null);
      setOpNotFound(false);
      return;
    }

    setOpLoading(true);
    setOp(null);
    setOpNotFound(false);
    setError(null);

    try {
      const supabase = getSupabase();

      const { data, error: dbError } = await supabase
        .from("ops_pcp")
        .select("id, numero_op, produto_final, referencia_id, status_op")
        .ilike("numero_op", `%${termo}%`)
        .limit(1);

      if (dbError) throw new Error(dbError.message);

      if (!data || data.length === 0) {
        setOpNotFound(true);
        return;
      }

      const row = data[0] as OpDbRow;

      if (row.status_op === "cancelada") {
        setOpNotFound(true);
        toast.error("OP cancelada. Não é possível realizar saída com esta OP.");
        return;
      }

      setOp({
        id: row.id,
        numero_op: row.numero_op,
        produto_final: row.produto_final,
        referencia_codigo: row.referencia_id ?? "",
        status_op: row.status_op ?? "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar OP.");
    } finally {
      setOpLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (opBusca.trim().length >= 2) buscarOp(opBusca);
    }, 300);

    return () => clearTimeout(t);
  }, [opBusca, buscarOp]);

  useEffect(() => {
    const nomeLider = lider.trim();

    if (!nomeLider || nomeLider.length < 3) {
      setLiderId(null);
      setLiderNotFound(false);
      return;
    }

    if (nomeLider.toLowerCase() === "líder teste" || nomeLider.toLowerCase() === "lider teste") {
      setLiderId(LIDER_TESTE_ID);
      setLiderNotFound(false);
      return;
    }

    const buscarLider = async () => {
      try {
        const supabase = getSupabase();

        const { data, error: dbError } = await supabase
          .from("lideres")
          .select("id")
          .ilike("nome", `%${nomeLider}%`)
          .eq("ativo", true)
          .limit(1);

        if (dbError) throw new Error(dbError.message);

        if (!data || data.length === 0) {
          setLiderId(null);
          setLiderNotFound(true);
          return;
        }

        setLiderId((data[0] as { id: string }).id);
        setLiderNotFound(false);
      } catch {
        setLiderId(null);
        setLiderNotFound(true);
      }
    };

    const t = setTimeout(buscarLider, 300);
    return () => clearTimeout(t);
  }, [lider]);

  const localOrigemParaUso = useMemo(() => {
    return localOrigem ?? pallet?.local_origem_id ?? null;
  }, [localOrigem, pallet]);

  const temSaldoNoArmazem05 = useMemo(() => {
    return Boolean(pallet && pallet.saldo_armazem_05 > 0 && localOrigemParaUso);
  }, [pallet, localOrigemParaUso]);

  const errosValidacao = useMemo(() => {
    const erros: string[] = [];

    if (!pallet) erros.push("Busque e selecione um pallet.");
    if (!op) erros.push("Busque e selecione uma OP.");

    if (pallet && !temSaldoNoArmazem05) {
      erros.push(
        "Saída permitida somente pelo armazém 05 — Produto Acabado. O pallet não tem saldo em nenhum local do armazém 05.",
      );
    }

    const qtd = Number(quantidade);

    if (!quantidade || Number.isNaN(qtd) || qtd <= 0) {
      erros.push("Quantidade deve ser maior que zero.");
    }

    if (pallet && qtd > pallet.saldo_armazem_05) {
      erros.push(
        `Quantidade (${formatarNumero(qtd)}) maior que o saldo disponível no Armazém 05 (${formatarNumero(
          pallet.saldo_armazem_05,
        )}).`,
      );
    }

    if (!liberadoPor.trim()) erros.push("Liberado por é obrigatório.");
    if (!lider.trim()) erros.push("Líder do setor é obrigatório.");

    if (lider.trim().length >= 3 && !liderId) {
      erros.push("Líder do setor não encontrado ou ainda não carregado.");
    }

    if (!codigoLider.trim()) erros.push("Código do líder é obrigatório.");
    if (!responsavel.trim()) erros.push("Responsável pela baixa é obrigatório.");

    if (!localOrigemParaUso && pallet) {
      erros.push("Local de origem do Armazém 05 não encontrado.");
    }

    return erros;
  }, [
    pallet,
    op,
    temSaldoNoArmazem05,
    quantidade,
    liberadoPor,
    lider,
    liderId,
    codigoLider,
    responsavel,
    localOrigemParaUso,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (errosValidacao.length > 0) return;

      setSubmitting(true);
      setError(null);
      setResposta(null);

      try {
        const supabase = getSupabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc("registrar_saida_armazem_05", {
          p_pallet_id: pallet!.id,
          p_numero_op: op!.numero_op,
          p_local_origem_id: localOrigemParaUso,
          p_quantidade: Number(quantidade),
          p_nf_saida_numero: nfSaida.trim() || null,
          p_liberado_por: liberadoPor.trim(),
          p_lider_id: liderId,
          p_codigo_lider: codigoLider.trim(),
          p_responsavel_baixa: responsavel.trim(),
          p_observacao: observacao.trim() || null,
        });

        if (rpcError) {
          if (rpcError.message?.includes("permission") || rpcError.code === "42501" || rpcError.code === "PGRST301") {
            setResposta({
              sucesso: false,
              mensagem:
                "Função de saída bloqueada por segurança. É necessário liberar a RPC registrar_saida_armazem_05 para teste ou chamar por backend seguro.",
            });
            return;
          }

          if (rpcError.code === "P0001") {
            setResposta({ sucesso: false, mensagem: rpcError.message });
            return;
          }

          throw new Error(rpcError.message);
        }

        let mensagemExtra = "";
        // Vincula ao caminhão se selecionado
        if (controleVeiculoId && pallet) {
          try {
            // Tenta extrair saida_id do retorno (string uuid) ou null
            const saidaId = typeof data === "string" ? data : null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: cargaErr } = await (supabase as any).rpc("registrar_carga_veiculo", {
              p_controle_veiculo_id: controleVeiculoId,
              p_pallet_id: pallet.id,
              p_quantidade: Number(quantidade),
              p_responsavel: responsavel.trim(),
              p_saida_id: saidaId,
              p_op_id: op?.id ?? null,
              p_local_origem_id: localOrigemParaUso,
              p_nf_saida_numero: nfSaida.trim() || null,
              p_observacao: observacao.trim() || null,
            });
            if (cargaErr) {
              mensagemExtra = ` (Aviso: falha ao vincular ao caminhão — ${cargaErr.message})`;
            } else {
              mensagemExtra = " Vinculada ao caminhão selecionado.";
            }
          } catch (e: unknown) {
            const m = e instanceof Error ? e.message : "erro desconhecido";
            mensagemExtra = ` (Aviso: falha ao vincular ao caminhão — ${m})`;
          }
        }

        setResposta({
          sucesso: true,
          mensagem: `Saída registrada com sucesso.${
            typeof data === "string" ? " Código: " + data : ""
          }${mensagemExtra}`,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao registrar saída.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      errosValidacao,
      pallet,
      op,
      localOrigemParaUso,
      quantidade,
      nfSaida,
      liberadoPor,
      liderId,
      codigoLider,
      responsavel,
      observacao,
      controleVeiculoId,
    ],
  );

  const limparFormulario = () => {
    setPalletBusca("");
    setPallet(null);
    setPalletNotFound(false);

    setOpBusca("");
    setOp(null);
    setOpNotFound(false);

    setNfSaida("");
    setQuantidade("");
    setLiberadoPor("");

    setLider("Líder Teste");
    setLiderId(LIDER_TESTE_ID);
    setLiderNotFound(false);

    setCodigoLider("");
    setLocalOrigem(null);
    setResponsavel("");
    setObservacao("");
    setControleVeiculoId("");

    setResposta(null);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saída — Armazém 05</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de saída/baixa de produto acabado. Exclusivo para o armazém 05.
        </p>
      </div>

      {resposta && (
        <Card
          className={`shadow-none ${
            resposta.sucesso ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className={`rounded-full p-3 ${resposta.sucesso ? "bg-green-500/10" : "bg-destructive/10"}`}>
              {resposta.sucesso ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>

            <h2 className="text-lg font-semibold">
              {resposta.sucesso ? "Saída registrada" : "Operação não concluída"}
            </h2>

            <p className="max-w-md text-sm text-muted-foreground">{resposta.mensagem}</p>

            {resposta.sucesso && (
              <Button variant="outline" size="sm" onClick={limparFormulario}>
                Nova saída
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

            <h2 className="text-lg font-semibold">Erro ao registrar</h2>

            <p className="max-w-md font-mono text-xs text-muted-foreground">{error}</p>

            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!resposta && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-muted-foreground" />
                Buscar Pallet
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative">
                <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={palletBusca}
                  onChange={(e) => setPalletBusca(e.target.value)}
                  placeholder="Digite o código do pallet (ex: PLT-000002)..."
                  className="pl-10 font-mono text-xs"
                />

                {palletLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {palletNotFound && <p className="text-xs text-destructive">Pallet não encontrado.</p>}

              {pallet && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    {pallet.codigo_pallet}

                    <Badge variant="outline" className={`text-[10px] ${statusColor(pallet.status)}`}>
                      {textoSeguro(pallet.status)}
                    </Badge>
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Referência:</span>
                    <span className="font-mono">{textoSeguro(pallet.referencia_codigo)}</span>

                    <span className="text-muted-foreground">SD:</span>
                    <span className="font-mono">{textoSeguro(pallet.sd_numero)}</span>

                    <span className="text-muted-foreground">NF Entrada:</span>
                    <span className="font-mono">{textoSeguro(pallet.nf_entrada_numero)}</span>

                    <span className="text-muted-foreground">Qtd. Total:</span>
                    <span className="font-bold">{formatarNumero(pallet.quantidade_total)}</span>

                    <span className="text-muted-foreground">Saldo Armazém 05:</span>
                    <span className="font-bold text-green-600">{formatarNumero(pallet.saldo_armazem_05)}</span>

                    <span className="text-muted-foreground">Local 05:</span>
                    <span className="font-mono text-[10px]">{textoSeguro(pallet.local_origem_codigo)}</span>

                    <span className="text-muted-foreground">Locais:</span>
                    <span className="font-mono text-[10px]">{textoSeguro(pallet.locais_e_saldos)}</span>
                  </div>

                  {!temSaldoNoArmazem05 && (
                    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Saída permitida somente pelo armazém 05 — Produto Acabado. O pallet não tem saldo em local 05.
                    </p>
                  )}

                  {temSaldoNoArmazem05 && (
                    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Locais com saldo deste pallet (Armazém 05)</p>
                      <div className="flex flex-wrap gap-2">
                        {pallet.saldos_05.map((s) => {
                          const active = localOrigem === s.local_estoque_id;
                          return (
                            <button
                              key={s.local_estoque_id}
                              type="button"
                              onClick={() => setLocalOrigem(s.local_estoque_id)}
                              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-primary/40 bg-background hover:bg-primary/10"
                              }`}
                            >
                              {s.codigo_local}
                              <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">
                                {formatarNumero(s.quantidade)}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                Ordem de Produção (OP)
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={opBusca}
                  onChange={(e) => setOpBusca(e.target.value)}
                  placeholder="Digite o número da OP..."
                  className="pl-10 font-mono text-xs"
                />

                {opLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {opNotFound && (
                <p className="text-xs text-destructive">
                  OP não encontrada. A OP deve ser criada pela PCP antes da logística utilizar.
                </p>
              )}

              {op && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <QrCode className="h-4 w-4" />
                    {op.numero_op}

                    <Badge variant="outline" className="text-[10px]">
                      {textoSeguro(op.status_op)}
                    </Badge>
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Produto Final:</span>
                    <span className="font-medium">{textoSeguro(op.produto_final)}</span>

                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-mono">{textoSeguro(op.status_op)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Dados da Saída
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nf-saida">NF de saída (opcional)</Label>
                <Input
                  id="nf-saida"
                  value={nfSaida}
                  onChange={(e) => setNfSaida(e.target.value)}
                  placeholder="Ex: NF-SAIDA-001"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qtd">Quantidade de saída *</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  max={pallet?.saldo_armazem_05 || undefined}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder={pallet ? `Máximo: ${formatarNumero(pallet.saldo_armazem_05)}` : "Ex: 5000"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="liberado">Liberado por *</Label>
                <Input
                  id="liberado"
                  value={liberadoPor}
                  onChange={(e) => setLiberadoPor(e.target.value)}
                  placeholder="Nome de quem liberou"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lider">Líder do setor *</Label>
                <Input
                  id="lider"
                  value={lider}
                  onChange={(e) => setLider(e.target.value)}
                  placeholder="Nome do líder"
                />

                {liderId && (
                  <p className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Líder encontrado.
                  </p>
                )}

                {liderNotFound && <p className="text-xs text-destructive">Líder não encontrado.</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="codigo-lider">Código do líder *</Label>
                <Input
                  id="codigo-lider"
                  type="password"
                  value={codigoLider}
                  onChange={(e) => setCodigoLider(e.target.value)}
                  placeholder="Digite o código"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resp">Responsável pela baixa *</Label>
                <Input
                  id="resp"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do responsável"
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

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Vincular a caminhão / controle de veículo (opcional)</Label>
                <Select
                  value={controleVeiculoId || "__none__"}
                  onValueChange={(v) => setControleVeiculoId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {controlesVeiculo.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.placa ?? "sem placa"} — {c.motorista ?? "sem motorista"}
                        {c.tipo_veiculo ? ` — ${c.tipo_veiculo}` : ""}
                        {c.created_at ? ` (${new Date(c.created_at).toLocaleDateString("pt-BR")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Se selecionar, ao registrar a saída também será criada uma carga vinculada ao caminhão.
                </p>
              </div>
            </CardContent>
          </Card>

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

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting || errosValidacao.length > 0} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Registrar saída
                </>
              )}
            </Button>

            <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={limparFormulario}>
              Limpar
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_app/saidas")({
  validateSearch: (search: Record<string, unknown>) => ({
    pallet: typeof search.pallet === "string" ? search.pallet : undefined,
  }),
  component: SaidaArmazem05Page,
});
