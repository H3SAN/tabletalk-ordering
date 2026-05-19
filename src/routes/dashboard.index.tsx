import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableProperties, UtensilsCrossed, ChefHat, Bell, Copy, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tables: 0, items: 0, openOrders: 0, openRequests: 0 });
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [plan, setPlan] = useState<{
    name: string;
    description: string | null;
    price: number;
    currency: string;
    billing_interval: string;
    features: string[];
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("get_my_plan");
      const row = (data as any[])?.[0];
      if (row) {
        setPlan({
          name: row.name,
          description: row.description,
          price: Number(row.price),
          currency: row.currency,
          billing_interval: row.billing_interval,
          features: row.features ?? [],
        });
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase
        .from("restaurants")
        .select("id, slug")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      const rid = r?.id;
      if (r?.slug) setRestaurantSlug(r.slug);
      if (!rid) {
        const { data: staff } = await supabase
          .from("staff_users")
          .select("restaurant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!staff) return;
        await loadStats(staff.restaurant_id);
        const { data: r2 } = await supabase
          .from("restaurants")
          .select("slug")
          .eq("id", staff.restaurant_id)
          .maybeSingle();
        if (r2?.slug) setRestaurantSlug(r2.slug);
      } else {
        await loadStats(rid);
      }
    })();

    async function loadStats(rid: string) {
      const [tables, items, openOrders, openRequests] = await Promise.all([
        supabase.from("tables").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid)
          .in("status", ["pending", "accepted", "preparing"]),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid)
          .in("status", ["pending", "acknowledged"]),
      ]);
      setStats({
        tables: tables.count ?? 0,
        items: items.count ?? 0,
        openOrders: openOrders.count ?? 0,
        openRequests: openRequests.count ?? 0,
      });
    }
  }, [user]);

  const cards = [
    { label: "Tables", value: stats.tables, icon: TableProperties },
    { label: "Menu items", value: stats.items, icon: UtensilsCrossed },
    { label: "Open orders", value: stats.openOrders, icon: ChefHat },
    { label: "Open requests", value: stats.openRequests, icon: Bell },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-muted-foreground">Here's a snapshot of your restaurant.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{c.label}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{c.value}</CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </div>

      {restaurantSlug && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Public landing page</CardTitle>
            <CardDescription>
              Share this link (or post it at the entrance) so guests can pick a branch and table without scanning a QR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/r/${restaurantSlug}`}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/r/${restaurantSlug}`);
                  toast.success("Link copied");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/r/${restaurantSlug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" /> Open
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}