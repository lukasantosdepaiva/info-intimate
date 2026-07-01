import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface LocalRow {
  id: string;
  codigo_local: string;
  armazem_codigo: string;
  armazem_nome: string;
  galpao: string;
  rua: string;
  processo: string | null;
  descricao: string;
}

const textoSeguro = (v: unknown) => String(v ?? "").toLowerCase();
const textoExibicao = (v: unknown, fallback = "—") => {
  const t = String(v ?? "").trim();
  return t || fallback;
};

interface QuickLocal {
  local: LocalRow;
  quantidade?: number;
}

interface Props {
  locais: LocalRow[];
  value: LocalRow | null;
  onChange: (l: LocalRow | null) => void;
  /** Restringir a estes códigos de armazém (ex.: ["05"]). */
  armazensPermitidos?: string[];
  /** Locais com saldo (para exibir como atalhos, ex.: saldo do pallet). */
  atalhos?: QuickLocal[];
  atalhosLabel?: string;
  emptyLabel?: string;
}

export function LocalCascadeSelector({
  locais,
  value,
  onChange,
  armazensPermitidos,
  atalhos,
  atalhosLabel = "Locais com saldo deste pallet",
  emptyLabel = "Nenhum local disponível.",
}: Props) {
  const locaisPermitidos = useMemo(() => {
    if (!armazensPermitidos || armazensPermitidos.length === 0) return locais;
    const set = new Set(armazensPermitidos.map((c) => c.trim().toLowerCase()));
    return locais.filter((l) => {
      const cod = textoSeguro(l.armazem_codigo);
      if (set.has(cod)) return true;
      // fallback: prefixo do codigo_local (ex.: "05-...")
      const prefixo = textoSeguro(l.codigo_local).split("-")[0] ?? "";
      return set.has(prefixo);
    });
  }, [locais, armazensPermitidos]);

  const [armazem, setArmazem] = useState<string | null>(null);
  const [galpao, setGalpao] = useState<string | null>(null);

  // Sincroniza etapas se value externo mudar
  useEffect(() => {
    if (value) {
      setArmazem(value.armazem_codigo || null);
      setGalpao(value.galpao || null);
    }
  }, [value]);

  const armazens = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of locaisPermitidos) {
      const cod = String(l.armazem_codigo ?? "").trim();
      if (!cod) continue;
      if (!map.has(cod)) map.set(cod, textoExibicao(l.armazem_nome, cod));
    }
    return Array.from(map.entries())
      .map(([codigo, nome]) => ({ codigo, nome }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [locaisPermitidos]);

  const galpoes = useMemo(() => {
    if (!armazem) return [];
    const set = new Set<string>();
    for (const l of locaisPermitidos) {
      if (l.armazem_codigo !== armazem) continue;
      const g = String(l.galpao ?? "").trim();
      if (g) set.add(g);
    }
    return Array.from(set).sort();
  }, [locaisPermitidos, armazem]);

  const ruas = useMemo(() => {
    if (!armazem || !galpao) return [];
    return locaisPermitidos
      .filter((l) => l.armazem_codigo === armazem && l.galpao === galpao)
      .sort((a, b) =>
        String(a.rua ?? "").localeCompare(String(b.rua ?? ""))
      );
  }, [locaisPermitidos, armazem, galpao]);

  const trocar = () => {
    onChange(null);
    setArmazem(null);
    setGalpao(null);
  };

  // Selecionado — resumo compacto
  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 rounded-md border bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <div className="text-xs">
              <p className="font-mono font-semibold">
                {textoExibicao(value.codigo_local)}
              </p>
              <p className="text-muted-foreground">
                {textoExibicao(value.armazem_nome)} ·{" "}
                {textoExibicao(value.galpao)} · {textoExibicao(value.rua)}
                {value.descricao ? ` — ${value.descricao}` : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={trocar}
          >
            Trocar local
          </Button>
        </div>
      </div>
    );
  }

  if (locaisPermitidos.length === 0) {
    return (
      <p className="rounded-md border px-3 py-4 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {atalhos && atalhos.length > 0 && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">{atalhosLabel}</p>
          <div className="flex flex-wrap gap-2">
            {atalhos.map(({ local, quantidade }) => (
              <button
                key={local.id}
                type="button"
                onClick={() => onChange(local)}
                className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-mono hover:bg-primary/10"
              >
                <MapPin className="h-3 w-3" />
                {textoExibicao(local.codigo_local)}
                {typeof quantidade === "number" && quantidade > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {quantidade.toLocaleString("pt-BR")}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          1. Escolha o armazém
        </p>
        <div className="flex flex-wrap gap-2">
          {armazens.map((a) => {
            const active = armazem === a.codigo;
            return (
              <button
                key={a.codigo}
                type="button"
                onClick={() => {
                  setArmazem(a.codigo);
                  setGalpao(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                {a.codigo}
                <span className="ml-1 opacity-70">— {a.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {armazem && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            2. Escolha o galpão
          </p>
          <div className="flex flex-wrap gap-2">
            {galpoes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum galpão neste armazém.
              </p>
            )}
            {galpoes.map((g) => {
              const active = galpao === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGalpao(g)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {armazem && galpao && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            3. Escolha a rua / área
          </p>
          <div className="flex flex-wrap gap-2">
            {ruas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma rua/área neste galpão.
              </p>
            )}
            {ruas.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onChange(l)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                title={l.descricao || undefined}
              >
                <span className="font-mono">{textoExibicao(l.rua)}</span>
                {l.descricao && (
                  <span className="ml-1 text-muted-foreground">
                    — {l.descricao}
                  </span>
                )}
                {l.processo && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-[10px]"
                  >
                    {l.processo}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
