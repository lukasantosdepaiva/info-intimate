import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { Search, Loader2, QrCode, History, Truck, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "pallet" | "historico" | "veiculo" | "op";
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const res: SearchResult[] = [];

      // Pallets
      const { data: pallets } = await supabase
        .from("vw_pallet_resumo")
        .select("codigo_pallet, referencia, sd")
        .or(
          `codigo_pallet.ilike.%${q}%,referencia.ilike.%${q}%,sd.ilike.%${q}%`
        )
        .limit(5);

      if (pallets) {
        pallets.forEach((p: { codigo_pallet: string; referencia: string; sd: string }) => {
          res.push({
            type: "pallet",
            title: p.codigo_pallet,
            subtitle: `${p.referencia ?? ""} — SD ${p.sd ?? ""}`,
            href: `/pallets/${p.codigo_pallet}`,
          });
        });
      }

      // Histórico
      const { data: historico } = await supabase
        .from("vw_historico_completo")
        .select("id, codigo_pallet, nf_entrada, op, referencia, sd")
        .or(
          `codigo_pallet.ilike.%${q}%,nf_entrada.ilike.%${q}%,referencia.ilike.%${q}%,sd.ilike.%${q}%`
        )
        .limit(5);

      if (historico) {
        historico.forEach((h: { id: number; codigo_pallet: string; nf_entrada: string; op: string }) => {
          res.push({
            type: "historico",
            title: h.codigo_pallet ?? h.nf_entrada ?? `#${h.id}`,
            subtitle: "Evento no histórico",
            href: `/historico?pallet=${encodeURIComponent(h.codigo_pallet ?? "")}`,
          });
        });
      }

      // Veículos por placa
      const { data: veiculos } = await supabase
        .from("veiculos")
        .select("placa, tipo_veiculo, transportadora")
        .ilike("placa", `%${q}%`)
        .limit(5);

      if (veiculos) {
        veiculos.forEach((v: { placa: string; tipo_veiculo: string; transportadora: string }) => {
          res.push({
            type: "veiculo",
            title: v.placa,
            subtitle: `${v.tipo_veiculo ?? ""} — ${v.transportadora ?? ""}`,
            href: `/veiculos`,
          });
        });
      }

      // OPs
      const { data: ops } = await supabase
        .from("ops_pcp")
        .select("numero_op, produto_final, status_op")
        .ilike("numero_op", `%${q}%`)
        .limit(5);

      if (ops) {
        ops.forEach((o: { numero_op: string; produto_final: string; status_op: string }) => {
          res.push({
            type: "op",
            title: o.numero_op,
            subtitle: `${o.produto_final ?? ""} — ${o.status_op ?? ""}`,
            href: `/pcp`,
          });
        });
      }

      // Deduplicate by href
      const seen = new Set<string>();
      const unique = res.filter((r) => {
        if (seen.has(r.href)) return false;
        seen.add(r.href);
        return true;
      });

      setResults(unique.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const iconForType = (type: string) => {
    switch (type) {
      case "pallet":
        return <QrCode className="h-3.5 w-3.5" />;
      case "historico":
        return <History className="h-3.5 w-3.5" />;
      case "veiculo":
        return <Truck className="h-3.5 w-3.5" />;
      case "op":
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <Search className="h-3.5 w-3.5" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "pallet": return "Pallet";
      case "historico": return "Histórico";
      case "veiculo": return "Veículo";
      case "op": return "OP";
      default: return type;
    }
  };

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar pallet, NF, OP, SD..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-9 pl-10 pr-4 text-xs"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden rounded border border-border px-1.5 text-[10px] text-muted-foreground sm:inline">
          Ctrl+K
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          )}

          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Nenhum resultado encontrado.
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar.
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-[300px] overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={`${r.type}-${i}`}>
                  <button
                    onClick={() => {
                      navigate({ to: r.href });
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                      {iconForType(r.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {r.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {typeLabel(r.type)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
