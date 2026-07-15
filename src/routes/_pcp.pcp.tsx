import { createFileRoute, Outlet } from "@tanstack/react-router";

function PcpLayout() {
  return (
    <div className="mx-auto max-w-7xl">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_pcp/pcp")({
  component: PcpLayout,
});
