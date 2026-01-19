import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_symbol: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export const usePriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setAlerts(data as PriceAlert[] || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("price-alerts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_alerts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAlerts((prev) => [payload.new as PriceAlert, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setAlerts((prev) =>
              prev.map((alert) =>
                alert.id === payload.new.id ? (payload.new as PriceAlert) : alert
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAlerts((prev) => prev.filter((alert) => alert.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createAlert = async (
    assetSymbol: string,
    targetPrice: number,
    condition: "above" | "below"
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .insert({
          user_id: user.id,
          asset_symbol: assetSymbol,
          target_price: targetPrice,
          condition,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Alert Created",
        description: `Alert set for ${assetSymbol} ${condition} $${targetPrice}`,
      });

      return data as PriceAlert;
    } catch (error) {
      console.error("Error creating alert:", error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      toast({
        title: "Alert Deleted",
        description: "Price alert has been removed",
      });
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive",
      });
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .update({ is_active: isActive })
        .eq("id", alertId);

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling alert:", error);
    }
  };

  return {
    alerts,
    isLoading,
    createAlert,
    deleteAlert,
    toggleAlert,
    refetch: fetchAlerts,
  };
};
