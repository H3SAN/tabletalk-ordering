import { createFileRoute, Navigate, Outlet, useNavigate, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { VoiceMicButton } from "@/components/customer/VoiceMicButton";
import { AssistantChat } from "@/components/customer/AssistantChat";
import { HelpSheet } from "@/components/customer/HelpSheet";
import { MapPin, Sparkles, Loader2, ChevronRight, Wifi, Bell } from "lucide-react";
import { toast } from "sonner";
import ambienceBg from "@/assets/restaurant-ambience.jpg";

type Branch = {
  restaurant_id: string;
  restaurant_name: string;
  primary_color: string | null;
  logo_url: string | null;
  branch_id: string;
  branch_name: string;
  branch_slug: string;
  address: string | null;
};

export const Route = createFileRoute("/r/$restaurantSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.restaurantSlug} — Welcome` },
      {
        name: "description",
        content: "Pick your branch and order from your table with AI voice or chat.",
      },
    ],
  }),
  component: RestaurantLandingPage,
});

function RestaurantLandingPage() {
  const { restaurantSlug } = Route.useParams();
  const navigate = useNavigate();
  const matches = useMatches();
  // If a child route (e.g. /r/$restaurantSlug/$branchSlug/...) is active,
  // just render the child via Outlet — don't run the landing-page logic at all.
  const hasChildRoute = matches.some(
    (m) => m.routeId !== "/r/$restaurantSlug" && m.routeId.startsWith("/r/$restaurantSlug/"),
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (hasChildRoute) return;
    (async () => {
      const { data } = await supabase.rpc("get_public_branches", {
        _restaurant_slug: restaurantSlug,
      });
      setBranches((data ?? []) as Branch[]);
      setLoading(false);
    })();
  }, [restaurantSlug, hasChildRoute]);

  if (hasChildRoute) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (branches.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-destructive">
        Restaurant not found.
      </div>
    );
  }

  // If there is only one branch, send the customer straight to its welcome page.
  if (branches.length === 1) {
    return (
      <Navigate
        to="/r/$restaurantSlug/$branchSlug/welcome"
        params={{ restaurantSlug, branchSlug: branches[0].branch_slug }}
        replace
      />
    );
  }

  const r = branches[0];
  const initials = r.restaurant_name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <BrandProvider
      restaurant={{
        primary_color: r.primary_color,
        logo_url: r.logo_url,
        name: r.restaurant_name,
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
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 40%, color-mix(in oklab, var(--brand-primary) 22%, transparent), transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.82))",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-8 sm:pt-12">
          <div className="flex justify-center animate-lift-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur">
              <Wifi className="h-3.5 w-3.5" />
              Welcome to {r.restaurant_name}
            </div>
          </div>

          <div
            className="mt-8 flex flex-col items-center text-center animate-lift-in"
            style={{ animationDelay: "60ms" }}
          >
            {r.logo_url ? (
              <img
                src={r.logo_url}
                alt={`${r.restaurant_name} logo`}
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
                {initials || r.restaurant_name.charAt(0)}
              </div>
            )}

            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              {r.restaurant_name}
            </h1>
            <p className="mt-2 text-base text-white/80 sm:text-lg">
              Pick a branch to begin your experience.
            </p>
          </div>

          <div
            className="mt-10 flex flex-col items-center animate-lift-in"
            style={{ animationDelay: "140ms" }}
          >
            <VoiceMicButton
              listening={false}
              alwaysPulse
              size="xl"
              ariaLabel="Start AI voice order"
              onClick={() =>
                toast.info("Pick a branch first to start a voice order.")
              }
            />
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              <Sparkles className="h-3.5 w-3.5" />
              Order with your voice
            </div>
          </div>

          <div
            className="mt-10 space-y-2.5 animate-lift-in"
            style={{ animationDelay: "220ms" }}
          >
            <div className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              Choose a branch
            </div>
            {branches.map((b) => (
              <button
                key={b.branch_id}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/r/$restaurantSlug/$branchSlug/welcome",
                    params: { restaurantSlug, branchSlug: b.branch_slug },
                  })
                }
                className="group flex w-full items-center gap-3 rounded-[var(--brand-radius)] border border-white/15 bg-white/5 p-4 text-left text-white backdrop-blur transition hover:bg-white/10 active:scale-[0.99]"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: "var(--brand-primary)",
                    color: "var(--brand-on-primary)",
                  }}
                >
                  {b.branch_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold leading-tight">
                    {b.branch_name}
                  </div>
                  {b.address && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/65">
                      <MapPin className="h-3 w-3 flex-shrink-0" /> {b.address}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-white/55 transition group-hover:text-white" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="mx-auto mt-6 inline-flex items-center gap-1.5 text-xs text-white/65 underline-offset-4 hover:text-white hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Or chat with the AI assistant
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            <Bell className="h-3.5 w-3.5" />
            Call Waiter / Help
          </button>

          <p className="mt-4 text-center text-[11px] text-white/40">
            Powered by OrderFlow AI
          </p>
        </div>

        <AssistantChat
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          restaurantName={r.restaurant_name}
          menu={[]}
        />

        <HelpSheet
          open={helpOpen}
          onOpenChange={setHelpOpen}
          restaurantName={r.restaurant_name}
          onNeedTable={() => toast.info("Pick a branch and your table first.")}
        />
      </div>
    </BrandProvider>
  );
}