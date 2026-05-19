import { HelpCircle } from "lucide-react";
import { VoiceMicButton } from "./VoiceMicButton";
import { cn } from "@/lib/utils";

type Props = {
  onVoice: () => void;
  onHelp?: () => void;
  onAssistant?: () => void;
  voiceListening?: boolean;
  showHelp?: boolean;
  showAssistant?: boolean;
  className?: string;
};

/**
 * Bottom-right floating cluster: AI Voice mic (primary), help, optional
 * AI assistant. Sits above the cart bar (which uses bottom-4 left-1/2).
 */
export function FloatingActions({
  onVoice,
  onHelp,
  onAssistant,
  voiceListening = false,
  showHelp = true,
  showAssistant = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3",
        className,
      )}
    >
      {showAssistant && onAssistant && (
        <button
          type="button"
          onClick={onAssistant}
          aria-label="AI assistant"
          className="inline-flex h-11 items-center gap-2 rounded-full border bg-background/95 px-4 text-sm font-medium shadow-md backdrop-blur transition hover:bg-accent"
        >
          <span className="text-base">🤖</span> Ask AI
        </button>
      )}
      {showHelp && onHelp && (
        <button
          type="button"
          onClick={onHelp}
          aria-label="Call waiter or get help"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-background/95 shadow-md backdrop-blur transition hover:bg-accent"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}
      <VoiceMicButton listening={voiceListening} onClick={onVoice} size="lg" />
    </div>
  );
}