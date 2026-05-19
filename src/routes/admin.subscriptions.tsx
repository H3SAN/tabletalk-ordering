import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
});

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  features: string[];
  sort_order: number;
  active: boolean;
  is_default: boolean;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  branch_count: number;
  orders_total: number;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
};

function emptyPlan(): Plan {
  return {
    id: "",
    slug: "",
    name: "",
    description: "",
    price: 0,
    currency: "USD",
    billing_interval: "month",
    features: [],
    sort_order: 0,
    active: true,
    is_default: false,
  };
}

function AdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  async function loadAll() {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.rpc("platform_list_plans"),
      supabase.rpc("platform_list_restaurants"),
    ]);
    setPlans(((p ?? []) as any[]).map((x) => ({ ...x, features: x.features ?? [] })));
    setRestaurants((r ?? []) as Restaurant[]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openEdit(p: Plan | null) {
    const draft = p ? { ...p, features: [...(p.features ?? [])] } : emptyPlan();
    setEditing(draft);
    setFeaturesText((draft.features ?? []).join("\n"));
  }

  async function savePlan() {
    if (!editing) return;
    const features = featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.rpc("platform_upsert_plan", {
      _id: (editing.id || null) as unknown as string,
      _slug: editing.slug.trim().toLowerCase(),
      _name: editing.name.trim(),
      _description: (editing.description ?? "") as string,
      _price: Number(editing.price) || 0,
      _currency: editing.currency || "USD",
      _billing_interval: editing.billing_interval || "month",
      _features: features,
      _sort_order: Number(editing.sort_order) || 0,
      _active: editing.active,
      _is_default: editing.is_default,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plan saved");
    setEditing(null);
    loadAll();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan? Restaurants using it must be reassigned first.")) return;
    const { error } = await supabase.rpc("platform_delete_plan", { _id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plan deleted");
    loadAll();
  }

  async function assignPlan(restaurantId: string, planId: string) {
    const { error } = await supabase.rpc("platform_assign_plan", {
      _restaurant_id: restaurantId,
      _plan_id: planId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plan assigned");
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage plan catalog and what each restaurant is on.
          </p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="assignments">Restaurant assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-1 h-4 w-4" /> New plan
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      {p.is_default && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Default
                        </span>
                      )}
                      {!p.active && (
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">
                      {p.currency} {Number(p.price).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">/{p.billing_interval}</div>
                  </div>
                </div>
                {p.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                )}
                <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                  {(p.features ?? []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deletePlan(p.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Restaurant</th>
                  <th className="px-4 py-3 text-left">Current plan</th>
                  <th className="px-4 py-3 text-left">Change to</th>
                  <th className="px-4 py-3 text-right">Branches</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-left">Since</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {r.plan_name ?? "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={r.plan_id ?? undefined}
                        onValueChange={(v) => assignPlan(r.id, v)}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans
                            .filter((p) => p.active)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} — {p.currency} {Number(p.price).toFixed(0)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.branch_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.orders_total}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit plan" : "New plan"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={editing.currency}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Interval</Label>
                  <Select
                    value={editing.billing_interval}
                    onValueChange={(v) => setEditing({ ...editing, billing_interval: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea
                  rows={5}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Up to 5 branches&#10;Kitchen display&#10;Voice ordering"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.is_default}
                    onCheckedChange={(v) => setEditing({ ...editing, is_default: v })}
                  />
                  <Label>Default for new restaurants</Label>
                </div>
                <div className="w-20">
                  <Label className="text-xs">Sort</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={savePlan}>Save plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
