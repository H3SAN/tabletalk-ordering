import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/session";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  station: "kitchen" | "bar" | "dessert";
};
type Modifier = { id: string; menu_item_id: string; name: string; price_delta: number };

export const Route = createFileRoute("/dashboard/menu")({
  component: MenuPage,
});

function MenuPage() {
  const { restaurantId, loading } = useRestaurantContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [catName, setCatName] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [item, setItem] = useState({
    name: "",
    description: "",
    price: "0.00",
    category_id: "",
    station: "kitchen" as "kitchen" | "bar" | "dessert",
  });
  const [modOpen, setModOpen] = useState<string | null>(null);
  const [modName, setModName] = useState("");
  const [modPrice, setModPrice] = useState("0.00");

  async function refresh(rid: string) {
    const [cats, its, mods] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", rid).order("sort_order"),
      supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("sort_order"),
      supabase.from("modifiers").select("*").eq("restaurant_id", rid),
    ]);
    setCategories((cats.data ?? []) as Category[]);
    setItems((its.data ?? []) as Item[]);
    setModifiers((mods.data ?? []) as Modifier[]);
  }

  useEffect(() => {
    if (restaurantId) refresh(restaurantId);
  }, [restaurantId]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const { error } = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name: catName, sort_order: categories.length });
    if (error) return toast.error(error.message);
    setCatName("");
    setCatOpen(false);
    refresh(restaurantId);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price) || 0,
      station: item.station,
    });
    if (error) return toast.error(error.message);
    setItem({ name: "", description: "", price: "0.00", category_id: "", station: "kitchen" });
    setItemOpen(false);
    refresh(restaurantId);
    toast.success("Item added");
  }

  async function toggleAvailable(it: Item) {
    await supabase.from("menu_items").update({ available: !it.available }).eq("id", it.id);
    if (restaurantId) refresh(restaurantId);
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    if (restaurantId) refresh(restaurantId);
  }

  async function addModifier(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !modOpen) return;
    const { error } = await supabase.from("modifiers").insert({
      restaurant_id: restaurantId,
      menu_item_id: modOpen,
      name: modName,
      price_delta: parseFloat(modPrice) || 0,
    });
    if (error) return toast.error(error.message);
    setModName("");
    setModPrice("0.00");
    refresh(restaurantId);
  }

  async function deleteModifier(id: string) {
    if (!restaurantId) return;
    await supabase.from("modifiers").delete().eq("id", id);
    refresh(restaurantId);
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-1 h-4 w-4" /> Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add category</DialogTitle>
              </DialogHeader>
              <form onSubmit={addCategory} className="space-y-3">
                <Input
                  required
                  placeholder="e.g. Starters"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <DialogFooter>
                  <Button type="submit">Add</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={itemOpen} onOpenChange={setItemOpen}>
            <DialogTrigger asChild>
              <Button disabled={categories.length === 0}>
                <Plus className="mr-1 h-4 w-4" /> Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add menu item</DialogTitle>
              </DialogHeader>
              <form onSubmit={addItem} className="space-y-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={item.category_id}
                    onValueChange={(v) => setItem({ ...item, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    required
                    value={item.name}
                    onChange={(e) => setItem({ ...item, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => setItem({ ...item, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={item.price}
                      onChange={(e) => setItem({ ...item, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Station</Label>
                    <Select
                      value={item.station}
                      onValueChange={(v: "kitchen" | "bar" | "dessert") =>
                        setItem({ ...item, station: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!item.category_id}>
                    Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((c) => (
          <div key={c.id}>
            <h2 className="mb-2 text-lg font-semibold">{c.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items
                .filter((i) => i.category_id === c.id)
                .map((i) => {
                  const itemMods = modifiers.filter((m) => m.menu_item_id === i.id);
                  return (
                    <Card key={i.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{i.name}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${formatPrice(i.price)}</div>
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {i.station}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Switch
                              checked={i.available}
                              onCheckedChange={() => toggleAvailable(i)}
                            />
                            {i.available ? "Available" : "Unavailable"}
                          </Label>
                          <Button size="sm" variant="ghost" onClick={() => deleteItem(i.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="rounded border p-2">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Modifiers
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setModOpen(modOpen === i.id ? null : i.id)}
                            >
                              {modOpen === i.id ? "Close" : "Add"}
                            </Button>
                          </div>
                          {itemMods.length === 0 && (
                            <p className="text-xs text-muted-foreground">No modifiers</p>
                          )}
                          <ul className="space-y-1">
                            {itemMods.map((m) => (
                              <li key={m.id} className="flex items-center justify-between text-sm">
                                <span>
                                  {m.name}{" "}
                                  {m.price_delta != 0 && (
                                    <span className="text-muted-foreground">
                                      ({m.price_delta > 0 ? "+" : ""}${formatPrice(m.price_delta)})
                                    </span>
                                  )}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteModifier(m.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                          {modOpen === i.id && (
                            <form onSubmit={addModifier} className="mt-2 flex gap-1">
                              <Input
                                placeholder="Name"
                                value={modName}
                                onChange={(e) => setModName(e.target.value)}
                                required
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={modPrice}
                                onChange={(e) => setModPrice(e.target.value)}
                                className="w-20"
                              />
                              <Button size="sm" type="submit">
                                +
                              </Button>
                            </form>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Create a category to start building your menu.
          </p>
        )}
      </div>
    </div>
  );
}