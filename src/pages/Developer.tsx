import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";
import { ApiKeysSection } from "@/components/developer/ApiKeysSection";
import { ApiDocsSection } from "@/components/developer/ApiDocsSection";
import { UpgradeGate } from "@/components/developer/UpgradeGate";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export default function Developer() {
  const { isPro, isAgency, tier, loading: subLoading } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManageKeys = isPro || isAgency;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Only fetch API keys for Pro/Agency users
  useEffect(() => {
    if (!user || !canManageKeys) {
      setLoading(false);
      return;
    }

    const fetchApiKeys = async () => {
      try {
        const { data, error } = await supabase
          .from("user_api_keys")
          .select("id, name, created_at, last_used_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setApiKeys(data || []);
      } catch (error) {
        console.error("Error fetching API keys:", error);
        toast({ title: "Error", description: "Failed to load API keys", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchApiKeys();
  }, [user, canManageKeys, toast]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Developer API</h1>
            {!canManageKeys && !subLoading && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 gap-1 px-2.5 py-0.5">
                <Crown className="h-3 w-3" />
                Pro Feature
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {canManageKeys
              ? "Manage your API keys and integrate Rocket Content into your workflows"
              : "Explore how to integrate Rocket Content into your workflows"}
          </p>
        </div>

        {/* API Keys — gated or full access */}
        {canManageKeys ? (
          <ApiKeysSection apiKeys={apiKeys} setApiKeys={setApiKeys} loading={loading} />
        ) : (
          !subLoading && <UpgradeGate />
        )}

        {/* Documentation — always visible */}
        <ApiDocsSection />
      </div>
    </AppLayout>
  );
}
