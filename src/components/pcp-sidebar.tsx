import { useRouterState, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  Route as RouteIcon,
  FileText,
  Warehouse,
  History,
  BarChart3,
  Package,
  Menu,
  ChevronLeft,
  Sun,
  Moon,
} from "lucide-react";
import { UserProfileBar } from "@/components/user-profile-bar";

const mainNav = [
  { title: "Dashboard PCP", href: "/pcp", icon: LayoutDashboard, exact: true },
  { title: "Estruturas (BOM)", href: "/pcp/estruturas", icon: Boxes },
  { title: "Roteiros", href: "/pcp/roteiros", icon: RouteIcon },
  { title: "Ordens de Produção", href: "/pcp/ops", icon: FileText },
  { title: "Consulta de Saldo", href: "/pcp/saldos", icon: Warehouse },
  { title: "Histórico", href: "/historico", icon: History },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
];

export function PcpSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCollapse = useCallback(() => setCollapsed((p) => !p), []);
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const isDark = mounted ? (resolvedTheme ?? theme) === "dark" : true;

  const isActive = (item: (typeof mainNav)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebarContent = (
    <aside
      data-sidebar="root"
      className={cn(
        "fixed top-0 left-0 z-30 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <Package className="h-5 w-5 shrink-0 text-blue-500" />
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Special Decor PCP
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <UserProfileBar />
        <div className="h-2" />
        <button
          onClick={toggleTheme}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Alternar tema" : undefined}
        >
          {mounted ? (
            isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && <span>{isDark ? "Modo claro" : "Modo escuro"}</span>}
        </button>
        {!collapsed && (
          <p className="mt-1 px-3 text-[10px] text-sidebar-foreground/40">
            Módulo PCP v1.0
          </p>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{sidebarContent}</div>

      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-2 left-3 z-50 rounded-md bg-sidebar p-2 text-sidebar-foreground shadow-md"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/60" onClick={closeMobile} />
            <div className="absolute inset-y-0 left-0 w-60 animate-in slide-in-from-left bg-sidebar shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-bold">Special Decor PCP</span>
                </div>
                <button
                  onClick={closeMobile}
                  className="rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  aria-label="Fechar menu"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border p-3">
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  {mounted ? (
                    isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                  ) : (
                    <span className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
