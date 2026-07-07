"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Loader2, Search, Package, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PalletSearchResult {
  pallet_id: string;
  codigo_pallet: string | null;
  status: string | null;
  numero_sd: string | null;
  codigo_referencia: string | null;
  referencia_descricao: string | null;
  quantidade_atual: number | string | null;
  quantidade_inicial?: number | string | null;
  locais_e_saldos: string | null;
  ops_vinculadas: string | null;
  nf_entrada: string | null;
  cliente: string | null;
  fornecedor: string | null;
  created_at?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pallet: PalletSearchResult) => void;
  title?: string;
}

const textoExibicao = (valor: unknown, fallback = "—") => {
  const t = String(valor ?? "").trim();
  return t || fallback;
};
const numeroExibicao = (valor: unknown) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR") : "0";
};
const escaparOr = (v: string) => v.replace(/[,%()]/g, " ").trim();

export function PalletSearchDialog({ open, onOpenChange, onSelect, title = "Buscar Pallet" }: Props) {
  const [termo, setTermo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<PalletSearchResult[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (q: string) => {
    setLoading(true);
    setErro(null);
    try {
      const supabase = getSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const t = escaparOr(q);
      let query = sb.from("vw_busca_geral_pallets").select("*").limit(50);
      if (t) {
        query = query.or(
          [
            `codigo_pallet.ilike.%${t}%`,
            `numero_sd.ilike.%${t}%`,
            `codigo_referencia.ilike.%${t}%`,
            `referencia_descricao.ilike.%${t}%`,
            `nf_entrada.ilike.%${t}%`,
            `cliente.ilike.%${t}%`,
            `fornecedor.ilike.%${t}%`,
            `ops_vinculadas.ilike.%${t}%`,
            `texto_busca.ilike.%${t}%`,
          ].join(","),
        );
      } else {
        query = query.order("created_at", { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      setResultados((data ?? []) as PalletSearchResult[]);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar pallets.");
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => carregar(termo), 250);
    return () => clearTimeout(timer);
  }, [open, termo, carregar]);

  useEffect(() => {
    if (open) {
      setTermo("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pesquise por código, SD, OP, NF, cliente, fornecedor, referência, descrição ou local.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Digite para filtrar ou deixe em branco para ver os mais recentes..."
            className="pl-10"
          />
          {termo && (
            <button
              type="button"
              onClick={() => setTermo("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {erro && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {erro}
          </p>
        )}

        <div className="max-h-[55vh] overflow-y-auto rounded-md border">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          )}
          {!loading && resultados.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhum pallet encontrado.
            </p>
          )}
          {!loading &&
            resultados.map((p) => (
              <button
                key={p.pallet_id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onOpenChange(false);
                }}
                className="flex w-full flex-col gap-1 border-b px-3 py-3 text-left text-xs transition-colors last:border-b-0 hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-sm font-semibold">
                    {textoExibicao(p.codigo_pallet)}
                  </span>
                  {p.status && (
                    <Badge variant="outline" className="text-[10px]">
                      {textoExibicao(p.status)}
                    </Badge>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Qtd atual: <strong>{numeroExibicao(p.quantidade_atual)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {p.numero_sd && <span>SD: <span className="font-mono">{p.numero_sd}</span></span>}
                  {p.codigo_referencia && (
                    <span>Ref: <span className="font-mono">{p.codigo_referencia}</span></span>
                  )}
                  {p.referencia_descricao && (
                    <span className="col-span-2 truncate">{p.referencia_descricao}</span>
                  )}
                  {p.nf_entrada && <span>NF: {p.nf_entrada}</span>}
                  {p.cliente && <span className="truncate">Cliente: {p.cliente}</span>}
                  {p.ops_vinculadas && (
                    <span className="col-span-2 truncate">OPs: {p.ops_vinculadas}</span>
                  )}
                  {p.locais_e_saldos && (
                    <span className="col-span-2 truncate">Locais: {p.locais_e_saldos}</span>
                  )}
                </div>
              </button>
            ))}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
