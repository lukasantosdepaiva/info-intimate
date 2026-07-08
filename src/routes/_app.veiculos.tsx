import { createFileRoute } from "@tanstack/react-router";

import { useState, useCallback, useRef, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  Truck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
  Flame,
  Camera,
  X,
  Upload,
  ImageIcon,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PalletSearchDialog, type PalletSearchResult } from "@/components/pallet-search-dialog";

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

// ─── Tipos de foto ─────────────────────────────────────────
type TipoFoto =
  | "frente"
  | "traseira"
  | "lateral_direita"
  | "lateral_esquerda"
  | "bau_interno"
  | "placa"
  | "carga"
  | "avaria";

interface TipoFotoConfig {
  tipo: TipoFoto;
  label: string;
  multiplo: boolean;
  obrigatorioAprovado: boolean;
}

const TIPOS_FOTO: TipoFotoConfig[] = [
  { tipo: "frente", label: "Frente", multiplo: false, obrigatorioAprovado: true },
  { tipo: "traseira", label: "Traseira", multiplo: false, obrigatorioAprovado: true },
  { tipo: "lateral_direita", label: "Lateral direita", multiplo: false, obrigatorioAprovado: false },
  { tipo: "lateral_esquerda", label: "Lateral esquerda", multiplo: false, obrigatorioAprovado: false },
  { tipo: "bau_interno", label: "Interior do baú", multiplo: false, obrigatorioAprovado: true },
  { tipo: "placa", label: "Placa", multiplo: false, obrigatorioAprovado: true },
  { tipo: "carga", label: "Carga protegida", multiplo: false, obrigatorioAprovado: false },
  { tipo: "avaria", label: "Avaria / problema", multiplo: true, obrigatorioAprovado: false },
];

interface FotoVeiculo {
  id: string;
  tipo: TipoFoto;
  file: File;
  previewUrl: string;
  observacao?: string;
}

