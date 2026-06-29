import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayoutShell } from "@/components/app-layout-shell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppLayoutShell>
      <Outlet />
    </AppLayoutShell>
  );
}
