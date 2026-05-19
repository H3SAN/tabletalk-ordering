import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Store, ListOrdered, Activity, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type Overview = {
  total_restaurants: number;
  active_restaurants: number;
  total_branches: number;
  active_branches: number;
  total_tables: number;
  orders_today: number;
  orders_week: number;
};

function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.rpc("platform_overview");
      if (rows && rows.length) setData(rows[0] as Overview);
    })();
  }, []);

  const cards = [
    { label: "Restaurants", value: data?.total_restaurants ?? "—", sub: `${data?.active_restaurants ?? 0} active`, icon: Store },
    { label: "Branches", value: data?.total_branches ?? "—", sub: `${data?.active_branches ?? 0} active`, icon: Building2 },
    { label: "Tables", value: data?.total_tables ?? "—", sub: "across all tenants", icon: ListOrdered },
    { label: "Orders today", value: data?.orders_today ?? "—", sub: `${data?.orders_week ?? 0} this week`, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-sm text-muted-foreground">Real-time health of the OrderFlow AI network.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Activity
          </div>
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
            Charts coming soon
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="text-sm font-semibold">Status</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between"><span>API</span><span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Operational</span></li>
            <li className="flex items-center justify-between"><span>Realtime</span><span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Operational</span></li>
            <li className="flex items-center justify-between"><span>AI Voice</span><span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Operational</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
