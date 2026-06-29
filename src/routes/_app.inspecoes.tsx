import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { Search } from "lucide-react";

function InspecoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inspeções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de inspeção de pallets.
        </p>
      </div>
      <EmptyState
        icon={Search}
        title="Módulo em construção"
        description="As inspeções serão implementadas na próxima etapa."
      />
    </div>
  );
}


export const Route = createFileRoute("/_app/inspecoes")({
  component: InspecoesPage,
});
