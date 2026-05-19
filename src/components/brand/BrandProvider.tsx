import { createContext, useContext, useMemo } from "react";
import { resolveBrand, brandCssVars, type Brand, type BrandInput } from "@/lib/brand";
import { cn } from "@/lib/utils";

const BrandContext = createContext<Brand | null>(null);

export function useBrand(): Brand {
  const v = useContext(BrandContext);
  if (!v) return resolveBrand(null);
  return v;
}

type Props = {
  restaurant?: BrandInput | null;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps a subtree with restaurant-specific brand variables. Children can
 * either consume `useBrand()` or use the `.btn-brand`, `.text-brand`,
 * `.card-brand` utility classes which read the injected CSS variables.
 */
export function BrandProvider({ restaurant, className, children }: Props) {
  const brand = useMemo(() => resolveBrand(restaurant), [restaurant]);
  const style = useMemo(() => brandCssVars(brand), [brand]);
  return (
    <BrandContext.Provider value={brand}>
      <div style={style} className={cn("brand-scope", className)}>
        {children}
      </div>
    </BrandContext.Provider>
  );
}