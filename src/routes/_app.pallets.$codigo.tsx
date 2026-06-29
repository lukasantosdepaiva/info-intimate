import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  QrCode,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Printer,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";

interface PalletDetail {
  codigo_pallet: string;
  status: string;
  qtd_inicial: number;
  qtd_atual: number;
  nf_entrada: string;
  cliente: string;
  fornecedor: string;
  referencia: string;
  sd: string;
  locais_saldos: string;
  criado_em: string;
}

function PalletDetailPage() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const codigo = params.codigo as string;

  const [data, setData] = useState<PalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: rows, error: dbError } = await supabase
        .from("vw_pallet_resumo")
        .select("*")
        .eq("codigo_pallet", codigo)
        .limit(1);

      if (dbError) throw new Error(dbError.message);
      if (rows && rows.length > 0) {
        setData(rows[0] as PalletDetail);
      } else {
        setData(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar detalhe.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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

  const qrUrl = `/pallets/${codigo}`;

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/pallets">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Pallets
        </Link>
      </Button>

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
            <div className="rounded-lg border-2 border-border p-4">
              <QrCode className="h-32 w-32 text-foreground" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Escaneie para acessar rapidamente este pallet no sistema.
            </p>
            <p className="text-center font-mono text-[11px] text-muted-foreground">
              {qrUrl}
            </p>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={`/pallets/${codigo}?print=1`}>
                <Printer className="h-4 w-4" />
                Imprimir ficha
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Links de ação */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/historico?pallet=${encodeURIComponent(codigo)}`}>
            <History className="mr-2 h-4 w-4" />
            Ver histórico do pallet
          </Link>
        </Button>
        <Button variant="outline" size="sm" disabled>
          Solicitar movimentação
        </Button>
        <Button variant="outline" size="sm" disabled>
          Registrar saída
        </Button>
        <span className="text-[11px] text-muted-foreground self-center">
          Será implementado na próxima etapa
        </span>
      </div>
    </div>
  );
}


export const Route = createFileRoute("/_app/pallets/$codigo")({
  component: PalletDetailPage,
});
