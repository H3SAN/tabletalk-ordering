import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContext } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ExternalLink } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

type TableRow = {
  id: string;
  table_number: string;
  qr_token: string;
  branch_id: string;
  active: boolean;
};

export const Route = createFileRoute("/dashboard/tables")({
  component: TablesPage,
});

function TablesPage() {
  const { restaurantId, branches, loading } = useRestaurantContext();
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [open, setOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeBranch && branches[0]) setActiveBranch(branches[0].id);
  }, [branches, activeBranch]);

  useEffect(() => {
    if (!activeBranch) return;
    refresh();
  }, [activeBranch]);

  async function refresh() {
    const { data } = await supabase
      .from("tables")
      .select("id, table_number, qr_token, branch_id, active")
      .eq("branch_id", activeBranch)
      .order("table_number");
    setTables((data ?? []) as TableRow[]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !activeBranch) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("tables")
      .insert({ restaurant_id: restaurantId, branch_id: activeBranch, table_number: tableNumber });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setTableNumber("");
    await refresh();
    toast.success("Table created");
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tables & QR codes</h1>
        <div className="flex items-center gap-2">
          <Select value={activeBranch} onValueChange={setActiveBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!activeBranch}>
                <Plus className="mr-1 h-4 w-4" /> Add table
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New table</DialogTitle>
                <DialogDescription>A QR token is generated automatically.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="tnum">Table number / name</Label>
                  <Input
                    id="tnum"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adding…" : "Add table"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {tables.map((t) => {
          const url = `${window.location.origin}/t/${t.qr_token}`;
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>Table {t.table_number}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="rounded-md border bg-white p-2">
                  <QRCodeCanvas value={url} size={140} />
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 break-all text-xs text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" /> {url}
                </a>
              </CardContent>
            </Card>
          );
        })}
        {tables.length === 0 && activeBranch && (
          <p className="text-sm text-muted-foreground">No tables yet for this branch.</p>
        )}
      </div>
    </div>
  );
}