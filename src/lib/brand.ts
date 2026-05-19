/**
 * Brand resolution utilities for OrderFlow AI.
 *
 * Each restaurant can supply its own primary color and logo. When fields are
 * missing we fall back to the OrderFlow AI default palette so every customer
 * surface still feels intentional and premium.
 */

export const FALLBACK_BRAND = {
  primary: "#0EA5E9",
  accent: "#14B8A6",
  bgLight: "#F8F1E9",
  bgDark: "#121212",
  textLight: "#2A2A2A",
  textDark: "#F1F1F1",
  neutral: "#6B7280",
  neutralSoft: "#9CA3AF",
  radius: "14px",
} as const;

export type BrandInput = {
  primary_color?: string | null;
  logo_url?: string | null;
  name?: string | null;
  welcome_text?: string | null;
};

export type Brand = {
  primary: string;
  accent: string;
  onPrimary: string;
  logoUrl: string | null;
  name: string;
  welcomeText: string | null;
  radius: string;
};

/** Strip any non-hex characters and normalise to #RRGGBB or null. */
function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(v);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

/**
 * Pick black or white text for the given background hex by computing
 * relative luminance. Falls back to white if the input is unparseable.
 */
export function getContrastText(hex: string): "#ffffff" | "#111111" {
  const v = normalizeHex(hex);
  if (!v) return "#ffffff";
  const r = parseInt(v.slice(1, 3), 16) / 255;
  const g = parseInt(v.slice(3, 5), 16) / 255;
  const b = parseInt(v.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#111111" : "#ffffff";
}

export function resolveBrand(input?: BrandInput | null): Brand {
  const primary = normalizeHex(input?.primary_color) ?? FALLBACK_BRAND.primary;
  return {
    primary,
    accent: FALLBACK_BRAND.accent,
    onPrimary: getContrastText(primary),
    logoUrl: input?.logo_url?.trim() ? input.logo_url : null,
    name: input?.name?.trim() ? input.name!.trim() : "OrderFlow",
    welcomeText: input?.welcome_text?.trim() ? input.welcome_text!.trim() : null,
    radius: FALLBACK_BRAND.radius,
  };
}

/** Returns the inline style object that injects brand CSS variables. */
export function brandCssVars(brand: Brand): React.CSSProperties {
  return {
    // Cast to any to satisfy CSSProperties for custom properties.
    ["--brand-primary" as never]: brand.primary,
    ["--brand-accent" as never]: brand.accent,
    ["--brand-on-primary" as never]: brand.onPrimary,
    ["--brand-radius" as never]: brand.radius,
  } as React.CSSProperties;
}