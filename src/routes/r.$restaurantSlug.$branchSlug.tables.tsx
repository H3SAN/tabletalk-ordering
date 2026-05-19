import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { Loader2 } from "lucide-react";

type T = {
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_number: string;
  qr_token: string;
};

type BranchInfo = {
  restaurant_id: string;
  restaurant_name: string;
  primary_color: string | null;
  logo_url: string | null;
  branch_id: string;
  branch_name: string;
  branch_slug: string;
};

export const Route = createFileRoute("/r/$restaurantSlug/$branchSlug/tables")({
  head: ({ params }) => ({
    meta: [
      { title: `Pick your table — ${params.restaurantSlug}` },
      {
        name: "description",
        content: "Tap your table number to start ordering.",
      },
    ],
  }),
  component: BranchTablePicker,
});

function BranchTablePicker() {
  const { restaurantSlug, branchSlug } = Route.useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [tables, setTables] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: branches }, { data: tbl }] = await Promise.all([
        supabase.rpc("get_public_branches", { _restaurant_slug: restaurantSlug }),
        supabase.rpc("get_branch_tables", {
          _restaurant_slug: restaurantSlug,
          _branch_slug: branchSlug,
        }),
      ]);
      const list = (branches ?? []) as BranchInfo[];
      setBranch(list.find((b) => b.branch_slug === branchSlug) ?? list[0] ?? null);
      setTables((tbl ?? []) as T[]);
      setLoading(false);
    })();
  }, [restaurantSlug, branchSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tables…
      </div>
    );
  }

  return (
    <BrandProvider
      restaurant={{
        primary_color: branch?.primary_color,
        logo_url: branch?.logo_url,
        name: branch?.restaurant_name,
      }}
    >
      <div className="min-h-screen bg-background">
        <header className="border-b bg-brand-surface px-5 py-6 text-center">
          <h1 className="text-xl font-bold">Pick your table</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap a table number to start ordering at {branch?.branch_name ?? "the restaurant"}.
          </p>
        </header>
        {tables.length === 0 ? (
          <div className="p-10 text-center text-destructive">No tables found for this branch.</div>
        ) : (
          <main className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-6">
            {tables.map((t, i) => (
              <button
                key={t.table_id}
                type="button"
                onClick={() => navigate({ to: "/t/$qrToken", params: { qrToken: t.qr_token } })}
                className="card-brand flex aspect-square items-center justify-center text-xl font-bold transition hover:-translate-y-0.5 active:scale-95 animate-lift-in"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-brand">{t.table_number}</span>
              </button>
            ))}
          </main>
        )}
      </div>
    </BrandProvider>
  );
}