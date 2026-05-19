import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupport,
});

type Row = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  restaurant_id: string;
  restaurant_name: string;
  branch_id: string;
  branch_name: string;
  table_id: string;
  table_number: string;
};

function AdminSupport() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const { data } = await supabase.rpc("platform_recent_service_requests", { _limit: 100 });
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("platform-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const labels: Record<string, string> = {
    call_waiter: "Call waiter",
    need_assistance: "Need assistance",
    request_bill: "Request bill",
    table_help: "Table help",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support feed</h1>
        <p className="text-sm text-muted-foreground">Live cross-tenant service requests. Updates in real time.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Restaurant</th>
              <th className="px-4 py-3 text-left">Branch / Table</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  No service requests yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{labels[r.type] ?? r.type}</td>
                  <td className="px-4 py-3">{r.restaurant_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.branch_name} · Table {r.table_number}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : r.status === "acknowledged" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}