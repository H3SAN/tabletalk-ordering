import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/session";
import { toast } from "sonner";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — TableTap" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [branchName, setBranchName] = useState("Main");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    // If user already has a workspace, send them to dashboard
    supabase.rpc("get_my_restaurant_context").then(({ data }) => {
      if (data && data.length > 0) navigate({ to: "/dashboard" });
      else setChecking(false);
    });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setSlug(slugify(restaurantName));
  }, [restaurantName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    // Verify a live session before calling the RPC. The RPC itself uses
    // auth.uid() server-side so we don't need to pass owner_user_id.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user?.id) {
      setSubmitting(false);
      toast.error("Your session expired. Please sign in again.");
      navigate({ to: "/auth" });
      return;
    }

    const { error } = await supabase.rpc("create_restaurant_workspace", {
      _name: restaurantName,
      _slug: slug,
      _primary_color: primaryColor,
      _branch_name: branchName,
      _address: address,
    });

    setSubmitting(false);
    if (error) {
      const msg = error.message || "Could not create restaurant";
      // Surface friendlier messages for known cases
      if (msg.includes("already own")) toast.error("You already have a restaurant set up.");
      else if (msg.includes("slug is already taken")) toast.error("That slug is already taken. Try another.");
      else if (msg.includes("Not authenticated")) {
        toast.error("Your session expired. Please sign in again.");
        navigate({ to: "/auth" });
        return;
      } else toast.error(msg);
      return;
    }
    toast.success("Restaurant created!");
    navigate({ to: "/dashboard" });
  }

  if (authLoading || checking) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <span className="font-semibold">TableTap</span>
          </div>
          <CardTitle>Set up your restaurant</CardTitle>
          <CardDescription>Just a few details to create your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="rname">Restaurant name</Label>
              <Input
                id="rname"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slug">Public slug</Label>
              <Input id="slug" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
              <p className="text-xs text-muted-foreground">
                Your menu URL: /r/{slug || "your-restaurant"}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="color">Brand color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">First branch</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="bname">Branch name</Label>
                  <Input
                    id="bname"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="addr">Address</Label>
                  <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create restaurant"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}