import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  LayoutDashboard,
  Building2,
  TableProperties,
  UtensilsCrossed,
  Users,
  ChefHat,
  Bell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RestaurantContext = {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  logo_url: string | null;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TableTap" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("get_my_restaurant_context");
      if (error || !data || data.length === 0) {
        navigate({ to: "/onboarding" });
        return;
      }
      const ctx = data[0];
      setRestaurant({
        id: ctx.restaurant_id,
        name: ctx.name,
        slug: ctx.slug,
        primary_color: ctx.primary_color,
        logo_url: ctx.logo_url,
      });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (authLoading || loading || !restaurant) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  const navItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/dashboard/branches", label: "Branches", icon: Building2 },
    { to: "/dashboard/tables", label: "Tables & QR", icon: TableProperties },
    { to: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/dashboard/staff", label: "Staff", icon: Users },
    { to: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat },
    { to: "/dashboard/requests", label: "Requests", icon: Bell },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <span className="font-bold">TableTap</span>
            <span className="ml-2 text-sm text-muted-foreground">· {restaurant.name}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <div className="container mx-auto flex flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/dashboard"}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}