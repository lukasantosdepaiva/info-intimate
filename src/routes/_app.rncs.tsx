import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { AlertCircle } from "lucide-react";

function RncsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RNCs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de não conformidades.
        </p>
      </div>
      <EmptyState
        icon={AlertCircle}
        title="Módulo em construção"
        description="As RNCs serão implementadas na próxima etapa."
      />
    </div>
  );
}


export const Route = createFileRoute("/_app/rncs")({
  component: RncsPage,
});
