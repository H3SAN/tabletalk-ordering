import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { VoiceMicButton } from "@/components/customer/VoiceMicButton";
import { AssistantChat } from "@/components/customer/AssistantChat";
import { HelpSheet } from "@/components/customer/HelpSheet";
import { Menu as MenuIcon, ChefHat, Wifi, Sparkles, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import ambienceBg from "@/assets/restaurant-ambience.jpg";

type BranchInfo = {
  restaurant_id: string;
  restaurant_name: string;
  primary_color: string | null;
  logo_url: string | null;
  branch_id: string;
  branch_name: string;
  branch_slug: string;
  address: string | null;
};

export const Route = createFileRoute("/r/$restaurantSlug/$branchSlug/welcome")({
  head: ({ params }) => ({
    meta: [
      { title: `Welcome — ${params.restaurantSlug} (${params.branchSlug})` },
      {
        name: "description",
        content:
          "View the menu, order from your table, or talk to our AI assistant. Powered by OrderFlow AI.",
      },
      {
        property: "og:title",
        content: `Welcome — ${params.restaurantSlug}`,
      },
      {
        property: "og:description",
        content: "Order from your table with voice or AI assistance.",
      },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { restaurantSlug, branchSlug } = Route.useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_branches", {
        _restaurant_slug: restaurantSlug,
      });
      const list = (data ?? []) as BranchInfo[];
      setBranch(list.find((b) => b.branch_slug === branchSlug) ?? list[0] ?? null);
      setLoading(false);
    })();
  }, [restaurantSlug, branchSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!branch) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-destructive">
        Restaurant not found.
      </div>
    );
  }

  const goTables = () =>
    navigate({ to: "/r/$restaurantSlug/$branchSlug/tables", params: { restaurantSlug, branchSlug } });
  const goMenu = () =>
    navigate({ to: "/r/$restaurantSlug/$branchSlug", params: { restaurantSlug, branchSlug } });
  const initials = branch.restaurant_name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <BrandProvider
      restaurant={{
        primary_color: branch.primary_color,
        logo_url: branch.logo_url,
        name: branch.restaurant_name,
      }}
    >
      <div
        className="relative min-h-dvh overflow-hidden text-white"
        style={{
          backgroundImage: `url(${ambienceBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dim + warm color wash so any background reads as branded */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 40%, color-mix(in oklab, var(--brand-primary) 22%, transparent), transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.78))",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-6 pt-8 sm:pt-12">
          {/* Wi-Fi pill */}
          <div className="flex justify-center animate-lift-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur">
              <Wifi className="h-3.5 w-3.5" />
              Connected to {branch.restaurant_name} Wi-Fi
            </div>
          </div>

          {/* Logo card */}
          <div className="mt-8 flex flex-col items-center text-center animate-lift-in" style={{ animationDelay: "60ms" }}>
            {branch.logo_url ? (
              <img
                src={branch.logo_url}
                alt={`${branch.restaurant_name} logo`}
                width={112}
                height={112}
                className="h-28 w-28 rounded-3xl object-cover shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-3xl text-4xl font-bold shadow-2xl ring-1 ring-white/10"
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "var(--brand-on-primary)",
                }}
              >
                {initials || branch.restaurant_name.charAt(0)}
              </div>
            )}

            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              {branch.restaurant_name}
            </h1>
            <p className="mt-2 text-base text-white/80 sm:text-lg">
              Welcome — your table awaits.
            </p>
            <p className="mt-1 text-sm text-white/55">
              {branch.branch_name}
              {branch.address ? ` · ${branch.address}` : ""}
            </p>
          </div>

          {/* Hero AI mic */}
          <div className="mt-10 flex flex-col items-center animate-lift-in" style={{ animationDelay: "140ms" }}>
            <VoiceMicButton
              listening={false}
              alwaysPulse
              size="xl"
              ariaLabel="Start AI voice order"
              onClick={() =>
                toast.info("Pick your table first to start a voice order.", {
                  action: { label: "Pick table", onClick: goTables },
                })
              }
            />
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              <Sparkles className="h-3.5 w-3.5" />
              Order with your voice
            </div>
          </div>

          {/* Bottom dual CTAs */}
          <div className="mt-auto grid grid-cols-2 gap-3 pt-10 animate-lift-in" style={{ animationDelay: "220ms" }}>
            <button
              type="button"
              onClick={goMenu}
              className="btn-brand group flex flex-col items-start gap-1.5 px-4 py-4 text-left shadow-xl"
            >
              <MenuIcon className="h-5 w-5 opacity-90" />
              <div>
                <div className="text-base font-bold leading-tight">View Menu</div>
                <div className="text-[11px] opacity-85">Browse all dishes</div>
              </div>
            </button>
            <button
              type="button"
              onClick={goTables}
              className="group flex flex-col items-start gap-1.5 rounded-[var(--brand-radius)] border border-white/20 bg-white/5 px-4 py-4 text-left text-white backdrop-blur transition hover:bg-white/10 active:scale-[0.99]"
            >
              <ChefHat className="h-5 w-5 text-white/85" />
              <div>
                <div className="text-base font-bold leading-tight">Order From Table</div>
                <div className="text-[11px] text-white/65">Pick your table</div>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-[var(--brand-radius)] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 active:scale-[0.99]"
          >
            <Bell className="h-4 w-4" />
            Call Waiter / Help
          </button>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="mx-auto mt-3 inline-flex items-center gap-1.5 text-xs text-white/65 underline-offset-4 hover:text-white hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Or chat with the AI assistant
          </button>

          <p className="mt-4 text-center text-[11px] text-white/40">
            Powered by OrderFlow AI
          </p>
        </div>

        <AssistantChat
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          restaurantName={branch.restaurant_name}
          menu={[]}
        />

        <HelpSheet
          open={helpOpen}
          onOpenChange={setHelpOpen}
          restaurantName={branch.restaurant_name}
          onNeedTable={() =>
            toast.info("Pick your table so staff knows where to go.", {
              action: { label: "Pick table", onClick: goTables },
            })
          }
        />
      </div>
    </BrandProvider>
  );
}
