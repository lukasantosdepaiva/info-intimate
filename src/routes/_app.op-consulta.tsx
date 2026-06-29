import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

function OpConsultaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OP / Consulta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta de ordens de produção criadas pela PCP.
        </p>
      </div>
      <EmptyState
        icon={FileText}
        title="Em construção"
        description="A consulta de OP será implementada na próxima etapa."
      />
    </div>
  );
}


export const Route = createFileRoute("/_app/op-consulta")({
  component: OpConsultaPage,
});
