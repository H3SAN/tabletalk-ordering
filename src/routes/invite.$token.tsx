import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Invite = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  branch_id: string | null;
  branch_name: string | null;
  email: string;
  name: string;
  role: string;
  expired: boolean;
  accepted: boolean;
};

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invite — TableTap" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .rpc("get_invite_by_token", { _token: token })
        .maybeSingle();
      if (error || !data) {
        toast.error("Invite not found");
        setLoading(false);
        return;
      }
      setInvite(data as Invite);
      setLoading(false);
    })();
  }, [token]);

  async function acceptForCurrentUser() {
    setSubmitting(true);
    const { error } = await supabase.rpc("accept_staff_invite", { _token: token });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to the team!");
    navigate({ to: "/dashboard" });
  }

  async function signupAndAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/invite/${token}`;
    const { data, error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: invite.name } },
    });
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    if (!data.session) {
      setSubmitting(false);
      toast.message("Check your email to confirm your account, then come back.");
      return;
    }
    const { error: rpcErr } = await supabase.rpc("accept_staff_invite", { _token: token });
    setSubmitting(false);
    if (rpcErr) return toast.error(rpcErr.message);
    toast.success("Welcome to the team!");
    navigate({ to: "/dashboard" });
  }

  async function signinAndAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    const { error: rpcErr } = await supabase.rpc("accept_staff_invite", { _token: token });
    setSubmitting(false);
    if (rpcErr) return toast.error(rpcErr.message);
    toast.success("Welcome to the team!");
    navigate({ to: "/dashboard" });
  }

  if (loading || authLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!invite) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">This invite link is not valid.</p>
      </div>
    );
  }
  if (invite.expired) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">This invite has expired. Ask your manager for a new one.</p>
      </div>
    );
  }
  if (invite.accepted) {
    return (
      <div className="p-8 text-center">
        <p>This invite has already been accepted. <a className="underline" href="/auth">Sign in</a>.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You're invited to {invite.restaurant_name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Role: <span className="capitalize">{invite.role.replace(/_/g, " ")}</span>
            {invite.branch_name && ` · ${invite.branch_name}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            user.email?.toLowerCase() === invite.email.toLowerCase() ? (
              <Button className="w-full" onClick={acceptForCurrentUser} disabled={submitting}>
                {submitting ? "Joining…" : "Accept invite"}
              </Button>
            ) : (
              <p className="text-sm text-destructive">
                You're signed in as {user.email}, but this invite is for {invite.email}. Please sign
                out and try again.
              </p>
            )
          ) : (
            <>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-2 py-1 ${mode === "signup" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-2 py-1 ${mode === "signin" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </div>
              <form
                onSubmit={mode === "signup" ? signupAndAccept : signinAndAccept}
                className="space-y-3"
              >
                <div>
                  <Label>Email</Label>
                  <Input value={invite.email} disabled />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? "Working…"
                    : mode === "signup"
                      ? "Create account & join"
                      : "Sign in & join"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}