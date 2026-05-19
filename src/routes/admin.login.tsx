import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mic, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Platform Sign in — OrderFlow AI" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: ok } = await supabase.rpc("is_platform_admin", {
        _user_id: data.session.user.id,
      });
      if (ok) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: ok, error: rpcErr } = await supabase.rpc("is_platform_admin", {
      _user_id: data.user!.id,
    });
    setLoading(false);
    if (rpcErr || !ok) {
      await supabase.auth.signOut();
      toast.error("This account isn't a platform admin.");
      return;
    }
    navigate({ to: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Mic className="h-4 w-4 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            OrderFlow <span className="text-primary">AI</span>
          </span>
        </Link>
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Platform sign in</CardTitle>
            <CardDescription>
              Restricted to OrderFlow AI staff. Restaurant owners — use the{" "}
              <Link to="/auth" className="text-primary underline">
                restaurant sign in
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="admin-email">Work email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-pw">Password</Label>
                <Input
                  id="admin-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? "Signing in…" : "Sign in to platform"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}