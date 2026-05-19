import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/restaurants")({
  component: AdminRestaurants,
});

type Row = {
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

function AdminRestaurants() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("platform_list_restaurants");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.slug.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restaurants</h1>
          <p className="text-sm text-muted-foreground">All tenants on OrderFlow AI.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or slug…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Restaurant</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Branches</th>
              <th className="px-4 py-3 text-right">Tables</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No restaurants yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                  onClick={() => navigate({ to: "/admin/restaurants/$id", params: { id: r.id } })}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md text-xs font-semibold text-white"
                        style={{ background: r.primary_color || "#0EA5E9" }}
                      >
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.name} className="h-full w-full object-cover" />
                        ) : (
                          r.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${r.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {r.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.branch_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.table_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.orders_total}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
