import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChefHat, Clock, Soup, Utensils, Bell } from "lucide-react";
import { formatPrice, getCustomerSessionId } from "@/lib/session";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { toast } from "sonner";

type Order = {
  id: string;
  order_number: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
  created_at: string;
  notes: string | null;
  table_id: string;
  customer_name?: string | null;
};
type Item = {
  id: string;
  item_name_snapshot: string;
  quantity: number;
  unit_price: number;
  selected_modifiers: Array<{ name: string; price_delta: number }>;
  special_instructions: string | null;
  station_status?: string;
  station?: string;
};

const STEPS: Array<{ key: Order["status"]; label: string; icon: typeof Check }> = [
  { key: "pending", label: "Received", icon: Clock },
  { key: "accepted", label: "Accepted", icon: Check },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready!", icon: Utensils },
];

export const Route = createFileRoute("/t/$qrToken/order/$orderId")({
  head: () => ({ meta: [{ title: "Tracking your order — TableTap" }] }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { qrToken, orderId } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<{
    restaurant_id: string;
    branch_id: string;
    table_id: string;
    restaurant_name: string;
    primary_color: string | null;
  } | null>(null);
  const prevStatus = useRef<string | null>(null);

  async function load() {
    const { data: o } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at, notes, table_id, customer_name")
      .eq("id", orderId)
      .maybeSingle();
    if (o) setOrder(o as Order);
    const { data: its } = await supabase
      .from("order_items")
      .select("id, item_name_snapshot, quantity, unit_price, selected_modifiers, special_instructions, station, station_status")
      .eq("order_id", orderId);
    setItems(
      (its ?? []).map((it) => ({
        ...it,
        selected_modifiers: Array.isArray(it.selected_modifiers)
          ? (it.selected_modifiers as Item["selected_modifiers"])
          : [],
      })) as Item[],
    );
  }

  useEffect(() => {
    load();
  }, [orderId]);

  // Ask for browser-notification permission once when the page mounts so
  // that customers can get alerted even if the tab is in the background.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      // fire and forget; user can decline
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Resolve restaurant brand for this QR token (for tenant-correct styling).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .rpc("get_restaurant_by_qr", { _qr_token: qrToken })
        .maybeSingle();
      if (data) {
        const d = data as {
          restaurant_id: string;
          branch_id: string;
          table_id: string;
          restaurant_name: string;
          primary_color: string | null;
        };
        setMeta(d);
      }
    })();
  }, [qrToken]);

  // Realtime + ready notification
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const next = payload.new as Order;
          setOrder(next);
          if (prevStatus.current !== "ready" && next.status === "ready") {
            try {
              if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
            } catch {
              // ignore
            }
            // Browser notification (works even if tab is backgrounded)
            try {
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                const n = new Notification(
                  `Order #${next.order_number} is ready! 🍽️`,
                  {
                    body: meta?.restaurant_name
                      ? `Your order at ${meta.restaurant_name} is ready.`
                      : "Your order is ready to be picked up.",
                    tag: `order-${next.id}`,
                    icon: meta?.primary_color ? undefined : undefined,
                  },
                );
                n.onclick = () => { window.focus(); n.close(); };
              }
            } catch {
              // ignore
            }
            try {
              const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.frequency.value = 880;
              g.gain.setValueAtTime(0.2, ctx.currentTime);
              o.start();
              setTimeout(() => {
                o.frequency.value = 660;
              }, 200);
              setTimeout(() => o.stop(), 600);
            } catch {
              // ignore
            }
          }
          prevStatus.current = next.status;
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (order) prevStatus.current = order.status;
  }, [order]);

  if (!order) return <div className="p-8 text-center text-muted-foreground">Loading order…</div>;

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const total = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const isReady = order.status === "ready";
  const progressPct = Math.min(100, ((stepIndex + 1) / STEPS.length) * 100);

  async function callWaiter() {
    if (!meta) return;
    const { error } = await supabase.from("service_requests").insert({
      restaurant_id: meta.restaurant_id,
      branch_id: meta.branch_id,
      table_id: meta.table_id,
      customer_session_id: getCustomerSessionId(qrToken),
      type: "call_waiter",
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Waiter notified");
  }

  return (
    <BrandProvider
      restaurant={{
        primary_color: meta?.primary_color,
        name: meta?.restaurant_name,
      }}
    >
    <div className="min-h-screen bg-background p-4 pb-28">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Order</p>
          <h1 className="text-3xl font-bold text-brand">#{order.order_number}</h1>
          {meta?.restaurant_name && (
            <p className="text-xs text-muted-foreground">{meta.restaurant_name}</p>
          )}
        </div>

        {isReady && (
          <Card className="border-green-500 bg-green-50 animate-lift-in">
            <CardContent className="flex items-center gap-3 p-4">
              <Soup className="h-8 w-8 text-green-700" />
              <div>
                <div className="font-semibold text-green-900">Your order is ready!</div>
                <div className="text-sm text-green-700">Staff will bring it to your table.</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="card-brand">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: "var(--brand-primary)",
                }}
              />
            </div>
            <ol className="space-y-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const reached = i <= stepIndex;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={
                        reached
                          ? { backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }
                          : undefined
                      }
                    >
                      <Icon className={"h-4 w-4 " + (reached ? "" : "text-muted-foreground")} />
                    </span>
                    <span className={reached ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
                    {i === stepIndex && !isReady && <Badge variant="secondary">Now</Badge>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="card-brand">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium">
                    {i.quantity}× {i.item_name_snapshot}
                  </div>
                  {i.selected_modifiers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      + {i.selected_modifiers.map((m) => m.name).join(", ")}
                    </div>
                  )}
                  {i.special_instructions && (
                    <div className="text-xs italic text-muted-foreground">"{i.special_instructions}"</div>
                  )}
                  {i.station_status && (
                    <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                      {i.station_status}
                    </Badge>
                  )}
                </div>
                <div className="text-sm">${formatPrice(Number(i.unit_price) * i.quantity)}</div>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-semibold">
              <span>Total</span>
              <span>${formatPrice(total)}</span>
            </div>
          </CardContent>
        </Card>

        {order.notes && (
          <Card>
            <CardContent className="p-4 text-sm">
              <span className="font-medium">Note: </span>
              {order.notes}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={callWaiter} disabled={!meta}>
            <Bell className="mr-1 h-4 w-4" /> Need help?
          </Button>
          <Button asChild className="btn-brand">
            <Link to="/t/$qrToken" params={{ qrToken }}>
              Order more
            </Link>
          </Button>
        </div>
      </div>
    </div>
    </BrandProvider>
  );
}