import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  QrCode,
  Eye,
  History,
  Printer,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PalletRow {
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

function PalletsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pagina, setPagina] = useState(0);
  const TAMANHO_PAGINA = 50;

  const fetchPallets = useCallback(async (busca: string, pag: number) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const inicio = pag * TAMANHO_PAGINA;
      const fim = inicio + TAMANHO_PAGINA - 1;

      let query = supabase
        .from("vw_pallet_resumo")
        .select("*")
        .order("codigo_pallet", { ascending: false })
        .range(inicio, fim);

      if (busca.trim().length >= 2) {
        const termo = busca.trim();
        query = query.or(
          `codigo_pallet.ilike.%${termo}%,` +
          `nf_entrada.ilike.%${termo}%,` +
          `referencia.ilike.%${termo}%,` +
          `sd.ilike.%${termo}%,` +
          `cliente.ilike.%${termo}%,` +
          `fornecedor.ilike.%${termo}%`
        );
      }

      const { data: rows, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setData((rows as PalletRow[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar pallets.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(0);
      fetchPallets(search, 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchPallets]);

  useEffect(() => {
    fetchPallets(search, pagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, fetchPallets]);

  const statusVariant = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Ativo: "default",
      Movimentando: "secondary",
      Inspecao: "outline",
      RNC: "destructive",
      Finalizado: "outline",
      "Em Estoque": "default",
    };
    return map[s] ?? "secondary";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pallets</h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Erro ao carregar pallets</h2>
            <p className="max-w-md text-xs text-muted-foreground font-mono">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPallets}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pallets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} pallet{filtered.length !== 1 ? "s" : ""}{" "}
            encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/scanner">
              <QrCode className="h-4 w-4" />
              Escanear pallet
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPallets}
            aria-label="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Busca local */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, NF, referência, SD..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <QrCode className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum pallet encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {search.trim()
                ? "Nenhum pallet corresponde à busca."
                : "Os pallets serão listados aqui conforme forem cadastrados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Código</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Qtd Inicial</th>
                <th className="p-3 text-right">Qtd Atual</th>
                <th className="p-3">NF Entrada</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Referência</th>
                <th className="p-3">SD</th>
                <th className="p-3">Locais</th>
                <th className="p-3 text-right">Criado em</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.codigo_pallet}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="p-3 font-mono font-semibold">
                    {p.codigo_pallet}
                  </td>
                  <td className="p-3">
                    <Badge variant={statusVariant(p.status)} className="text-[10px]">
                      {p.status ?? "—"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {p.qtd_inicial?.toLocaleString("pt-BR") ?? "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold">
                    {p.qtd_atual?.toLocaleString("pt-BR") ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{p.nf_entrada ?? "—"}</td>
                  <td className="p-3">{p.cliente ?? "—"}</td>
                  <td className="p-3">{p.fornecedor ?? "—"}</td>
                  <td className="p-3">{p.referencia ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{p.sd ?? "—"}</td>
                  <td className="p-3 text-xs">{p.locais_saldos ?? "—"}</td>
                  <td className="p-3 text-right text-xs tabular-nums text-muted-foreground">
                    {p.criado_em
                      ? new Date(p.criado_em).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver detalhe"
                        onClick={() =>
                          navigate({ to: `/pallets/${p.codigo_pallet}` })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver histórico"
                        onClick={() =>
                          navigate({ to: `/historico?pallet=${encodeURIComponent(p.codigo_pallet)}` })
                        }
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Imprimir ficha"
                        onClick={() =>
                          navigate({ to: `/pallets/${p.codigo_pallet}?print=1` })
                        }
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}


export const Route = createFileRoute("/_app/pallets/")({
  component: PalletsPage,
});
