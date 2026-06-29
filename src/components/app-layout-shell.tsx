import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { TestBanner } from "@/components/test-banner";
import { GlobalSearch } from "@/components/global-search";
import { PageGuard } from "@/components/page-guard";
export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // ALL hooks called unconditionally at the top — NEVER after if/return
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const checkSidebar = useCallback(() => {
    const el = document.querySelector('[data-sidebar="root"]');
    if (el) {
      const w = el.clientWidth;
      setSidebarCollapsed(w < 100);
    }
  }, []);

  useEffect(() => {
    checkSidebar();
    const obs = new ResizeObserver(checkSidebar);
    const el = document.querySelector('[data-sidebar="root"]');
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [checkSidebar]);

  const isPublicRoute = pathname === "/login";

  // Public route — renderiza children limpo (sem sidebar, sem banner, sem busca)
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <TestBanner />
      <div className="flex min-h-[calc(100vh-32px)]">
        <AppSidebar />
        <main
          className="flex-1 bg-background p-4 transition-all duration-200 ease-in-out md:p-6"
          style={{ marginLeft: sidebarCollapsed ? "4rem" : "15rem" }}
        >
          {/* Top bar with search on mobile */}
          <div className="mb-4 flex items-center justify-end md:hidden">
            <GlobalSearch />
          </div>
          {/* Desktop search */}
          <div className="mb-4 hidden items-center justify-end md:flex">
            <GlobalSearch />
          </div>
          <PageGuard>{children}</PageGuard>
        </main>
      </div>
    </>
  );
}
