import { createFileRoute } from "@tanstack/react-router";

import { useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Truck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
  Flame,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

// ─── Tipos ─────────────────────────────────────────────────
interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const checklistInicial: ChecklistItem[] = [
  { id: "limpo", label: "Veículo limpo", checked: false },
  { id: "condicoes", label: "Veículo em boas condições", checked: false },
  { id: "bau", label: "Baú adequado", checked: false },
  { id: "vazamento", label: "Sem vazamento", checked: false },
  { id: "contaminacao", label: "Sem contaminação", checked: false },
  { id: "carga", label: "Carga protegida", checked: false },
  { id: "documentacao", label: "Documentação conferida", checked: false },
  { id: "aprovado", label: "Aprovado", checked: false },
];

function VeiculosPage() {
  // Dados do veículo
  const [placa, setPlaca] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [motorista, setMotorista] = useState("");
  const [saidaId, setSaidaId] = useState("");
  const [saidaNotFound, setSaidaNotFound] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [statusAprovacao, setStatusAprovacao] = useState("aprovado");
  const [observacao, setObservacao] = useState("");

  // Checklist
  const [checklist, setChecklist] = useState(checklistInicial);

  // Fumaça preta
  const [diesel, setDiesel] = useState(false);
  const [fumacaPercentual, setFumacaPercentual] = useState("");
  const [fumacaResultado, setFumacaResultado] = useState("");
  const [fumacaResponsavel, setFumacaResponsavel] = useState("");
  const [fumacaObservacao, setFumacaObservacao] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [resposta, setResposta] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Alternar checklist ──────────────────────────────────
  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // ─── Validar fumaça preta ────────────────────────────────
  const validarFumaca = useCallback((percentual: number) => {
    if (percentual < 0) return "";
    if (percentual <= 40) return "aprovado";
    return "reprovado";
  }, []);

  // ─── Validar formulário ──────────────────────────────────
  const errosValidacao: string[] = [];
  if (!placa.trim()) errosValidacao.push("Placa é obrigatória.");
  if (!tipoVeiculo.trim()) errosValidacao.push("Tipo de veículo é obrigatório.");
  if (!transportadora.trim())
    errosValidacao.push("Transportadora é obrigatória.");
  if (!motorista.trim()) errosValidacao.push("Motorista é obrigatório.");
  if (!responsavel.trim())
    errosValidacao.push("Responsável pela conferência é obrigatório.");
  if (!statusAprovacao)
    errosValidacao.push("Status de aprovação é obrigatório.");
  if (!saidaId.trim())
    errosValidacao.push("ID da saída é obrigatório.");

  const checklistCompleto = checklist.every((item) => item.checked);
  if (!checklistCompleto)
    errosValidacao.push("Todos os itens do checklist devem ser marcados.");

  // Fumaça preta
  if (diesel) {
    const perc = Number(fumacaPercentual);
    if (!fumacaPercentual || isNaN(perc) || perc < 0)
      errosValidacao.push("Percentual de fumaça preta é obrigatório para veículos diesel.");
    if (!fumacaResponsavel.trim())
      errosValidacao.push("Responsável pela medição de fumaça preta é obrigatório para veículos diesel.");
  }

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (errosValidacao.length > 0) return;
      setSubmitting(true);
      setError(null);
      setResposta(null);
      try {
        const supabase = getSupabase();

        // Monta observação incluindo checklist e fumaça preta
        const checklistObs = checklist
          .map((item) => `${item.checked ? "✅" : "☐"} ${item.label}`)
          .join("\n");

        let fumacaObs = "";
        if (diesel) {
          fumacaObs = `\n\n🚛 Fumaça Preta:\n- Diesel: Sim\n- Percentual: ${fumacaPercentual}%\n- Resultado: ${fumacaResultado || validarFumaca(Number(fumacaPercentual))}\n- Responsável: ${fumacaResponsavel}${fumacaObservacao ? `\n- Obs: ${fumacaObservacao}` : ""}`;
        }

        const obsFinal =
          `📋 CHECKLIST:\n${checklistObs}${fumacaObs}${observacao ? `\n\n📝 Observação: ${observacao}` : ""}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcError } = await (supabase as any).rpc(
          "registrar_controle_veiculo_basico",
          {
            p_placa: placa.trim(),
            p_tipo_veiculo: tipoVeiculo.trim(),
            p_transportadora: transportadora.trim(),
            p_motorista: motorista.trim(),
            p_responsavel_conferencia: responsavel.trim(),
            p_saida_id: saidaId,
            p_status_aprovacao: statusAprovacao,
            p_observacao: obsFinal,
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
                "Função de controle de veículo bloqueada por segurança. É necessário liberar a RPC registrar_controle_veiculo_basico para teste ou chamar por backend seguro.",
            });
            return;
          }
          if (rpcError.code === "P0001") {
            setResposta({ sucesso: false, mensagem: rpcError.message });
            return;
          }
          if (rpcError.code === "23503") {
            setSaidaNotFound(true);
            setResposta({
              sucesso: false,
              mensagem:
                "Saída não encontrada. Selecione uma saída válida ou verifique o ID informado.",
            });
            return;
          }
          throw new Error(rpcError.message);
        }

        setResposta({
          sucesso: true,
          mensagem: "Controle de veículo registrado com sucesso.",
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erro ao registrar veículo."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      errosValidacao,
      checklist,
      diesel,
      fumacaPercentual,
      fumacaResultado,
      fumacaResponsavel,
      fumacaObservacao,
      observacao,
      placa,
      tipoVeiculo,
      transportadora,
      motorista,
      responsavel,
      statusAprovacao,
      validarFumaca,
      saidaId,
    ]
  );

  const limparFormulario = () => {
    setPlaca("");
    setTipoVeiculo("");
    setTransportadora("");
    setMotorista("");
    setSaidaId("");
    setSaidaNotFound(false);
    setResponsavel("");
    setStatusAprovacao("aprovado");
    setObservacao("");
    setChecklist(checklistInicial);
    setDiesel(false);
    setFumacaPercentual("");
    setFumacaResultado("");
    setFumacaResponsavel("");
    setFumacaObservacao("");
    setResposta(null);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Controle de Veículos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de controle de veículos conforme FQ068 e FQ069. Checklist,
          fumaça preta e aprovação.
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
              {resposta.sucesso
                ? "Controle registrado"
                : "Operação não concluída"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {resposta.mensagem}
            </p>
            {resposta.sucesso && (
              <Button variant="outline" size="sm" onClick={limparFormulario} className="mt-2">
                Novo controle
              </Button>
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
      {!resposta && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do veículo */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="placa">Placa *</Label>
                <Input
                  id="placa"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  placeholder="Ex: ABC1D23"
                  className="font-mono text-xs uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo de veículo *</Label>
                <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caminhão">Caminhão</SelectItem>
                    <SelectItem value="Carreta">Carreta</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Utilitário">Utilitário</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transportadora">Transportadora *</Label>
                <Input
                  id="transportadora"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  placeholder="Nome da transportadora"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motorista">Motorista *</Label>
                <Input
                  id="motorista"
                  value={motorista}
                  onChange={(e) => setMotorista(e.target.value)}
                  placeholder="Nome do motorista"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="responsavel">Responsável pela conferência *</Label>
                <Input
                  id="responsavel"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do conferente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status de aprovação *</Label>
                <Select
                  value={statusAprovacao}
                  onValueChange={setStatusAprovacao}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">✅ Aprovado</SelectItem>
                    <SelectItem value="reprovado">❌ Reprovado</SelectItem>
                    <SelectItem value="pendente">⏳ Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obs">Observação</Label>
                <Input
                  id="obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações gerais"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="saida-id">ID da Saída *</Label>
                <Input
                  id="saida-id"
                  value={saidaId}
                  onChange={(e) => {
                    setSaidaId(e.target.value);
                    setSaidaNotFound(false);
                  }}
                  placeholder="UUID da saída armazém 05"
                  className="font-mono text-xs"
                />
                {saidaId && !saidaNotFound && (
                  <p className="text-xs text-muted-foreground">UUID informado. Será validado ao enviar.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                Checklist de Inspeção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
                      item.checked
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-muted bg-muted/10"
                    }`}
                  >
                    <Checkbox
                      id={`chk-${item.id}`}
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklist(item.id)}
                    />
                    <Label
                      htmlFor={`chk-${item.id}`}
                      className={`cursor-pointer text-sm flex-1 ${
                        item.checked ? "text-green-700 dark:text-green-400" : ""
                      }`}
                    >
                      {item.checked ? "✅" : "☐"} {item.label}
                    </Label>
                  </li>
                ))}
              </ul>
              {checklistCompleto && (
                <p className="mt-3 flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Checklist completo.
                </p>
              )}
              {!checklistCompleto && (
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {checklist.filter((i) => !i.checked).length} item(s) restante(s).
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fumaça Preta */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-muted-foreground" />
                Fumaça Preta (FQ069)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Checkbox
                  id="diesel"
                  checked={diesel}
                  onCheckedChange={(v) => {
                    setDiesel(!!v);
                    if (!v) {
                      setFumacaPercentual("");
                      setFumacaResultado("");
                      setFumacaResponsavel("");
                      setFumacaObservacao("");
                    }
                  }}
                />
                <Label htmlFor="diesel" className="cursor-pointer">
                  Veículo a diesel?
                </Label>
              </div>

              {diesel && (
                <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="fumaca-perc">Percentual observado (%) *</Label>
                      <Input
                        id="fumaca-perc"
                        type="number"
                        min="0"
                        max="100"
                        value={fumacaPercentual}
                        onChange={(e) => {
                          setFumacaPercentual(e.target.value);
                          const perc = Number(e.target.value);
                          if (!isNaN(perc) && perc >= 0) {
                            setFumacaResultado(validarFumaca(perc));
                          }
                        }}
                        placeholder="0–100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Resultado</Label>
                      <div
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                          fumacaResultado === "aprovado"
                            ? "border-green-500/30 bg-green-500/5 text-green-600"
                            : fumacaResultado === "reprovado"
                            ? "border-destructive/30 bg-destructive/5 text-destructive"
                            : "border-muted bg-muted/10 text-muted-foreground"
                        }`}
                      >
                        {fumacaResultado === "aprovado" && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {fumacaResultado === "reprovado" && (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {fumacaResultado === "aprovado"
                          ? "Aprovado (≤40%)"
                          : fumacaResultado === "reprovado"
                          ? "Reprovado (>40%)"
                          : "Aguardando percentual"}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fumaca-resp">Responsável *</Label>
                      <Input
                        id="fumaca-resp"
                        value={fumacaResponsavel}
                        onChange={(e) => setFumacaResponsavel(e.target.value)}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fumaca-obs">Observação</Label>
                      <Input
                        id="fumaca-obs"
                        value={fumacaObservacao}
                        onChange={(e) => setFumacaObservacao(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Regra FQ069: 0% a 40% = Aprovado. Acima de 40% = Reprovado.
                  </p>
                </div>
              )}
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
                  <ShieldCheck className="h-4 w-4" />
                  Registrar controle
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

export const Route = createFileRoute("/_app/veiculos")({
  component: VeiculosPage,
});
