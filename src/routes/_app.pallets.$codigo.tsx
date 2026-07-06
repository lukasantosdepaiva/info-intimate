import { createFileRoute } from "@tanstack/react-router";
import { QRCodeCanvas } from "qrcode.react";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  QrCode,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Printer,
  History,
  ArrowRightLeft,
  PackageMinus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";

interface PalletDetail {
  codigo_pallet: string;
  status: string;
  qtd_inicial: number | null;
  qtd_atual: number | null;
  nf_entrada: string | null;
  cliente: string | null;
  fornecedor: string | null;
  referencia: string | null;
  sd: string | null;
  locais_saldos: string | null;
  criado_em: string | null;
}

const textoExibicao = (valor: unknown, fallback = "—") => {
  const texto = String(valor ?? "").trim();
  return texto || fallback;
};
const numeroExibicao = (valor: unknown, fallback = "—") => {
  if (valor === null || valor === undefined || valor === "") return fallback;
  const n = Number(valor);
  if (!Number.isFinite(n)) return fallback;
  return n.toLocaleString("pt-BR");
};

async function fetchFallback(
  codigo: string,
): Promise<Partial<PalletDetail> | null> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: pallet } = await sb
    .from("pallets")
    .select("*")
    .eq("codigo_pallet", codigo)
    .maybeSingle();
  if (!pallet) return null;

  const [refRes, sdRes, nfRes, saldosRes] = await Promise.all([
    pallet.referencia_id
      ? sb.from("referencias").select("codigo_referencia, descricao").eq("id", pallet.referencia_id).maybeSingle()
      : Promise.resolve({ data: null }),
    pallet.sd_id
      ? sb.from("sds").select("numero_sd").eq("id", pallet.sd_id).maybeSingle()
      : Promise.resolve({ data: null }),
    pallet.nf_entrada_id
      ? sb
          .from("nfs_entrada")
          .select("numero_nf, cliente_id, fornecedor_id")
          .eq("id", pallet.nf_entrada_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb
      .from("saldos_pallet")
      .select("quantidade, locais_estoque(codigo_local, descricao)")
      .eq("pallet_id", pallet.id),
  ]);

  let cliente: string | null = null;
  let fornecedor: string | null = null;
  const nf = nfRes?.data;
  if (nf?.cliente_id) {
    const { data: c } = await sb.from("clientes").select("nome").eq("id", nf.cliente_id).maybeSingle();
    cliente = c?.nome ?? null;
  }
  if (nf?.fornecedor_id) {
    const { data: f } = await sb.from("fornecedores").select("nome").eq("id", nf.fornecedor_id).maybeSingle();
    fornecedor = f?.nome ?? null;
  }

  const saldos = (saldosRes?.data ?? []) as Array<{
    quantidade: number;
    locais_estoque:
      | { codigo_local: string; descricao: string }
      | { codigo_local: string; descricao: string }[]
      | null;
  }>;
  const qtdAtual = saldos.reduce((acc, s) => acc + Number(s.quantidade ?? 0), 0);
  const locaisSaldos = saldos
    .map((s) => {
      const loc = Array.isArray(s.locais_estoque) ? s.locais_estoque[0] : s.locais_estoque;
      const cod = loc?.codigo_local ?? "";
      return `${cod}: ${Number(s.quantidade ?? 0).toLocaleString("pt-BR")}`;
    })
    .join(" | ");

  const ref = refRes?.data;
  const referenciaTexto = ref
    ? [ref.codigo_referencia, ref.descricao].filter(Boolean).join(" — ")
    : null;

  return {
    codigo_pallet: pallet.codigo_pallet,
    status: pallet.status,
    qtd_inicial: pallet.quantidade_inicial ?? pallet.qtd_inicial ?? null,
    qtd_atual: saldos.length > 0 ? qtdAtual : null,
    nf_entrada: nf?.numero_nf ?? null,
    cliente,
    fornecedor,
    referencia: referenciaTexto,
    sd: sdRes?.data?.numero_sd ?? null,
    locais_saldos: locaisSaldos || null,
    criado_em: pallet.created_at ?? pallet.criado_em ?? null,
  };
}

