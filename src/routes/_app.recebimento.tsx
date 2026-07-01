import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  ClipboardList,
  AlertCircle,
  Search,
  Loader2,
  CheckCircle2,
  Package,
  QrCode,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LocalCascadeSelector } from "@/components/local-cascade-selector";


interface ReferenciaRow {
  id: string;
  codigo_referencia: string;
  descricao: string;
}

interface SdRow {
  id: string;
  referencia_id: string;
  numero_sd: string;
}

interface LocalRow {
  id: string;
  codigo_local: string;
  armazem_codigo: string;
  armazem_nome: string;
  galpao: string;
  rua: string;
  processo: string | null;
  descricao: string;
}

function RecebimentoPage() {
  const navigate = useNavigate();

  // Form state
  const [nf, setNf] = useState("");
  const [cliente, setCliente] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  // Referência
  const [refBusca, setRefBusca] = useState("");
  const [refResultados, setRefResultados] = useState<ReferenciaRow[]>([]);
  const [refBuscaLoading, setRefBuscaLoading] = useState(false);
  const [refSelecionada, setRefSelecionada] = useState<ReferenciaRow | null>(null);

  // SD
  const [sds, setSds] = useState<SdRow[]>([]);
  const [sdsLoading, setSdsLoading] = useState(false);
  const [sdSelecionada, setSdSelecionada] = useState<SdRow | null>(null);

  // Local
  const [locais, setLocais] = useState<LocalRow[]>([]);
  const [locaisLoading, setLocaisLoading] = useState(true);
  const [localBusca, setLocalBusca] = useState("");
  const [localSelecionado, setLocalSelecionado] = useState<LocalRow | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    codigo_pallet?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Load locais on mount ─────────────────────────────────
  useEffect(() => {
    (async () => {
      setLocaisLoading(true);
      try {
        const supabase = getSupabase();
        const { data, error: dbError } = await supabase
          .from("locais_estoque")
          .select("*")
          .order("codigo_local");
        if (dbError) throw new Error(dbError.message);
        setLocais((data as LocalRow[]) ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar locais.";
        setError(msg);
      } finally {
        setLocaisLoading(false);
      }
    })();
  }, []);

  // ─── Buscar referência ────────────────────────────────────
  const buscarReferencia = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setRefResultados([]);
      return;
    }
    setRefBuscaLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: dbError } = await supabase
        .from("referencias")
        .select("id, codigo_referencia, descricao")
        .ilike("codigo_referencia", `%${q}%`)
        .limit(10);
      if (dbError) throw new Error(dbError.message);
      setRefResultados((data as ReferenciaRow[]) ?? []);
    } catch {
      setRefResultados([]);
    } finally {
      setRefBuscaLoading(false);
    }
  }, []);

  // Busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => buscarReferencia(refBusca), 300);
    return () => clearTimeout(timer);
  }, [refBusca, buscarReferencia]);

  // ─── Selecionar referência → buscar SDs ───────────────────
  const selecionarReferencia = useCallback(async (ref: ReferenciaRow) => {
    setRefSelecionada(ref);
    setRefBusca(ref.codigo_referencia);
    setRefResultados([]);
    setSdSelecionada(null);

    setSdsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: dbError } = await supabase
        .from("sds")
        .select("id, referencia_id, numero_sd")
        .eq("referencia_id", ref.id);
      if (dbError) throw new Error(dbError.message);
      const lista = (data as SdRow[]) ?? [];
      setSds(lista);
      // Auto-select if only one
      if (lista.length === 1) {
        setSdSelecionada(lista[0]);
      }
    } catch {
      setSds([]);
    } finally {
      setSdsLoading(false);
    }
  }, []);

  // ─── Filtrar locais (null-safe) ───────────────────────────
  const locaisFiltrados = useMemo(() => {
    const textoSeguro = (valor: unknown) => String(valor ?? "").toLowerCase();
    if (!localBusca.trim()) return locais;
    const q = textoSeguro(localBusca);
    return locais.filter((l) => {
      const row = l as unknown as Record<string, unknown>;
      const campos: unknown[] = [
        row.codigo_local,
        row.armazem_codigo,
        row.armazem_nome,
        row.galpao,
        row.rua,
        row.processo,
        row.descricao,
        row.status,
        row.codigo_pallet,
        row.numero_sd,
        row.codigo_referencia,
      ];
      return campos.some((c) => textoSeguro(c).includes(q));
    });
  }, [locais, localBusca]);

  // ─── Validar formulário ───────────────────────────────────
  const errosValidacao = useMemo(() => {
    const e: string[] = [];
    if (!nf.trim()) e.push("NF de entrada é obrigatória.");
    if (!cliente.trim()) e.push("Cliente é obrigatório.");
    if (!fornecedor.trim()) e.push("Fornecedor é obrigatório.");
    if (!refSelecionada) e.push("Referência é obrigatória.");
    if (sds.length > 0 && !sdSelecionada)
      e.push("Selecione uma SD.");
    const qtd = Number(quantidade);
    if (!quantidade || isNaN(qtd) || qtd <= 0)
      e.push("Quantidade deve ser maior que zero.");
    if (!localSelecionado) e.push("Local de estoque é obrigatório.");
    if (!responsavel.trim()) e.push("Responsável é obrigatório.");
    return e;
  }, [nf, cliente, fornecedor, refSelecionada, sds, sdSelecionada, quantidade, localSelecionado, responsavel]);

  // ─── Submit ──────────────────────────────────────────────
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
        const { data, error: rpcError } = await (supabase as any).rpc(
          "registrar_recebimento_basico",
          {
            p_numero_nf: nf.trim(),
            p_cliente_nome: cliente.trim(),
            p_fornecedor_nome: fornecedor.trim(),
            p_codigo_referencia: refSelecionada!.codigo_referencia,
            p_quantidade: Number(quantidade),
            p_local_estoque_id: localSelecionado!.id,
            p_responsavel: responsavel.trim(),
            p_observacao: observacao.trim() || null,
            p_numero_sd: sdSelecionada?.numero_sd ?? null,
          }
        );

        if (rpcError) {
          // Handle permission error
          if (
            rpcError.message?.includes("permission") ||
            rpcError.code === "42501" ||
            rpcError.code === "PGRST301"
          ) {
            setResultado({
              sucesso: false,
              mensagem:
                "Função de recebimento bloqueada por segurança. É necessário liberar a RPC registrar_recebimento_basico para teste ou chamar por backend seguro.",
            });
            return;
          }
          throw new Error(rpcError.message);
        }

        // RPC retornou sucesso
        const codigoPallet = data as unknown as string;
        setResultado({
          sucesso: true,
          mensagem: "Recebimento registrado com sucesso.",
          codigo_pallet: typeof codigoPallet === "string" ? codigoPallet : undefined,
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erro ao registrar recebimento.";
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      errosValidacao,
      nf,
      cliente,
      fornecedor,
      refSelecionada,
      quantidade,
      localSelecionado,
      responsavel,
      observacao,
      sdSelecionada,
    ]
  );

  const limparFormulario = () => {
    setNf("");
    setCliente("");
    setFornecedor("");
    setQuantidade("");
    setResponsavel("");
    setObservacao("");
    setRefBusca("");
    setRefSelecionada(null);
    setSds([]);
    setSdSelecionada(null);
    setLocalBusca("");
    setLocalSelecionado(null);
    setResultado(null);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recebimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrar entrada de materiais — NF, referência, SD e local de estoque.
        </p>
      </div>

      {/* Resultado */}
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
                resultado.sucesso ? "bg-green-500/10" : "bg-destructive/10"
              }`}
            >
              {resultado.sucesso ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h2 className="text-lg font-semibold">
              {resultado.sucesso
                ? "Recebimento registrado"
                : "Função bloqueada"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {resultado.mensagem}
            </p>
            {resultado.sucesso && resultado.codigo_pallet && (
              <p className="font-mono text-base font-bold">
                Pallet: {resultado.codigo_pallet}
              </p>
            )}
            {resultado.sucesso && (
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {resultado.codigo_pallet && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({ to: `/pallets/${resultado.codigo_pallet}` })
                      }
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Ver pallet
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({ to: `/pallets/${resultado.codigo_pallet}?print=1` })
                      }
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir ficha
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={limparFormulario}>
                  Novo recebimento
                </Button>
              </div>
            )}
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
      {!resultado && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Dados da NF
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nf">NF de entrada *</Label>
                <Input
                  id="nf"
                  value={nf}
                  onChange={(e) => setNf(e.target.value)}
                  placeholder="Ex: NF-TESTE-001"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <Input
                  id="fornecedor"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 30000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Referência + SD */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                Referência e SD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Busca referência */}
              <div className="space-y-1.5">
                <Label>Referência *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={refBusca}
                    onChange={(e) => setRefBusca(e.target.value)}
                    placeholder="Digite o código da referência..."
                    className="pl-10 font-mono text-xs"
                  />
                  {refBuscaLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {refSelecionada && (
                  <p className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Selecionada: {refSelecionada.codigo_referencia} —{" "}
                    {refSelecionada.descricao}
                  </p>
                )}
              </div>

              {/* Dropdown de resultados da referência */}
              {refResultados.length > 0 && !refSelecionada && (
                <div className="rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {refResultados.map((ref) => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => selecionarReferencia(ref)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-mono font-semibold">
                        {ref.codigo_referencia}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ref.descricao}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Nenhum resultado após busca */}
              {refBusca.trim().length >= 2 && !refBuscaLoading && refResultados.length === 0 && !refSelecionada && (
                <p className="text-xs text-destructive">
                  Referência não cadastrada. Importe/cadastre a referência mestre
                  antes do recebimento.
                </p>
              )}

              {/* Seleção de SD */}
              {refSelecionada && (
                <div className="space-y-1.5">
                  <Label>SD</Label>
                  {sdsLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : sds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma SD vinculada a esta referência.
                    </p>
                  ) : sds.length === 1 ? (
                    <p className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      SD preenchida automaticamente: {sds[0].numero_sd}
                    </p>
                  ) : (
                    <select
                      value={sdSelecionada?.id ?? ""}
                      onChange={(e) => {
                        const sd = sds.find((s) => s.id === e.target.value);
                        setSdSelecionada(sd ?? null);
                      }}
                      className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                    >
                      <option value="">Selecione uma SD...</option>
                      {sds.map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {sd.numero_sd}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local de estoque */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Local de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={localBusca}
                  onChange={(e) => setLocalBusca(e.target.value)}
                  placeholder="Filtrar locais por código, armazém, galpão..."
                  className="pl-10"
                />
              </div>

              {locaisLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  {locaisFiltrados.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Nenhum local encontrado.
                    </p>
                  ) : (
                    locaisFiltrados.map((l) => {
                      const selected = localSelecionado?.id === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLocalSelecionado(l)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                            selected
                              ? "bg-primary/10 border-l-2 border-primary"
                              : "border-l-2 border-transparent"
                          }`}
                        >
                          <span className="font-mono font-semibold w-24 shrink-0">
                            {l.codigo_local}
                          </span>
                          <span className="flex-1 truncate">
                            {l.armazem_nome} / {l.galpao} / {l.rua}
                          </span>
                          {l.processo && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {l.processo}
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {localSelecionado && (
                <p className="flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Local selecionado: {localSelecionado.codigo_local} —{" "}
                  {localSelecionado.descricao}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Responsável + Observação */}
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
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Erros de validação */}
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
                  <ClipboardList className="h-4 w-4" />
                  Registrar recebimento
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

export const Route = createFileRoute("/_app/recebimento")({
  component: RecebimentoPage,
});
