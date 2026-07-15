import { createFileRoute } from "@tanstack/react-router";
import { RelatoriosPage } from "@/routes/_app.relatorios";

export const Route = createFileRoute("/_pcp/pcp/relatorios")({
  component: RelatoriosPage,
});
