import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bell, HandHelping, Receipt, Sparkles } from "lucide-react";

export type HelpRequestType = "call_waiter" | "need_assistance" | "request_bill" | "table_help";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, request is sent immediately. Otherwise the sheet
   *  prompts the user to pick a table first via onNeedTable. */
  onSubmit?: (type: HelpRequestType) => Promise<void> | void;
  onNeedTable?: () => void;
  restaurantName?: string;
};

const OPTIONS: {
  type: HelpRequestType;
  title: string;
  desc: string;
  Icon: typeof Bell;
}[] = [
  { type: "call_waiter", title: "Call a waiter", desc: "Ask a server to come to your table", Icon: Bell },
  { type: "need_assistance", title: "Ask for help", desc: "Need help from the kitchen or staff", Icon: HandHelping },
  { type: "request_bill", title: "Request the bill", desc: "Ask for your check", Icon: Receipt },
  { type: "table_help", title: "Clean / set table", desc: "Water refill, cleaning, cutlery, etc.", Icon: Sparkles },
];

export function HelpSheet({ open, onOpenChange, onSubmit, onNeedTable, restaurantName }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t bg-background p-0">
        <SheetHeader className="px-6 pt-6 text-left">
          <SheetTitle>How can we help?</SheetTitle>
          <SheetDescription>
            {onSubmit
              ? "Pick a request — your table's staff will be notified instantly."
              : `Pick your table first so ${restaurantName ?? "the staff"} knows where to go.`}
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-1 gap-2 px-4 py-5 sm:grid-cols-2">
          {OPTIONS.map(({ type, title, desc, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={async () => {
                if (onSubmit) {
                  await onSubmit(type);
                  onOpenChange(false);
                } else {
                  onOpenChange(false);
                  onNeedTable?.();
                }
              }}
              className="flex items-start gap-3 rounded-[var(--brand-radius,14px)] border bg-card p-4 text-left transition hover:bg-accent active:scale-[0.99]"
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}