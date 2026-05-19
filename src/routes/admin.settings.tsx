import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform settings</h1>
        <p className="text-sm text-muted-foreground">OrderFlow AI brand & system configuration.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Brand</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Company" value="OrderFlow AI" />
            <Row label="Tagline" value="Smart ordering for every table" />
            <Row label="Primary" value="#0EA5E9" swatch="#0EA5E9" />
            <Row label="Accent" value="#14B8A6" swatch="#14B8A6" />
            <Row label="Neutral" value="#0F172A" swatch="#0F172A" />
          </dl>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">System status</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <Status label="API" />
            <Status label="Realtime" />
            <Status label="AI Voice (Lovable AI)" />
            <Status label="Database" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 font-medium">
        {swatch && <span className="h-4 w-4 rounded" style={{ background: swatch }} />}
        {value}
      </dd>
    </div>
  );
}

function Status({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operational
      </span>
    </li>
  );
}