const STORAGE_BUCKET = "controle-veiculos-fotos";

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

  // Fotos
  const [fotos, setFotos] = useState<FotoVeiculo[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [ultimoControleId, setUltimoControleId] = useState<string | null>(null);
  const [controleBuscaId, setControleBuscaId] = useState<string | null>(null);
  const [resposta, setResposta] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Alternar checklist ──────────────────────────────────
  const toggleChecklist = (id: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  // ─── Validar fumaça preta ────────────────────────────────
  const validarFumaca = useCallback((percentual: number) => {
    if (percentual < 0) return "";
    if (percentual <= 40) return "aprovado";
    return "reprovado";
  }, []);

  // ─── Fotos ───────────────────────────────────────────────
  const adicionarFoto = useCallback((tipo: TipoFoto, file: File) => {
    const cfg = TIPOS_FOTO.find((t) => t.tipo === tipo);
    if (!cfg) return;
    setFotos((prev) => {
      const semTipo = cfg.multiplo ? prev : prev.filter((f) => f.tipo !== tipo);
      const nova: FotoVeiculo = {
        id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tipo,
        file,
        previewUrl: URL.createObjectURL(file),
      };
      return [...semTipo, nova];
    });
  }, []);

  const removerFoto = useCallback((id: string) => {
    setFotos((prev) => {
      const alvo = prev.find((f) => f.id === id);
      if (alvo) URL.revokeObjectURL(alvo.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const fotosPorTipo = useCallback((tipo: TipoFoto) => fotos.filter((f) => f.tipo === tipo), [fotos]);

  // ─── Validar formulário ──────────────────────────────────
  const errosValidacao: string[] = [];
  if (!placa.trim()) errosValidacao.push("Placa é obrigatória.");
  if (!tipoVeiculo.trim()) errosValidacao.push("Tipo de veículo é obrigatório.");
  if (!transportadora.trim()) errosValidacao.push("Transportadora é obrigatória.");
  if (!motorista.trim()) errosValidacao.push("Motorista é obrigatório.");
  if (!responsavel.trim()) errosValidacao.push("Responsável pela conferência é obrigatório.");
  if (!statusAprovacao) errosValidacao.push("Status de aprovação é obrigatório.");

  const checklistCompleto = checklist.every((item) => item.checked);
  if (!checklistCompleto) errosValidacao.push("Todos os itens do checklist devem ser marcados.");

  // Fumaça preta
  if (diesel) {
    const perc = Number(fumacaPercentual);
    if (!fumacaPercentual || isNaN(perc) || perc < 0)
      errosValidacao.push("Percentual de fumaça preta é obrigatório para veículos diesel.");
    if (!fumacaResponsavel.trim())
      errosValidacao.push("Responsável pela medição de fumaça preta é obrigatório para veículos diesel.");
  }

  // Fotos obrigatórias
  if (statusAprovacao === "aprovado") {
    for (const cfg of TIPOS_FOTO) {
      if (cfg.obrigatorioAprovado && fotosPorTipo(cfg.tipo).length === 0) {
        errosValidacao.push(`Foto obrigatória: ${cfg.label}.`);
      }
    }
  }
  if (statusAprovacao === "reprovado") {
    const temAvaria = fotosPorTipo("avaria").length > 0;
    const temObs = observacao.trim().length > 0;
    if (!temAvaria && !temObs) {
      errosValidacao.push("Reprovações exigem ao menos uma foto de avaria/problema ou observação explicativa.");
    }
  }

  // ─── Upload de fotos ─────────────────────────────────────
  const uploadFotos = useCallback(
    async (controleVeiculoId: string) => {
      const supabase = getSupabase();
      const enviados: Array<{
        tipo: TipoFoto;
        storage_path: string;
        nome_original: string;
        mime_type: string;
        tamanho_bytes: number;
      }> = [];

      const timestamp = Date.now();
      const porTipo = new Map<TipoFoto, number>();

      for (const foto of fotos) {
        const idx = (porTipo.get(foto.tipo) ?? 0) + 1;
        porTipo.set(foto.tipo, idx);
        const ext = (foto.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `controle-veiculos/${controleVeiculoId}/${foto.tipo}-${timestamp}-${idx}.${ext}`;

        setUploadProgress(`Enviando ${foto.tipo} (${idx})...`);
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, foto.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: foto.file.type || "image/jpeg",
        });
        if (upErr) throw new Error(`Falha no upload (${foto.tipo}): ${upErr.message}`);

        enviados.push({
          tipo: foto.tipo,
          storage_path: path,
          nome_original: foto.file.name,
          mime_type: foto.file.type || "image/jpeg",
          tamanho_bytes: foto.file.size,
        });
      }
      return enviados;
    },
    [fotos],
  );

  const salvarMetadadosFotos = useCallback(
    async (controleVeiculoId: string, enviadas: Awaited<ReturnType<typeof uploadFotos>>) => {
      if (enviadas.length === 0) return;
      const supabase = getSupabase();
      const rows = enviadas.map((f) => ({
        controle_veiculo_id: controleVeiculoId,
        tipo_foto: f.tipo,
        storage_bucket: STORAGE_BUCKET,
        storage_path: f.storage_path,
        nome_original: f.nome_original,
        mime_type: f.mime_type,
        tamanho_bytes: f.tamanho_bytes,
        enviado_por: responsavel.trim() || null,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any).from("controle_veiculo_fotos").insert(rows);
      if (insErr) throw new Error(`Falha ao salvar metadados das fotos: ${insErr.message}`);
    },
    [responsavel],
  );

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (errosValidacao.length > 0) return;
      setSubmitting(true);
      setError(null);
      setResposta(null);
      setUploadProgress(null);
      try {
        const supabase = getSupabase();

        // Monta observação incluindo checklist e fumaça preta
        const checklistObs = checklist.map((item) => `${item.checked ? "✅" : "☐"} ${item.label}`).join("\n");

        let fumacaObs = "";
        if (diesel) {
          fumacaObs = `\n\n🚛 Fumaça Preta:\n- Diesel: Sim\n- Percentual: ${fumacaPercentual}%\n- Resultado: ${fumacaResultado || validarFumaca(Number(fumacaPercentual))}\n- Responsável: ${fumacaResponsavel}${fumacaObservacao ? `\n- Obs: ${fumacaObservacao}` : ""}`;
        }

        const obsFinal = `📋 CHECKLIST:\n${checklistObs}${fumacaObs}${observacao ? `\n\n📝 Observação: ${observacao}` : ""}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc("registrar_controle_veiculo_basico", {
          p_placa: placa.trim(),
          p_tipo_veiculo: tipoVeiculo.trim(),
          p_transportadora: transportadora.trim(),
          p_motorista: motorista.trim(),
          p_responsavel_conferencia: responsavel.trim(),
          p_saida_id: saidaId,
          p_saida_id: saidaId.trim() || null,
          p_status_aprovacao: statusAprovacao,
          p_observacao: obsFinal,
        });

        if (rpcError) {
          if (rpcError.message?.includes("permission") || rpcError.code === "42501" || rpcError.code === "PGRST301") {
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
              mensagem: "Saída não encontrada. Selecione uma saída válida ou verifique o ID informado.",
            });
            return;
          }
          throw new Error(rpcError.message);
        }

        // Extrai id do controle criado (RPC deve retornar uuid)
        let controleVeiculoId: string | null = null;
        if (typeof rpcData === "string") controleVeiculoId = rpcData;
        else if (rpcData && typeof rpcData === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = rpcData as any;
          controleVeiculoId = d.id ?? d.controle_veiculo_id ?? d.uuid ?? null;
          if (!controleVeiculoId && Array.isArray(d) && d.length > 0) {
            controleVeiculoId = d[0].id ?? d[0].controle_veiculo_id ?? null;
          }
        }

        if (fotos.length > 0) {
          if (!controleVeiculoId) {
            throw new Error(
              "A RPC registrar_controle_veiculo_basico não retornou o id do controle criado. Ajuste a função para RETURNS uuid retornando o id do registro inserido em controle_veiculos.",
            );
          }
          const enviadas = await uploadFotos(controleVeiculoId);
          await salvarMetadadosFotos(controleVeiculoId, enviadas);
        }

        setUploadProgress(null);
        if (controleVeiculoId) setUltimoControleId(controleVeiculoId);
        setResposta({
          sucesso: true,
          mensagem:
            fotos.length > 0
              ? `Controle registrado com sucesso. ${fotos.length} foto(s) enviada(s).`
              : "Controle de veículo registrado com sucesso.",
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao registrar veículo.");
      } finally {
        setSubmitting(false);
        setUploadProgress(null);
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
      fotos,
      uploadFotos,
      salvarMetadadosFotos,
    ],
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
    fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFotos([]);
    setResposta(null);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Controle de Veículos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de controle de veículos conforme FQ068 e FQ069. Checklist, fumaça preta, evidências fotográficas e
          aprovação.
        </p>
      </div>

      <VeiculoBuscaCard onControleCriado={setControleBuscaId} />

      {/* Resposta */}
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
              {resposta.sucesso ? "Controle registrado" : "Operação não concluída"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">{resposta.mensagem}</p>
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
            <p className="max-w-md text-xs text-muted-foreground font-mono">{error}</p>
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
                <Select value={statusAprovacao} onValueChange={setStatusAprovacao}>
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
                      item.checked ? "border-green-500/30 bg-green-500/5" : "border-muted bg-muted/10"
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
                        {fumacaResultado === "aprovado" && <CheckCircle2 className="h-4 w-4" />}
                        {fumacaResultado === "reprovado" && <AlertCircle className="h-4 w-4" />}
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

          {/* Evidências fotográficas */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Evidências fotográficas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Anexe fotos do veículo. Use a câmera do celular ou selecione arquivos. Obrigatórias para aprovação:
                Frente, Traseira, Interior do baú, Placa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TIPOS_FOTO.map((cfg) => {
                  const lista = fotosPorTipo(cfg.tipo);
                  const preenchido = lista.length > 0;
                  const inputId = `foto-${cfg.tipo}`;
                  return (
                    <div
                      key={cfg.tipo}
                      className={`rounded-md border p-3 space-y-2 ${
                        preenchido
                          ? "border-green-500/30 bg-green-500/5"
                          : cfg.obrigatorioAprovado
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-muted bg-muted/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {cfg.label}
                          {cfg.obrigatorioAprovado && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">obrigatória</span>
                          )}
                          {cfg.multiplo && <span className="text-[10px] text-muted-foreground">múltiplas</span>}
                        </div>
                        {preenchido && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>

                      <input
                        ref={(el) => {
                          fileInputRefs.current[inputId] = el;
                        }}
                        id={inputId}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple={cfg.multiplo}
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          Array.from(files).forEach((file) => adicionarFoto(cfg.tipo, file));
                          e.target.value = "";
                        }}
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-1 text-xs"
                          onClick={() => fileInputRefs.current[inputId]?.click()}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {preenchido && !cfg.multiplo ? "Trocar" : "Anexar"}
                        </Button>
                      </div>

                      {lista.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {lista.map((foto) => (
                            <div key={foto.id} className="relative group rounded-md overflow-hidden border bg-muted">
                              <img src={foto.previewUrl} alt={cfg.label} className="w-full h-24 object-cover" />
                              <button
                                type="button"
                                onClick={() => removerFoto(foto.id)}
                                className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remover foto"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">
                                {(foto.file.size / 1024).toFixed(0)} KB
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {fotos.length} foto(s) selecionada(s). Upload ocorre após o registro do controle.
              </p>
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

          {/* Progresso upload */}
          {uploadProgress && (
            <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {uploadProgress}
            </div>
          )}

          {/* Submit */}
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
                  Registrar controle
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={limparFormulario}>
              Limpar
            </Button>
          </div>
        </form>
      )}

      <CargasCaminhaoCard controleInicialId={controleBuscaId ?? ultimoControleId} />
    </main>
  );
}

// ─── Cargas do caminhão ───────────────────────────────────
interface ControleResumo {
  id: string;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  status_aprovacao: string | null;
  created_at: string | null;
}

interface CargaResumo {
  controle_veiculo_id: string;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  status_aprovacao: string | null;
  quantidade_total: number | string | null;
  qtd_pallets: number | string | null;
  ops_vinculadas: string | null;
  nfs_saida: string | null;
  ultima_carga_em: string | null;
}

interface CargaDetalhe {
  id: string;
  controle_veiculo_id: string;
  codigo_pallet: string | null;
  codigo_referencia: string | null;
  numero_sd: string | null;
  quantidade: number | string | null;
  responsavel: string | null;
  observacao: string | null;
  numero_op: string | null;
  nf_saida_numero: string | null;
  local_origem_codigo: string | null;
  created_at: string | null;
}

const textoOuTraco = (v: unknown, fb = "—") => {
  const t = String(v ?? "").trim();
  return t || fb;
};
const numFmt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR") : "0";
};

function CargasCaminhaoCard({ controleInicialId }: { controleInicialId: string | null }) {
  const [controles, setControles] = useState<ControleResumo[]>([]);
  const [controleSelId, setControleSelId] = useState<string | null>(null);
  const [loadingControles, setLoadingControles] = useState(false);

  const [resumo, setResumo] = useState<CargaResumo | null>(null);
  const [cargas, setCargas] = useState<CargaDetalhe[]>([]);
  const [loadingCargas, setLoadingCargas] = useState(false);

  const [palletDialogOpen, setPalletDialogOpen] = useState(false);
  const [palletEscolhido, setPalletEscolhido] = useState<PalletSearchResult | null>(null);

  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [nfSaida, setNfSaida] = useState("");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregarControles = useCallback(async () => {
    setLoadingControles(true);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data } = await sb
        .from("controle_veiculos")
        .select("id, placa, motorista, transportadora, status_aprovacao, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      setControles((data ?? []) as ControleResumo[]);
    } finally {
      setLoadingControles(false);
    }
  }, []);

  useEffect(() => {
    carregarControles();
  }, [carregarControles]);

  useEffect(() => {
    if (controleInicialId) setControleSelId(controleInicialId);
  }, [controleInicialId]);

  const carregarCargas = useCallback(async (controleId: string) => {
    setLoadingCargas(true);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [{ data: r }, { data: d }] = await Promise.all([
        sb.from("vw_veiculo_cargas_resumo").select("*").eq("controle_veiculo_id", controleId).maybeSingle(),
        sb
          .from("vw_veiculo_cargas_detalhe")
          .select("*")
          .eq("controle_veiculo_id", controleId)
          .order("created_at", { ascending: false }),
      ]);
      setResumo((r as CargaResumo | null) ?? null);
      setCargas((d ?? []) as CargaDetalhe[]);
    } finally {
      setLoadingCargas(false);
    }
  }, []);

  useEffect(() => {
    if (controleSelId) carregarCargas(controleSelId);
    else {
      setResumo(null);
      setCargas([]);
    }
  }, [controleSelId, carregarCargas]);

  const controleSel = controles.find((c) => c.id === controleSelId) ?? null;

  const registrarCarga = async () => {
    if (!controleSelId || !palletEscolhido) return;
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      setMsg({ ok: false, texto: "Quantidade deve ser maior que zero." });
      return;
    }
    if (!responsavel.trim()) {
      setMsg({ ok: false, texto: "Responsável é obrigatório." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("registrar_carga_veiculo", {
        p_controle_veiculo_id: controleSelId,
        p_pallet_id: palletEscolhido.pallet_id,
        p_quantidade: qtd,
        p_responsavel: responsavel.trim(),
        p_saida_id: null,
        p_op_id: null,
        p_local_origem_id: null,
        p_nf_saida_numero: nfSaida.trim() || null,
        p_observacao: observacao.trim() || null,
      });
      if (error) {
        setMsg({ ok: false, texto: error.message });
        return;
      }
      setMsg({ ok: true, texto: "Carga registrada no caminhão." });
      setPalletEscolhido(null);
      setQuantidade("");
      setNfSaida("");
      setObservacao("");
      await carregarCargas(controleSelId);
    } catch (e: unknown) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : "Erro ao registrar carga." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Cargas do caminhão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Controle de veículo</Label>
            <Select value={controleSelId ?? ""} onValueChange={(v) => setControleSelId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder={loadingControles ? "Carregando..." : "Selecione um controle existente"} />
              </SelectTrigger>
              <SelectContent>
                {controles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {textoOuTraco(c.placa)} — {textoOuTraco(c.motorista, "sem motorista")}
                    {c.created_at ? ` (${new Date(c.created_at).toLocaleDateString("pt-BR")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Registre um controle acima ou selecione um existente para adicionar cargas de pallets.
            </p>
          </div>

          {controleSel && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" />
                Placa: <span className="font-mono">{textoOuTraco(controleSel.placa)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {textoOuTraco(controleSel.status_aprovacao)}
                </Badge>
              </p>
              <p>
                Motorista: {textoOuTraco(controleSel.motorista)} • Transportadora:{" "}
                {textoOuTraco(controleSel.transportadora)}
              </p>
              {resumo && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Qtd. total</span>
                    <p className="font-bold">{numFmt(resumo.quantidade_total)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pallets</span>
                    <p className="font-bold">{numFmt(resumo.qtd_pallets)}</p>
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-muted-foreground">OPs</span>
                    <p className="truncate">{textoOuTraco(resumo.ops_vinculadas)}</p>
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-muted-foreground">NFs saída</span>
                    <p className="truncate">{textoOuTraco(resumo.nfs_saida)}</p>
                  </div>
                  {resumo.ultima_carga_em && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Última carga</span>
                      <p>{new Date(resumo.ultima_carga_em).toLocaleString("pt-BR")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {controleSelId && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-semibold">Adicionar carga</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPalletDialogOpen(true)}
                className="w-full justify-start gap-2"
              >
                <Search className="h-4 w-4" />
                {palletEscolhido ? `Pallet: ${textoOuTraco(palletEscolhido.codigo_pallet)}` : "Buscar pallet..."}
              </Button>

              {palletEscolhido && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsável *</Label>
                    <Input
                      value={responsavel}
                      onChange={(e) => setResponsavel(e.target.value)}
                      placeholder="Nome do conferente"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>NF saída (opcional)</Label>
                    <Input
                      value={nfSaida}
                      onChange={(e) => setNfSaida(e.target.value)}
                      placeholder="Ex: NF-SAIDA-001"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observação</Label>
                    <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="button" size="sm" disabled={submitting} onClick={registrarCarga} className="gap-2">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Registrar carga
                    </Button>
                  </div>
                </div>
              )}

              {msg && <p className={`text-xs ${msg.ok ? "text-green-600" : "text-destructive"}`}>{msg.texto}</p>}
            </div>
          )}

          {controleSelId && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pallets carregados</p>
              {loadingCargas ? (
                <p className="text-xs text-muted-foreground">Carregando cargas...</p>
              ) : cargas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma carga registrada neste caminhão.</p>
              ) : (
                <div className="divide-y rounded-md border">
                  {cargas.map((c) => (
                    <div key={c.id} className="p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-semibold">{textoOuTraco(c.codigo_pallet)}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Qtd: {numFmt(c.quantidade)}
                        </Badge>
                        {c.numero_op && (
                          <Badge variant="outline" className="text-[10px]">
                            OP: {c.numero_op}
                          </Badge>
                        )}
                        {c.nf_saida_numero && (
                          <Badge variant="outline" className="text-[10px]">
                            NF: {c.nf_saida_numero}
                          </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Ref: {textoOuTraco(c.codigo_referencia)} • SD: {textoOuTraco(c.numero_sd)} • Local:{" "}
                        {textoOuTraco(c.local_origem_codigo)} • Resp: {textoOuTraco(c.responsavel)}
                      </p>
                      {c.observacao && <p className="mt-0.5 text-[11px]">Obs: {c.observacao}</p>}
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        {String(controleSel?.placa ?? "").trim() || "Caminhão selecionado"} carregou{" "}
                        {numFmt(c.quantidade)} unidades do pallet {textoOuTraco(c.codigo_pallet)}
                        {c.numero_op ? ` vinculado à OP ${c.numero_op}` : ""}.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PalletSearchDialog
        open={palletDialogOpen}
        onOpenChange={setPalletDialogOpen}
        onSelect={(p) => {
          setPalletEscolhido(p);
          setMsg(null);
        }}
        title="Buscar pallet para adicionar à carga"
      />
    </>
  );
}

// ─── Busca e cadastro de veículo ───────────────────────────
interface VeiculoRow {
  id: string;
  placa: string | null;
  tipo_veiculo: string | null;
  transportadora: string | null;
  motorista: string | null;
  ativo: boolean | null;
}

function VeiculoBuscaCard({ onControleCriado }: { onControleCriado: (id: string) => void }) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<VeiculoRow[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [veiculoSel, setVeiculoSel] = useState<VeiculoRow | null>(null);
  const [buscou, setBuscou] = useState(false);

  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novoPlaca, setNovoPlaca] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [novoTransportadora, setNovoTransportadora] = useState("");
  const [novoMotorista, setNovoMotorista] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [respBusca, setRespBusca] = useState("");
  const [obsBusca, setObsBusca] = useState("");
  const [criandoControle, setCriandoControle] = useState(false);
  const [controleAtual, setControleAtual] = useState<{
    id: string;
    placa: string | null;
    motorista: string | null;
    status: string | null;
    created_at: string | null;
  } | null>(null);

  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const buscar = useCallback(async () => {
    const t = String(termo ?? "").trim();
    setBuscando(true);
    setBuscou(true);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      let q = sb.from("veiculos").select("*").limit(30);
      if (t) {
        const like = `%${t.replace(/[,%()]/g, " ")}%`;
        q = q.or(`placa.ilike.${like},motorista.ilike.${like},transportadora.ilike.${like},tipo_veiculo.ilike.${like}`);
      }
      const { data } = await q;
      setResultados((data ?? []) as VeiculoRow[]);
    } finally {
      setBuscando(false);
    }
  }, [termo]);

  const salvarNovo = async () => {
    if (!novoPlaca.trim() || !novoTransportadora.trim() || !novoMotorista.trim()) {
      setMsg({ ok: false, texto: "Placa, transportadora e motorista são obrigatórios." });
      return;
    }
    setSalvandoNovo(true);
    setMsg(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from("veiculos")
        .insert({
          placa: novoPlaca.trim().toUpperCase(),
          tipo_veiculo: novoTipo.trim() || null,
          transportadora: novoTransportadora.trim(),
          motorista: novoMotorista.trim(),
          ativo: true,
        })
        .select("*")
        .single();
      if (error) {
        setMsg({ ok: false, texto: error.message });
        return;
      }
      setVeiculoSel(data as VeiculoRow);
      setMostrarNovo(false);
      setNovoPlaca("");
      setNovoTipo("");
      setNovoTransportadora("");
      setNovoMotorista("");
      setMsg({ ok: true, texto: "Veículo cadastrado." });
    } finally {
      setSalvandoNovo(false);
    }
  };

  const criarControle = async () => {
    if (!veiculoSel) return;
    if (!respBusca.trim()) {
      setMsg({ ok: false, texto: "Responsável pela conferência é obrigatório." });
      return;
    }
    setCriandoControle(true);
    setMsg(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from("controle_veiculos")
        .insert({
          veiculo_id: veiculoSel.id,
          placa: veiculoSel.placa,
          motorista: veiculoSel.motorista,
          transportadora: veiculoSel.transportadora,
          tipo_veiculo: veiculoSel.tipo_veiculo,
          responsavel_conferencia: respBusca.trim(),
          status_aprovacao: "pendente",
          observacao: obsBusca.trim() || null,
        })
        .select("id, placa, motorista, status_aprovacao, created_at")
        .single();
      if (error) {
        setMsg({ ok: false, texto: error.message });
        return;
      }
      const c = data as {
        id: string;
        placa: string | null;
        motorista: string | null;
        status_aprovacao: string | null;
        created_at: string | null;
      };
      setControleAtual({
        id: c.id,
        placa: c.placa,
        motorista: c.motorista,
        status: c.status_aprovacao,
        created_at: c.created_at,
      });
      onControleCriado(c.id);
      setMsg({ ok: true, texto: "Novo carregamento criado. Registre as cargas abaixo." });
    } finally {
      setCriandoControle(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-muted-foreground" />
          Buscar veículo / caminhão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder="Placa, motorista, transportadora ou tipo..."
          />
          <Button type="button" onClick={buscar} disabled={buscando} className="gap-2">
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {veiculoSel && (
          <div className="rounded-md border bg-primary/5 p-3 text-xs">
            <p className="font-semibold">
              Selecionado: <span className="font-mono">{veiculoSel.placa ?? "—"}</span> —{" "}
              {veiculoSel.tipo_veiculo ?? "—"} — {veiculoSel.motorista ?? "—"}
            </p>
            <p className="text-muted-foreground">Transportadora: {veiculoSel.transportadora ?? "—"}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7"
              onClick={() => {
                setVeiculoSel(null);
                setControleAtual(null);
              }}
            >
              Trocar veículo
            </Button>
          </div>
        )}

        {!veiculoSel && (
          <>
            {buscando && <p className="text-xs text-muted-foreground">Buscando...</p>}
            {!buscando && buscou && resultados.length === 0 && (
              <div className="space-y-2 rounded-md border border-dashed p-3 text-xs">
                <p className="text-muted-foreground">Nenhum veículo encontrado.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMostrarNovo(true);
                    setNovoPlaca(termo.trim().toUpperCase());
                  }}
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5" /> Cadastrar novo veículo
                </Button>
              </div>
            )}
            {!buscando && resultados.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {resultados.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVeiculoSel(v)}
                    className="rounded-md border p-3 text-left text-xs hover:bg-muted"
                  >
                    <p className="font-semibold">
                      <span className="font-mono">{v.placa ?? "—"}</span> — {v.tipo_veiculo ?? "—"} —{" "}
                      {v.motorista ?? "—"}
                    </p>
                    <p className="text-muted-foreground">Transportadora: {v.transportadora ?? "—"}</p>
                    <Badge variant={v.ativo ? "outline" : "secondary"} className="mt-1 text-[10px]">
                      {v.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {mostrarNovo && !veiculoSel && (
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-semibold">Cadastrar novo veículo</p>
            <div className="space-y-1.5">
              <Label>Placa *</Label>
              <Input value={novoPlaca} onChange={(e) => setNovoPlaca(e.target.value)} className="font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de veículo</Label>
              <Input
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                placeholder="Caminhão, Carreta, Van..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Transportadora *</Label>
              <Input value={novoTransportadora} onChange={(e) => setNovoTransportadora(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motorista *</Label>
              <Input value={novoMotorista} onChange={(e) => setNovoMotorista(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="button" size="sm" onClick={salvarNovo} disabled={salvandoNovo} className="gap-2">
                {salvandoNovo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Salvar veículo
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarNovo(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {veiculoSel && !controleAtual && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-semibold">Novo carregamento para este caminhão</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Responsável pela conferência *</Label>
                <Input value={respBusca} onChange={(e) => setRespBusca(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Input value={obsBusca} onChange={(e) => setObsBusca(e.target.value)} />
              </div>
            </div>
            <Button type="button" size="sm" onClick={criarControle} disabled={criandoControle} className="gap-2">
              {criandoControle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Novo carregamento para este caminhão
            </Button>
          </div>
        )}

        {controleAtual && (
          <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-xs">
            <p className="font-semibold">
              Carregamento atual: <span className="font-mono">{controleAtual.placa ?? "—"}</span> —{" "}
              {controleAtual.motorista ?? "—"} —{" "}
              {controleAtual.created_at ? new Date(controleAtual.created_at).toLocaleDateString("pt-BR") : "—"} —{" "}
              <Badge variant="outline" className="text-[10px]">
                {controleAtual.status ?? "pendente"}
              </Badge>
            </p>
            <p className="mt-1 text-muted-foreground">
              Utilize a seção "Cargas do caminhão" abaixo para adicionar pallets.
            </p>
          </div>
        )}

        {msg && <p className={`text-xs ${msg.ok ? "text-green-600" : "text-destructive"}`}>{msg.texto}</p>}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_app/veiculos")({
  component: VeiculosPage,
});
