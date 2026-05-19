import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { slugify } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const { restaurantId, branches, loading, refreshBranches } = useRestaurantContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setSubmitting(true);
    const { error } = await supabase.from("branches").insert({
      restaurant_id: restaurantId,
      name,
      slug: slugify(name),
      address,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Branch added");
    setOpen(false);
    setName("");
    setAddress("");
    await refreshBranches();
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branches</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a branch</DialogTitle>
              <DialogDescription>Locations get their own tables and orders.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="b-name">Name</Label>
                <Input id="b-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-addr">Address</Label>
                <Input id="b-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding…" : "Add branch"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {branches.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{b.name}</CardTitle>
                <Badge variant={b.active ? "default" : "secondary"}>
                  {b.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {b.address || "No address set"}
            </CardContent>
          </Card>
        ))}
        {branches.length === 0 && (
          <p className="text-sm text-muted-foreground">No branches yet. Add your first.</p>
        )}
      </div>
    </div>
  );
}