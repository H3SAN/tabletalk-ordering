import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/branches")({
  component: AdminBranches,
});

type Row = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
  created_at: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  table_count: number;
  orders_total: number;
};

function AdminBranches() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("platform_list_branches");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    [r.name, r.restaurant_name, r.address ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">Every branch across the OrderFlow AI network.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search branches…" className="pl-8" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left">Restaurant</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Tables</th>
              <th className="px-4 py-3 text-right">Orders</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No branches.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    <Link to="/admin/restaurants/$id" params={{ id: r.restaurant_id }} className="text-primary hover:underline">
                      {r.restaurant_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.address ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${r.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {r.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.table_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.orders_total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}