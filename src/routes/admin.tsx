import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Store,
  CreditCard,
  BarChart3,
  Users,
  LifeBuoy,
  Settings,
  Mic,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Platform Admin — OrderFlow AI" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const isLoginRoute = location.pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) return;
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("is_platform_admin", { _user_id: user.id });
      if (error) {
        setAllowed(false);
        return;
      }
      setAllowed(Boolean(data));
    })();
  }, [user?.id, authLoading, navigate, isLoginRoute]);

  if (isLoginRoute) {
    return <Outlet />;
  }

  if (authLoading || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Platform admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account isn’t a platform admin. Ask an existing admin to grant you access.
          </p>
          <Button asChild className="mt-5 bg-primary hover:bg-primary/90">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/restaurants", label: "Restaurants", icon: Store },
    { to: "/admin/branches", label: "Branches", icon: Building2 },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/support", label: "Support", icon: LifeBuoy },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/20 text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30">
            <Mic className="h-4 w-4 text-white" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">OrderFlow AI</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Super-admin</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Platform
            </span>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
