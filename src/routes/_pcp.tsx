import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PcpLayoutShell } from "@/components/pcp-layout-shell";

export const Route = createFileRoute("/_pcp")({
  component: PcpLayout,
});

function PcpLayout() {
  return (
    <PcpLayoutShell>
      <Outlet />
    </PcpLayoutShell>
  );
}
