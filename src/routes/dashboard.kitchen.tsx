import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/session";
import { toast } from "sonner";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { useEffect as useEffectAlias, useRef } from "react";

type Order = {
  id: string;
  order_number: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
  branch_id: string;
  table_id: string;
  notes: string | null;
  created_at: string;
  table_number?: string;
  items: Array<{
    id: string;
    item_name_snapshot: string;
    quantity: number;
    unit_price: number;
    selected_modifiers: Array<{ name: string; price_delta: number }>;
    special_instructions: string | null;
    station: "kitchen" | "bar" | "dessert";
    station_status: string;
  }>;
};

const STATUS_NEXT: Record<string, Order["status"] | null> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
  cancelled: null,
};

export const Route = createFileRoute("/dashboard/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const { restaurantId, branches } = useRestaurantContext();
  const [branchId, setBranchId] = useState<string>("all");
  const [station, setStation] = useState<"all" | "kitchen" | "bar" | "dessert">("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Record<string, string>>({});
  const knownIds = useRef<Set<string>>(new Set());
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffectAlias(() => {
    const next = new Set<string>();
    for (const o of orders) {
      if (!knownIds.current.has(o.id)) next.add(o.id);
      knownIds.current.add(o.id);
    }
    if (next.size > 0) {
      setHighlightIds(next);
      const t = setTimeout(() => setHighlightIds(new Set()), 3500);
      return () => clearTimeout(t);
    }
  }, [orders]);

  async function load() {
    if (!restaurantId) return;
    let q = supabase
      .from("orders")
      .select(
        "id, order_number, status, branch_id, table_id, notes, created_at, order_items(id, item_name_snapshot, quantity, unit_price, selected_modifiers, special_instructions, station, station_status)",
      )
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (branchId !== "all") q = q.eq("branch_id", branchId);
    const { data } = await q;
    const tableIds = Array.from(new Set((data ?? []).map((o) => o.table_id)));
    let tableMap: Record<string, string> = {};
    if (tableIds.length > 0) {
      const { data: ts } = await supabase
        .from("tables")
        .select("id, table_number")
        .in("id", tableIds);
      tableMap = Object.fromEntries((ts ?? []).map((t) => [t.id, t.table_number]));
    }
    setTables(tableMap);
    setOrders(
      (data ?? []).map((o) => ({
        ...o,
        items: (o.order_items ?? []).map((it) => ({
          ...it,
          selected_modifiers: Array.isArray(it.selected_modifiers)
            ? (it.selected_modifiers as Order["items"][number]["selected_modifiers"])
            : [],
        })),
      })) as Order[],
    );
  }

  useEffect(() => {
    load();
  }, [restaurantId, branchId]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, branchId]);

  const filtered = useMemo(() => {
    if (station === "all") return orders;
    return orders
      .map((o) => ({ ...o, items: o.items.filter((i) => i.station === station) }))
      .filter((o) => o.items.length > 0);
  }, [orders, station]);

  async function advance(o: Order) {
    const next = STATUS_NEXT[o.status];
    if (!next) return;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", o.id);
    if (error) toast.error(error.message);
    // When the order flips to "ready", notify the customer via WhatsApp
    // (in-page + browser push are handled on the customer's tracking page).
    if (!error && next === "ready") {
      supabase.functions
        .invoke("notify-order-ready", { body: { orderId: o.id } })
        .then(({ data, error: fnErr }) => {
          if (fnErr) {
            console.warn("notify-order-ready failed", fnErr);
            return;
          }
          const r = data as { sent?: boolean; skipped?: boolean; reason?: string } | null;
          if (r?.sent) toast.success("Customer notified on WhatsApp");
          else if (r?.skipped && r.reason) console.info("WhatsApp skipped:", r.reason);
        })
        .catch((e) => console.warn("notify-order-ready threw", e));
    }
  }

  return (
    <BrandProvider restaurant={null}>
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kitchen</h1>
        <div className="flex items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={station} onValueChange={(v) => setStation(v as typeof station)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All stations</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
          <TabsTrigger value="bar">Bar</TabsTrigger>
          <TabsTrigger value="dessert">Dessert</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((o) => {
          const ageMin = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
          return (
            <Card
              key={o.id}
              className={"border-l-4 " + (highlightIds.has(o.id) ? "animate-new-order" : "")}
              style={{ borderLeftColor: statusColor(o.status) }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    #{o.order_number} · Table {tables[o.table_id] ?? "—"}
                  </CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {o.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ageMin === 0 ? "Just now" : `${ageMin} min ago`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="border-b pb-2 last:border-0">
                      <div className="flex justify-between font-medium">
                        <span>
                          {i.quantity}× {i.item_name_snapshot}
                        </span>
                        <Badge variant="secondary" className="capitalize">
                          {i.station}
                        </Badge>
                      </div>
                      {i.selected_modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          + {i.selected_modifiers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                      {i.special_instructions && (
                        <div className="mt-1 text-xs italic text-amber-700">
                          Note: {i.special_instructions}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        ${formatPrice(Number(i.unit_price) * i.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <div className="rounded bg-amber-50 p-2 text-xs">Order note: {o.notes}</div>
                )}
                {STATUS_NEXT[o.status] && (
                  <Button className="w-full capitalize" onClick={() => advance(o)}>
                    Mark {STATUS_NEXT[o.status]}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No active orders.</p>
        )}
      </div>
    </div>
    </BrandProvider>
  );
}

function statusColor(s: string) {
  return (
    {
      pending: "#f59e0b",
      accepted: "#3b82f6",
      preparing: "#8b5cf6",
      ready: "#10b981",
      served: "#6b7280",
      cancelled: "#ef4444",
    }[s] ?? "#6b7280"
  );
}