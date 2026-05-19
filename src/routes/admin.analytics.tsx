import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

type Growth = { day: string; new_restaurants: number; new_branches: number; new_orders: number };
type Revenue = { day: string; orders_count: number; revenue: number };
type Top = { id: string; name: string; slug: string; orders_week: number; primary_color: string | null; logo_url: string | null };

function AdminAnalytics() {
  const [growth, setGrowth] = useState<Growth[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [top, setTop] = useState<Top[]>([]);

  useEffect(() => {
    (async () => {
      const [g, r, t] = await Promise.all([
        supabase.rpc("platform_growth_stats"),
        supabase.rpc("platform_revenue_stats"),
        supabase.rpc("platform_top_restaurants", { _limit: 10 }),
      ]);
      setGrowth((g.data ?? []) as Growth[]);
      setRevenue((r.data ?? []) as Revenue[]);
      setTop((t.data ?? []) as Top[]);
    })();
  }, []);

  const fmtDay = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Growth and order volume across all tenants.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="New restaurants (30d)" subtitle={`${growth.reduce((s, d) => s + Number(d.new_restaurants || 0), 0)} new`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth.map((d) => ({ ...d, day: fmtDay(d.day) }))}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="new_restaurants" stroke="hsl(var(--primary))" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders (30d)" subtitle={`${growth.reduce((s, d) => s + Number(d.new_orders || 0), 0)} total`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth.map((d) => ({ ...d, day: fmtDay(d.day) }))}>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="new_orders" stroke="hsl(var(--accent))" fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Estimated GMV (30d)" subtitle={`$${revenue.reduce((s, d) => s + Number(d.revenue || 0), 0).toFixed(2)} total`}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenue.map((d) => ({ ...d, day: fmtDay(d.day), revenue: Number(d.revenue) }))}>
            <defs>
              <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#g3)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Top restaurants (last 7 days)</h3>
        <div className="mt-4 divide-y divide-border/60">
          {top.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data yet.</div>
          ) : (
            top.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  <span
                    className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md text-[10px] font-semibold text-white"
                    style={{ background: r.primary_color || "#0EA5E9" }}
                  >
                    {r.logo_url ? <img src={r.logo_url} alt="" className="h-full w-full object-cover" /> : r.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-medium">{r.name}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{r.orders_week} orders</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}