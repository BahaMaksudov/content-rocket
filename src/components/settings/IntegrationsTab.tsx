import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2,
  Loader2,
  Check,
  ExternalLink,
  Lock,
  Trash2,
} from "lucide-react";

interface Integration {
  id: string;
  service: string;
  api_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function IntegrationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAgency } = useSubscription();
  const queryClient = useQueryClient();
  const [bufferKey, setBufferKey] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["user-integrations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!user,
  });

  const bufferIntegration = integrations?.find(i => i.service === "buffer");
  // Check if there's a key (encrypted keys start with "enc:")
  const hasBufferKey = !!bufferIntegration?.api_key;

  const saveMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      // Call the encryption endpoint to save the key securely
      const { data, error } = await supabase.functions.invoke("encrypt-integration-key", {
        body: { service: "buffer", apiKey },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
      toast({ title: "Buffer API key saved securely!" });
      setIsEditing(false);
      setBufferKey("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!bufferIntegration) return;
      
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("id", bufferIntegration.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
      toast({ title: "Buffer integration removed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSave = () => {
    if (!bufferKey.trim()) {
      toast({ variant: "destructive", title: "Please enter an API key" });
      return;
    }
    saveMutation.mutate(bufferKey.trim());
  };

  // Never show actual encrypted key - always show masked placeholder
  const displayMaskedKey = () => "••••••••••••••••";

  // Non-agency users see locked state
  if (!isAgency) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect external services for advanced publishing workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Agency Feature</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              API integrations are available exclusively for Agency subscribers. Upgrade to connect Buffer and other publishing tools.
            </p>
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
              Agency Only
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect external services for advanced publishing workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            {/* Buffer Integration */}
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#231F20] flex items-center justify-center">
                    <Share2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      Buffer
                      {hasBufferKey && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Sync generated content directly to your Buffer queue
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open("https://buffer.com/developers/apps", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {hasBufferKey && !isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 rounded bg-muted font-mono text-sm">
                      {displayMaskedKey()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Update
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="buffer-key">Buffer Access Token</Label>
                      <Input
                        id="buffer-key"
                        type="password"
                        placeholder="Enter your Buffer access token..."
                        value={bufferKey}
                        onChange={(e) => setBufferKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your access token from{" "}
                        <a 
                          href="https://buffer.com/developers/apps" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Buffer Developer Apps
                        </a>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        size="sm"
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setBufferKey("");
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Future integrations placeholder */}
            <div className="p-4 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground">
                More integrations coming soon (Hootsuite, Sprout Social, etc.)
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
