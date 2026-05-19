import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Power } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/restaurants/$id")({
  component: RestaurantDetail,
});

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  primary_color: string | null;
  logo_url: string | null;
  created_at: string;
  branch_count: number;
  table_count: number;
  orders_total: number;
};

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
  table_count: number;
  orders_total: number;
  restaurant_id: string;
};

function RestaurantDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [r, setR] = useState<Restaurant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  async function load() {
    const [{ data: list }, { data: bs }] = await Promise.all([
      supabase.rpc("platform_list_restaurants"),
      supabase.rpc("platform_list_branches"),
    ]);
    const found = ((list ?? []) as Restaurant[]).find((x) => x.id === id) ?? null;
    setR(found);
    setBranches(((bs ?? []) as Branch[]).filter((b) => b.restaurant_id === id));
  }

  useEffect(() => { load(); }, [id]);

  async function toggleActive() {
    if (!r) return;
    const { error } = await supabase.rpc("platform_toggle_restaurant_active", {
      _restaurant_id: r.id,
      _active: !r.active,
    });
    if (error) return toast.error(error.message);
    toast.success(r.active ? "Restaurant suspended" : "Restaurant reactivated");
    load();
  }

  if (!r) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate({ to: "/admin/restaurants" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to restaurants
      </button>

      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white"
            style={{ background: r.primary_color || "#0EA5E9" }}
          >
            {r.logo_url ? <img src={r.logo_url} alt="" className="h-full w-full object-cover" /> : r.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{r.name}</h1>
            <p className="text-sm text-muted-foreground">/{r.slug} · created {new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-semibold ${r.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
            {r.active ? "Active" : "Suspended"}
          </span>
          <Button variant={r.active ? "destructive" : "default"} size="sm" onClick={toggleActive}>
            <Power className="mr-1.5 h-4 w-4" />
            {r.active ? "Suspend" : "Reactivate"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Branches" value={r.branch_count} />
        <Stat label="Tables" value={r.table_count} />
        <Stat label="Total orders" value={r.orders_total} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 px-5 py-3 text-sm font-semibold">Branches</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-right">Tables</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-left">Public</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No branches.</td></tr>
            ) : branches.map((b) => (
              <tr key={b.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.address ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{b.table_count}</td>
                <td className="px-4 py-3 text-right tabular-nums">{b.orders_total}</td>
                <td className="px-4 py-3">
                  <Link
                    to="/r/$restaurantSlug/$branchSlug"
                    params={{ restaurantSlug: r.slug, branchSlug: b.slug }}
                    className="text-primary hover:underline"
                  >
                    Open ↗
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}