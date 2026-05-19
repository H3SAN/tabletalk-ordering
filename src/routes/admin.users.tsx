import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_platform_admin: boolean;
  restaurants: Array<{ restaurant_id: string; restaurant_name: string; role: string; active: boolean }>;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    const { data } = await supabase.rpc("platform_list_users", { _q: query });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAdmin(r: Row) {
    const fn = r.is_platform_admin ? "platform_revoke_admin" : "platform_grant_admin";
    const { error } = await supabase.rpc(fn, r.is_platform_admin ? { _user_id: r.user_id } : { _user_id: r.user_id, _note: null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(r.is_platform_admin ? "Admin access revoked" : "Granted platform admin");
    load(q);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Every signed-up user. Toggle OrderFlow AI staff access.</p>
        </div>
        <form
          className="relative w-full sm:w-72"
          onSubmit={(e) => { e.preventDefault(); load(q); }}
        >
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email…" className="pl-8" />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Restaurants</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Last sign-in</th>
              <th className="px-4 py-3 text-right">Platform admin</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {r.email}
                    {r.is_platform_admin && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Staff</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.restaurants.length === 0 ? "—" : r.restaurants.map((m) => `${m.restaurant_name} (${m.role})`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={r.is_platform_admin ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleAdmin(r)}
                    >
                      {r.is_platform_admin ? (<><ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Revoke</>) : (<><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Grant</>)}
                    </Button>
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