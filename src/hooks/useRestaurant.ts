import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Branch = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
};

export function useRestaurantContext() {
  const { user, loading: authLoading } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: staff } = await supabase
        .from("staff_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (!staff) {
        setLoading(false);
        return;
      }
      setRestaurantId(staff.restaurant_id);
      const { data: bs } = await supabase
        .from("branches")
        .select("*")
        .eq("restaurant_id", staff.restaurant_id)
        .order("created_at");
      setBranches((bs ?? []) as Branch[]);
      setLoading(false);
    })();
  }, [user, authLoading]);

  async function refreshBranches() {
    if (!restaurantId) return;
    const { data: bs } = await supabase
      .from("branches")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at");
    setBranches((bs ?? []) as Branch[]);
  }

  return { restaurantId, branches, loading, refreshBranches };
}