import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, ShoppingCart, Bell, Receipt, HandHelping, Mic, MicOff, Loader2, Sparkles, Home, Search } from "lucide-react";
import { getCustomerSessionId, formatPrice } from "@/lib/session";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { VoiceMicButton } from "@/components/customer/VoiceMicButton";
import { AssistantChat } from "@/components/customer/AssistantChat";

type Mod = { id: string; name: string; price_delta: number };
type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  station: "kitchen" | "bar" | "dessert";
  modifiers: Mod[];
};
type Cat = { id: string; name: string; sort_order: number };
type Resolved = {
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_number: string;
  restaurant_name: string;
  restaurant_slug: string;
  branch_slug: string;
  logo_url: string | null;
  primary_color: string | null;
};
type CartLine = {
  key: string;
  item: Item;
  quantity: number;
  selectedMods: Mod[];
  instructions: string;
};

export const Route = createFileRoute("/t/$qrToken")({
  head: () => ({ meta: [{ title: "Order — TableTap" }] }),
  component: CustomerOrderPage,
});

function CustomerOrderPage() {
  const { qrToken } = Route.useParams();
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState<string>("");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findResults, setFindResults] = useState<Array<{
    order_id: string;
    order_number: number;
    status: string;
    customer_name: string;
    created_at: string;
    total: number;
  }> | null>(null);
  const [findLoading, setFindLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [chosenMods, setChosenMods] = useState<string[]>([]);
  const [chosenInstructions, setChosenInstructions] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voicePreview, setVoicePreview] = useState<{
    items: { menu_item_id: string; quantity: number; modifier_ids?: string[]; special_instructions?: string }[];
    unmatched: string[];
  } | null>(null);
  const voice = useSpeechRecognition();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const sessionId = useMemo(() => getCustomerSessionId(qrToken), [qrToken]);

  // Restore previously-typed name/whatsapp for this QR (so repeat orders are zero-friction)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCustomerName(localStorage.getItem(`cust_name_${qrToken}`) ?? "");
    setCustomerWhatsapp(localStorage.getItem(`cust_wa_${qrToken}`) ?? "");
  }, [qrToken]);

  useEffect(() => {
    (async () => {
      const { data: meta, error: metaErr } = await supabase
        .rpc("get_restaurant_by_qr", { _qr_token: qrToken })
        .maybeSingle();
      if (metaErr || !meta) {
        setError("This QR code is not valid.");
        setLoading(false);
        return;
      }
      setResolved(meta as Resolved);
      const { data: menu } = await supabase.rpc("get_menu_for_qr", { _qr_token: qrToken });
      const m = menu as { categories: Cat[]; items: Item[] } | null;
      setCats(m?.categories ?? []);
      setItems(m?.items ?? []);
      setLoading(false);
    })();
  }, [qrToken]);

  function openItem(item: Item) {
    setActiveItem(item);
    setChosenMods([]);
    setChosenInstructions("");
  }

  function addToCart() {
    if (!activeItem) return;
    const mods = activeItem.modifiers.filter((m) => chosenMods.includes(m.id));
    setCart((c) => [
      ...c,
      {
        key: `${activeItem.id}-${Date.now()}`,
        item: activeItem,
        quantity: 1,
        selectedMods: mods,
        instructions: chosenInstructions,
      },
    ]);
    setActiveItem(null);
    toast.success("Added to cart");
  }

  function changeQty(key: string, delta: number) {
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const cartTotal = cart.reduce(
    (sum, l) =>
      sum + (Number(l.item.price) + l.selectedMods.reduce((a, m) => a + Number(m.price_delta), 0)) * l.quantity,
    0,
  );

  async function submitOrder() {
    if (!resolved || cart.length === 0) return;
    const name = customerName.trim();
    const wa = customerWhatsapp.trim();
    if (name.length < 1 || name.length > 80) {
      toast.error("Please enter your name (1–80 characters)");
      return;
    }
    // Lightweight WhatsApp check: digits + optional leading +, 8-20 chars after stripping
    const waDigits = wa.replace(/\D/g, "");
    if (waDigits.length < 8 || waDigits.length > 20) {
      toast.error("Please enter a valid WhatsApp number with country code");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(`cust_name_${qrToken}`, name);
      localStorage.setItem(`cust_wa_${qrToken}`, wa);
    }
    setSubmitting(true);
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: resolved.restaurant_id,
        branch_id: resolved.branch_id,
        table_id: resolved.table_id,
        customer_session_id: sessionId,
        customer_name: name,
        customer_whatsapp: wa,
        notes: orderNote || null,
        status: "pending",
      })
      .select("id")
      .single();
    if (oErr || !order) {
      setSubmitting(false);
      toast.error(oErr?.message ?? "Could not place order");
      return;
    }
    const orderItems = cart.map((l) => ({
      restaurant_id: resolved.restaurant_id,
      branch_id: resolved.branch_id,
      order_id: order.id,
      menu_item_id: l.item.id,
      item_name_snapshot: l.item.name,
      unit_price:
        Number(l.item.price) + l.selectedMods.reduce((a, m) => a + Number(m.price_delta), 0),
      quantity: l.quantity,
      selected_modifiers: l.selectedMods.map((m) => ({ name: m.name, price_delta: m.price_delta })),
      special_instructions: l.instructions || null,
      station: l.item.station,
    }));
    const { error: iErr } = await supabase.from("order_items").insert(orderItems);
    setSubmitting(false);
    if (iErr) {
      toast.error(iErr.message);
      return;
    }
    setCart([]);
    setOrderNote("");
    toast.success("Order placed!");
    navigate({ to: "/t/$qrToken/order/$orderId", params: { qrToken, orderId: order.id } });
  }

  async function runFindOrders() {
    const q = findQuery.trim();
    if (q.length < 2) {
      toast.error("Enter your name or WhatsApp number");
      return;
    }
    setFindLoading(true);
    const { data, error } = await supabase.rpc("find_my_orders", {
      _qr_token: qrToken,
      _query: q,
    });
    setFindLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFindResults((data ?? []) as typeof findResults);
  }

  async function callService(type: "call_waiter" | "request_bill" | "need_assistance" | "table_help") {
    if (!resolved) return;
    const { error } = await supabase.from("service_requests").insert({
      restaurant_id: resolved.restaurant_id,
      branch_id: resolved.branch_id,
      table_id: resolved.table_id,
      customer_session_id: sessionId,
      type,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Request sent to staff");
  }

  async function parseVoice() {
    if (!voice.transcript.trim()) return;
    setVoiceParsing(true);
    setVoicePreview(null);
    const { data, error } = await supabase.functions.invoke("parse-voice-order", {
      body: { transcript: voice.transcript, menu: items },
    });
    setVoiceParsing(false);
    if (error) {
      toast.error(error.message ?? "Could not parse order");
      return;
    }
    setVoicePreview(data as typeof voicePreview);
  }

  function confirmVoiceOrder() {
    if (!voicePreview) return;
    const newLines: CartLine[] = [];
    for (const p of voicePreview.items) {
      const item = items.find((i) => i.id === p.menu_item_id);
      if (!item) continue;
      const mods = (p.modifier_ids ?? [])
        .map((id) => item.modifiers.find((m) => m.id === id))
        .filter((m): m is Mod => Boolean(m));
      newLines.push({
        key: `${item.id}-${Date.now()}-${Math.random()}`,
        item,
        quantity: Math.max(1, Math.min(20, p.quantity || 1)),
        selectedMods: mods,
        instructions: p.special_instructions ?? "",
      });
    }
    if (newLines.length === 0) {
      toast.error("Nothing matched the menu — try again.");
      return;
    }
    setCart((c) => [...c, ...newLines]);
    toast.success(`Added ${newLines.length} item${newLines.length > 1 ? "s" : ""} from voice`);
    setVoiceOpen(false);
    setVoicePreview(null);
    voice.setTranscript("");
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading menu…
      </div>
    );
  if (error || !resolved)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">{error ?? "Unknown error"}</p>
      </div>
    );

  return (
    <BrandProvider restaurant={{ primary_color: resolved.primary_color, name: resolved.restaurant_name }}>
      <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/r/$restaurantSlug/$branchSlug/welcome"
              params={{
                restaurantSlug: resolved.restaurant_slug,
                branchSlug: resolved.branch_slug,
              }}
              className="flex items-center gap-3 rounded-lg p-1 -m-1 transition hover:bg-accent/50"
              aria-label={`${resolved.restaurant_name} home`}
            >
              {resolved.logo_url ? (
                <img
                  src={resolved.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
                >
                  {resolved.restaurant_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-brand">
                  {resolved.restaurant_name}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  Table {resolved.table_number}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/r/$restaurantSlug/$branchSlug/welcome"
                params={{
                  restaurantSlug: resolved.restaurant_slug,
                  branchSlug: resolved.branch_slug,
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
                aria-label="Restaurant home"
              >
                <Home className="h-4 w-4" />
              </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <HandHelping className="mr-1 h-4 w-4" /> Help
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Need something?</SheetTitle>
                  <SheetDescription>Send a request to staff.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  <Button className="w-full btn-brand" onClick={() => callService("call_waiter")}>
                    <Bell className="mr-2 h-4 w-4" /> Call waiter
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => callService("need_assistance")}>
                    Need assistance
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => callService("request_bill")}>
                    <Receipt className="mr-2 h-4 w-4" /> Request bill
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => callService("table_help")}>
                    Clean / set table
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {voice.supported && (
              <Button
                size="sm"
                className="flex-1 btn-brand"
                onClick={() => {
                  setVoiceOpen(true);
                  setVoicePreview(null);
                  voice.setTranscript("");
                }}
              >
                <Mic className="mr-1 h-4 w-4" /> Voice order
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setAssistantOpen(true)}
            >
              <Sparkles className="mr-1 h-4 w-4" /> Ask AI
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setFindOpen(true);
              setFindResults(null);
              setFindQuery(customerName || customerWhatsapp || "");
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <Search className="h-3 w-3" /> Already ordered? Find my orders
          </button>
        </div>
      </header>

      <main className="space-y-6 p-4">
        {cats.map((c) => {
          const catItems = items.filter((i) => i.category_id === c.id);
          if (catItems.length === 0) return null;
          return (
            <section key={c.id}>
              <h2 className="mb-2 text-lg font-semibold">{c.name}</h2>
              <div className="space-y-2">
                {catItems.map((i) => (
                  <Card
                    key={i.id}
                    className={i.available ? "cursor-pointer" : "opacity-60"}
                    onClick={() => i.available && openItem(i)}
                  >
                    <CardContent className="flex items-start justify-between gap-3 p-4">
                      <div className="flex-1">
                        <div className="font-medium">{i.name}</div>
                        {i.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                        )}
                        {!i.available && (
                          <Badge variant="secondary" className="mt-2">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                      <div className="font-semibold">${formatPrice(i.price)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-muted-foreground">Menu is empty.</p>
        )}
      </main>

      {/* Cart bottom bar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 shadow-lg"
            size="lg"
            disabled={cart.length === 0}
            style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            View cart ({cart.length}) · ${formatPrice(cartTotal)}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Your order</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {cart.map((l) => (
              <div key={l.key} className="flex items-start justify-between border-b pb-3">
                <div className="flex-1">
                  <div className="font-medium">{l.item.name}</div>
                  {l.selectedMods.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      + {l.selectedMods.map((m) => m.name).join(", ")}
                    </div>
                  )}
                  {l.instructions && (
                    <div className="text-xs italic text-muted-foreground">"{l.instructions}"</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => changeQty(l.key, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center">{l.quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => changeQty(l.key, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium">Order note (optional)</label>
              <Textarea
                placeholder="Allergies, preferences…"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
              />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                So we can reach you when your order is ready
              </p>
              <div>
                <label htmlFor="cust-name" className="mb-1 block text-sm font-medium">
                  Your name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cust-name"
                  value={customerName}
                  maxLength={80}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah"
                />
              </div>
              <div>
                <label htmlFor="cust-wa" className="mb-1 block text-sm font-medium">
                  WhatsApp number <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cust-wa"
                  type="tel"
                  inputMode="tel"
                  value={customerWhatsapp}
                  maxLength={20}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  placeholder="+1 555 123 4567"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Include country code. We'll only message you about this order.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
              <span>Total</span>
              <span>${formatPrice(cartTotal)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={submitting || cart.length === 0}
              onClick={submitOrder}
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
            >
              {submitting ? "Sending…" : "Place order"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Item modifier dialog */}
      <Dialog open={!!activeItem} onOpenChange={(o) => !o && setActiveItem(null)}>
        <DialogContent>
          {activeItem && (
            <>
              <DialogHeader>
                <DialogTitle>{activeItem.name}</DialogTitle>
                {activeItem.description && (
                  <DialogDescription>{activeItem.description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-3">
                {activeItem.modifiers.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Add-ons</p>
                    <div className="space-y-2">
                      {activeItem.modifiers.map((m) => (
                        <label key={m.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={chosenMods.includes(m.id)}
                              onCheckedChange={(c) =>
                                setChosenMods((cur) =>
                                  c ? [...cur, m.id] : cur.filter((x) => x !== m.id),
                                )
                              }
                            />
                            <span>{m.name}</span>
                          </div>
                          {Number(m.price_delta) !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              +${formatPrice(m.price_delta)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-sm font-medium">Special instructions</p>
                  <Textarea
                    placeholder="No onions, well-done…"
                    value={chosenInstructions}
                    onChange={(e) => setChosenInstructions(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addToCart} style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}>
                  Add · ${formatPrice(activeItem.price)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Voice ordering dialog */}
      <Dialog
        open={voiceOpen}
        onOpenChange={(o) => {
          setVoiceOpen(o);
          if (!o) {
            voice.stop();
            setVoicePreview(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order by voice</DialogTitle>
            <DialogDescription>
              Tap the mic and say your order, e.g. "Two margherita pizzas and a Coke."
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant={voice.listening ? "destructive" : "default"}
                onClick={() => (voice.listening ? voice.stop() : voice.start())}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <p className="flex-1 text-sm text-muted-foreground">
                {voice.listening ? "Listening…" : "Tap mic to start"}
              </p>
            </div>
            <Textarea
              value={voice.transcript}
              onChange={(e) => voice.setTranscript(e.target.value)}
              placeholder="Your order will appear here. You can also type/edit it."
              rows={3}
            />
            {voicePreview && (
              <div className="rounded-md border p-3 text-sm">
                <p className="mb-2 font-medium">Preview</p>
                {voicePreview.items.length === 0 && (
                  <p className="text-muted-foreground">No menu items matched.</p>
                )}
                <ul className="space-y-1">
                  {voicePreview.items.map((p, idx) => {
                    const it = items.find((i) => i.id === p.menu_item_id);
                    if (!it) return null;
                    const mods = (p.modifier_ids ?? [])
                      .map((id) => it.modifiers.find((m) => m.id === id)?.name)
                      .filter(Boolean);
                    return (
                      <li key={idx}>
                        {p.quantity}× {it.name}
                        {mods.length > 0 && (
                          <span className="text-xs text-muted-foreground"> · {mods.join(", ")}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {voicePreview.unmatched.length > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Couldn't match: {voicePreview.unmatched.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!voicePreview ? (
              <Button onClick={parseVoice} disabled={voiceParsing || !voice.transcript.trim()}>
                {voiceParsing ? (
                  <span className="inline-flex items-center"><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Parsing…</span>
                ) : (
                  "Review order"
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setVoicePreview(null)}>
                  Edit
                </Button>
                <Button onClick={confirmVoiceOrder} disabled={voicePreview.items.length === 0}>
                  Add to cart
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AssistantChat
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        restaurantName={resolved.restaurant_name}
        menu={items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: Number(i.price),
        }))}
      />

      {/* Recover existing orders by name or WhatsApp */}
      <Dialog open={findOpen} onOpenChange={(o) => { setFindOpen(o); if (!o) setFindResults(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find my orders</DialogTitle>
            <DialogDescription>
              Enter the name or WhatsApp number you used when placing the order.
              We'll show your active orders from this table (last 4 hours).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Sarah  —or—  +1 555 123 4567"
              onKeyDown={(e) => { if (e.key === "Enter") runFindOrders(); }}
            />
            <Button className="w-full btn-brand" onClick={runFindOrders} disabled={findLoading}>
              {findLoading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Searching…</> : "Search"}
            </Button>
            {findResults && (
              <div className="space-y-2">
                {findResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No recent orders found for that name or number on this table.
                  </p>
                )}
                {findResults.map((r) => (
                  <button
                    key={r.order_id}
                    onClick={() => {
                      setFindOpen(false);
                      navigate({ to: "/t/$qrToken/order/$orderId", params: { qrToken, orderId: r.order_id } });
                    }}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">Order #{r.order_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.customer_name} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </BrandProvider>
  );
}