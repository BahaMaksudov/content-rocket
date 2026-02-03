import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Mail, Loader2, Share2 } from "lucide-react";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  
  // Support ?tab=integrations URL parameter
  const defaultTab = searchParams.get("tab") === "integrations" ? "integrations" : "profile";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update tab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "integrations" || tabParam === "profile") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFullName(data.full_name || "");
      }
      return data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { full_name: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ full_name: fullName.trim() });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, preferences, and integrations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Share2 className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="gradient-primary text-primary-foreground"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
                <CardDescription>
                  Your usage information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">
                      {profile ? "Active" : "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
