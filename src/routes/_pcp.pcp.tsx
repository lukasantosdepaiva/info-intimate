import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageGuard } from "@/components/page-guard";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Boxes, Route as RouteIcon, FileText, Warehouse } from "lucide-react";

const TABS: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/pcp", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/pcp/estruturas", label: "Estruturas (BOM)", icon: Boxes },
  { to: "/pcp/roteiros", label: "Roteiros", icon: RouteIcon },
  { to: "/pcp/ops", label: "Ordens de Produção", icon: FileText },
  { to: "/pcp/saldos", label: "Consulta de Saldo", icon: Warehouse },
];

function PcpLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageGuard>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border-b">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
        <Outlet />
      </div>
    </PageGuard>
  );
}

export const Route = createFileRoute("/_pcp/pcp")({
  component: PcpLayout,
});
