import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type AssistantMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantName: string;
  menu: AssistantMenuItem[];
};

/**
 * Tenant-isolated assistant: only the menu passed in is sent to the model.
 * The edge function ignores any cross-tenant references.
 */
export function AssistantChat({ open, onOpenChange, restaurantName, menu }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: { messages: next, menu, restaurantName },
      });
      if (error) throw error;
      const reply = (data as { reply?: string } | null)?.reply ?? "Sorry, I couldn't reply.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Ask {restaurantName}</SheetTitle>
          <SheetDescription>
            Ask about the menu, ingredients, recommendations, or allergens.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex max-h-[45vh] min-h-[160px] flex-col gap-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try: "What's vegetarian?" or "Recommend something spicy."
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end rounded-2xl rounded-br-sm bg-[var(--brand-primary)] px-3 py-2 text-sm text-[var(--brand-on-primary)]"
                    : "self-start rounded-2xl rounded-bl-sm bg-background px-3 py-2 text-sm shadow-sm"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="self-start text-xs text-muted-foreground">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ask about the menu…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} className="btn-brand">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}