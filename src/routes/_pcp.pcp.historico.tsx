import { createFileRoute } from "@tanstack/react-router";
import { HistoricoPage } from "@/routes/_app.historico";

function PcpHistoricoPage() {
  const search = Route.useSearch() as Record<string, string>;
  return <HistoricoPage initialPallet={search.pallet ?? ""} />;
}

export const Route = createFileRoute("/_pcp/pcp/historico")({
  component: PcpHistoricoPage,
});
