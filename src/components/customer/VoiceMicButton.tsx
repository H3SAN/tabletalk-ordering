import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  listening: boolean;
  onClick: () => void;
  size?: "md" | "lg" | "xl";
  className?: string;
  ariaLabel?: string;
  /** Always show pulsing rings (great for hero call-to-action even when idle). */
  alwaysPulse?: boolean;
};

/**
 * The hero AI Voice mic button. Pulses with a brand-colored ring when
 * actively listening. Reads its color from the surrounding BrandProvider.
 */
export function VoiceMicButton({
  listening,
  onClick,
  size = "md",
  className,
  ariaLabel = "AI voice order",
  alwaysPulse = false,
}: Props) {
  const dim =
    size === "xl" ? "h-28 w-28" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const iconDim =
    size === "xl" ? "h-12 w-12" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  const showPulse = listening || alwaysPulse;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={listening}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "btn-brand",
        dim,
        className,
      )}
      style={{ borderRadius: 9999 }}
    >
      {showPulse && (
        <>
          <span className="pointer-events-none absolute inset-0 animate-mic-pulse rounded-full bg-[var(--brand-primary)] opacity-50" />
          <span
            className="pointer-events-none absolute inset-0 animate-mic-pulse rounded-full bg-[var(--brand-primary)] opacity-30"
            style={{ animationDelay: "0.6s" }}
          />
        </>
      )}
      {listening ? <MicOff className={iconDim} /> : <Mic className={iconDim} />}
    </button>
  );
}