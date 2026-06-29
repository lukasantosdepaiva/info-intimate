import { AlertTriangle } from "lucide-react";

export function TestBanner() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Ambiente de teste. Não inserir dados reais, pessoais ou sigilosos.
      </span>
    </div>
  );
}
