import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { FloatingActions } from "@/components/customer/FloatingActions";
import { AssistantChat } from "@/components/customer/AssistantChat";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ImageIcon, Home } from "lucide-react";
import { toast } from "sonner";

type Mod = { id: string; name: string; price_delta: number };
type Item = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  station: string;
  modifiers: Mod[];
};
type Cat = { id: string; name: string; sort_order: number };
type BranchInfo = {
  restaurant_id: string;
  restaurant_name: string;
  primary_color: string | null;
  logo_url: string | null;
  branch_id: string;
  branch_name: string;
  branch_slug: string;
};

export const Route = createFileRoute("/r/$restaurantSlug/$branchSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Menu — ${params.restaurantSlug}` },
      { name: "description", content: "Browse the menu and order directly from your table." },
      { property: "og:title", content: `Menu — ${params.restaurantSlug}` },
      { property: "og:description", content: "Order from your table with voice or AI assistance." },
    ],
  }),
  component: BranchMenuPage,
});

function BranchMenuPage() {
  const { restaurantSlug, branchSlug } = Route.useParams();
  const navigate = useNavigate();
  const matches = useMatches();
  // If a child route (welcome, tables, etc.) is active, just render the child via Outlet.
  const hasChildRoute = matches.some(
    (m) =>
      m.routeId !== "/r/$restaurantSlug/$branchSlug" &&
      m.routeId.startsWith("/r/$restaurantSlug/$branchSlug/"),
  );
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (hasChildRoute) return;
    (async () => {
      const { data: branches } = await supabase.rpc("get_public_branches", {
        _restaurant_slug: restaurantSlug,
      });
      const list = (branches ?? []) as BranchInfo[];
      const b = list.find((x) => x.branch_slug === branchSlug) ?? list[0] ?? null;
      setBranch(b);

      // Load preview menu via the first table's QR token (read-only RPC).
      const { data: tables } = await supabase.rpc("get_branch_tables", {
        _restaurant_slug: restaurantSlug,
        _branch_slug: branchSlug,
      });
      const firstToken = (tables ?? [])[0]?.qr_token as string | undefined;
      if (firstToken) {
        const { data: menu } = await supabase.rpc("get_menu_for_qr", { _qr_token: firstToken });
        const m = menu as { categories: Cat[]; items: Item[] } | null;
        setCats(m?.categories ?? []);
        setItems(m?.items ?? []);
      }
      setLoading(false);
    })();
  }, [restaurantSlug, branchSlug, hasChildRoute]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat && i.category_id !== activeCat) return false;
      if (!s) return true;
      return (
        i.name.toLowerCase().includes(s) ||
        (i.description ?? "").toLowerCase().includes(s)
      );
    });
  }, [items, search, activeCat]);

  const goPickTable = () =>
    navigate({ to: "/r/$restaurantSlug/$branchSlug/tables", params: { restaurantSlug, branchSlug } });

  if (hasChildRoute) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading menu…
      </div>
    );
  }
  if (!branch) {
    return <div className="p-10 text-center text-destructive">Restaurant not found.</div>;
  }

  return (
    <BrandProvider
      restaurant={{
        primary_color: branch.primary_color,
        logo_url: branch.logo_url,
        name: branch.restaurant_name,
      }}
    >
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Link
              to="/r/$restaurantSlug/$branchSlug/welcome"
              params={{ restaurantSlug, branchSlug }}
              className="flex flex-1 items-center gap-3 min-w-0 rounded-lg p-1 -m-1 transition hover:bg-accent/50"
              aria-label={`${branch.restaurant_name} home`}
            >
              {branch.logo_url ? (
                <img
                  src={branch.logo_url}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold"
                  style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
                >
                  {branch.restaurant_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="truncate text-base font-bold">{branch.restaurant_name}</h1>
                <p className="truncate text-xs text-muted-foreground">{branch.branch_name}</p>
              </div>
            </Link>
            <Link
              to="/r/$restaurantSlug/$branchSlug/welcome"
              params={{ restaurantSlug, branchSlug }}
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </div>
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search the menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {cats.length > 0 && (
            <div className="mx-auto max-w-2xl overflow-x-auto px-4 pb-3">
              <div className="flex gap-2">
                <CatChip
                  active={activeCat === null}
                  onClick={() => setActiveCat(null)}
                  label="All"
                />
                {cats.map((c) => (
                  <CatChip
                    key={c.id}
                    active={activeCat === c.id}
                    onClick={() => setActiveCat(c.id)}
                    label={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-2xl space-y-3 p-4">
          {filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              {search ? "Nothing matches your search." : "Menu is empty."}
            </p>
          )}
          {filtered.map((i, idx) => (
            <div
              key={i.id}
              className={
                "card-brand flex gap-3 overflow-hidden p-3 animate-lift-in " +
                (i.available ? "" : "opacity-60")
              }
              style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
            >
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.image_url ? (
                  <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight">{i.name}</div>
                {i.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {i.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand">${Number(i.price).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      i.available
                        ? toast.info("Pick your table to add items.", {
                            action: { label: "Pick table", onClick: goPickTable },
                          })
                        : null
                    }
                    className="btn-brand h-8 px-3 text-xs font-semibold disabled:opacity-50"
                    disabled={!i.available}
                  >
                    {i.available ? "Add" : "Unavailable"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </main>

        <FloatingActions
          onVoice={() =>
            toast.info("Pick your table first to start a voice order.", {
              action: { label: "Pick table", onClick: goPickTable },
            })
          }
          onHelp={() =>
            toast.info("Pick your table so staff knows where to go.", {
              action: { label: "Pick table", onClick: goPickTable },
            })
          }
          onAssistant={() => setAssistantOpen(true)}
          showAssistant
        />

        <AssistantChat
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          restaurantName={branch.restaurant_name}
          menu={items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: Number(i.price),
          }))}
        />
      </div>
    </BrandProvider>
  );
}

function CatChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "whitespace-nowrap rounded-full px-3 py-1 text-sm transition " +
        (active
          ? "btn-brand"
          : "border bg-background text-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
  );
}