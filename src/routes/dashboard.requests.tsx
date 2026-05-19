import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Req = {
  id: string;
  type: string;
  status: "pending" | "acknowledged" | "completed";
  table_id: string;
  branch_id: string;
  created_at: string;
  table_number?: string;
  branch_name?: string;
};

export const Route = createFileRoute("/dashboard/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const { restaurantId, branches } = useRestaurantContext();
  const [reqs, setReqs] = useState<Req[]>([]);

  async function load() {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("service_requests")
      .select("id, type, status, table_id, branch_id, created_at")
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: true });
    const tableIds = Array.from(new Set((data ?? []).map((r) => r.table_id)));
    const tableMap: Record<string, string> = {};
    if (tableIds.length) {
      const { data: ts } = await supabase
        .from("tables")
        .select("id, table_number")
        .in("id", tableIds);
      (ts ?? []).forEach((t) => (tableMap[t.id] = t.table_number));
    }
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
    setReqs(
      (data ?? []).map((r) => ({
        ...r,
        table_number: tableMap[r.table_id],
        branch_name: branchMap[r.branch_id],
      })) as Req[],
    );
  }

  useEffect(() => {
    load();
  }, [restaurantId, branches]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`requests-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_requests",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, branches]);

  async function setStatus(r: Req, status: "acknowledged" | "completed") {
    const ts = new Date().toISOString();
    const update =
      status === "acknowledged"
        ? { status, acknowledged_at: ts }
        : { status, completed_at: ts };
    const { error } = await supabase.from("service_requests").update(update).eq("id", r.id);
    if (error) toast.error(error.message);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Service requests</h1>
      <div className="space-y-3">
        {reqs.map((r) => {
          const ageMin = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000);
          return (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-semibold capitalize">{r.type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    Table {r.table_number} · {r.branch_name} · {ageMin === 0 ? "just now" : `${ageMin}m`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "pending" ? "destructive" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "acknowledged")}>
                      Acknowledge
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setStatus(r, "completed")}>
                    Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {reqs.length === 0 && <p className="text-sm text-muted-foreground">No open requests.</p>}
      </div>
    </div>
  );
}