function PalletDetailPage() {
  const params = Route.useParams();
  const codigo = params.codigo as string;

  const [data, setData] = useState<PalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: viewRow, error: dbError } = await supabase
        .from("vw_pallet_resumo")
        .select("*")
        .eq("codigo_pallet", codigo)
        .maybeSingle();

      console.log("pallet detalhe (view)", viewRow);
      if (dbError) console.log("erro pallet detalhe (view)", dbError);

      const base = (viewRow as PalletDetail | null) ?? null;

      const precisaFallback =
        !base ||
        base.qtd_inicial == null ||
        base.referencia == null ||
        base.criado_em == null ||
        base.qtd_atual == null;

      let merged: PalletDetail | null = base;
      if (precisaFallback) {
        const fb = await fetchFallback(codigo);
        console.log("pallet detalhe (fallback)", fb);
        if (fb) {
          merged = {
            codigo_pallet: base?.codigo_pallet ?? fb.codigo_pallet ?? codigo,
            status: base?.status ?? fb.status ?? "",
            qtd_inicial: base?.qtd_inicial ?? fb.qtd_inicial ?? null,
            qtd_atual: base?.qtd_atual ?? fb.qtd_atual ?? null,
            nf_entrada: base?.nf_entrada ?? fb.nf_entrada ?? null,
            cliente: base?.cliente ?? fb.cliente ?? null,
            fornecedor: base?.fornecedor ?? fb.fornecedor ?? null,
            referencia: base?.referencia ?? fb.referencia ?? null,
            sd: base?.sd ?? fb.sd ?? null,
            locais_saldos: base?.locais_saldos ?? fb.locais_saldos ?? null,
            criado_em: base?.criado_em ?? fb.criado_em ?? null,
          };
        }
      }

      setData(merged);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar detalhe.";
      console.log("erro pallet detalhe", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const qrValue = baseUrl ? `${baseUrl}/pallets/${codigo}` : `/pallets/${codigo}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDetail}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pallets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <QrCode className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Pallet não encontrado</h3>
            <p className="text-sm text-muted-foreground">
              O código <span className="font-mono">{codigo}</span> não foi
              encontrado no sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print CSS: hide navigation/buttons when printing */}
      <style media="print">{`
        @page { margin: 12mm; }
        [data-sidebar="root"], .print\\:hidden { display: none !important; }
        body { background: white !important; }
      `}</style>

      {/* Voltar */}
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pallets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Pallets
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data.codigo_pallet}</h1>
        <Badge variant={data.status === "Ativo" ? "default" : "secondary"} className="mt-1">
          {data.status ?? "—"}
        </Badge>
      </div>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dados principais */}
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informações do Pallet</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">NF de Entrada</dt>
                <dd className="font-mono font-semibold">{data.nf_entrada ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cliente</dt>
                <dd>{data.cliente ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fornecedor</dt>
                <dd>{data.fornecedor ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Referência</dt>
                <dd>{data.referencia ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SD</dt>
                <dd className="font-mono">{data.sd ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Criado em</dt>
                <dd>
                  {data.criado_em
                    ? new Date(data.criado_em).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quantidade Inicial</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {data.qtd_inicial?.toLocaleString("pt-BR") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quantidade Atual</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {data.qtd_atual?.toLocaleString("pt-BR") ?? "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Locais e Saldos</dt>
                <dd className="text-xs">{data.locais_saldos ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-lg border-2 border-border bg-white p-4">
              <QRCodeCanvas
                value={qrValue}
                size={160}
                level="M"
                marginSize={2}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Escaneie para acessar rapidamente este pallet no sistema.
            </p>
            <p className="text-center font-mono text-[11px] text-muted-foreground break-all">
              {qrValue}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 print:hidden"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimir ficha
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Links de ação */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link to="/historico" search={{ pallet: codigo }}>
            <History className="mr-2 h-4 w-4" />
            Ver histórico do pallet
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/movimentacoes" search={{ pallet: codigo }}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Solicitar movimentação
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/saidas" search={{ pallet: codigo }}>
            <PackageMinus className="mr-2 h-4 w-4" />
            Registrar saída
          </Link>
        </Button>
      </div>
    </div>
  );
}


export const Route = createFileRoute("/_app/pallets/$codigo")({
  component: PalletDetailPage,
});
