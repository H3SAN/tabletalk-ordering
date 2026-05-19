import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  branch_id: string | null;
};
type Invite = {
  id: string;
  email: string;
  name: string;
  role: string;
  branch_id: string | null;
  token: string;
  accepted_at: string | null;
  expires_at: string;
};

const ROLES = [
  "admin",
  "branch_manager",
  "kitchen",
  "bar",
  "waiter",
] as const;

export const Route = createFileRoute("/dashboard/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { user } = useAuth();
  const { restaurantId, branches } = useRestaurantContext();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("waiter");
  const [branchId, setBranchId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!restaurantId) return;
    const [{ data: s }, { data: i }] = await Promise.all([
      supabase
        .from("staff_users")
        .select("id, name, email, role, active, branch_id")
        .eq("restaurant_id", restaurantId)
        .order("created_at"),
      supabase
        .from("staff_invites")
        .select("id, email, name, role, branch_id, token, accepted_at, expires_at")
        .eq("restaurant_id", restaurantId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    setStaff((s ?? []) as Staff[]);
    setInvites((i ?? []) as Invite[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("staff_invites").insert({
      restaurant_id: restaurantId,
      branch_id: branchId === "none" ? null : branchId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      invited_by: user.id,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Invite created. Share the link below.");
    setEmail("");
    setName("");
    setRole("waiter");
    setBranchId("none");
    setOpen(false);
    load();
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("staff_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function toggleActive(s: Staff) {
    const { error } = await supabase
      .from("staff_users")
      .update({ active: !s.active })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Invite team members and assign roles per branch.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Invite staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={createInvite} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch (optional)</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {invites.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="border-b p-4 font-semibold">Pending invites</div>
            <div className="divide-y">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{inv.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {inv.email} · {inv.role.replace(/_/g, " ")}
                      {inv.branch_id &&
                        ` · ${branches.find((b) => b.id === inv.branch_id)?.name ?? ""}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                      <Copy className="mr-1 h-3 w-3" /> Copy link
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="divide-y p-0">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.email}
                  {s.branch_id &&
                    ` · ${branches.find((b) => b.id === s.branch_id)?.name ?? ""}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {s.role.replace(/_/g, " ")}
                </Badge>
                <Button size="sm" variant={s.active ? "outline" : "default"} onClick={() => toggleActive(s)}>
                  {s.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No staff yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}