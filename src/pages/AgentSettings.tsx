import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Bot, Zap, Globe, Loader2, Play, Mail, Clock } from "lucide-react";

const PLATFORM_OPTIONS = [
  { id: "x", label: "X (Twitter)", icon: "𝕏" },
  { id: "linkedin", label: "LinkedIn", icon: "in" },
];

export default function AgentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["x", "linkedin"]);
  const [isActive, setIsActive] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [frequencyHours, setFrequencyHours] = useState(12);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["agent-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setTopic(settings.topic || "");
      setPlatforms((settings.platforms as string[]) || ["x", "linkedin"]);
      setIsActive(settings.is_active || false);
      setEmailNotifications((settings as any).email_notifications !== false);
      setFrequencyHours((settings as any).frequency_hours ?? 12);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        topic: topic.trim(),
        platforms,
        is_active: isActive,
        email_notifications: emailNotifications,
      } as any;

      if (settings) {
        const { error } = await supabase
          .from("agent_settings")
          .update(payload)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agent_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-settings"] });
      toast({ title: "Settings saved!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      const { data, error } = await supabase.functions.invoke("run-content-loop", {
        body: { user_id: user!.id },
      });
      if (error) {
        // Try to extract a meaningful message from the error
        const msg = typeof error === "object" && "message" in error ? error.message : String(error);
        throw new Error(msg || "Failed to invoke the content loop");
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      const result = data?.results?.[0];
      if (result?.status === "success") {
        toast({ title: "Campaign created!", description: "Check your Agent Queue for the new draft." });
      } else if (result?.status === "insufficient_credits") {
        toast({ variant: "destructive", title: "Insufficient credits", description: "You need at least 1 credit to run the agent." });
      } else if (result?.status === "no_videos_found") {
        toast({ variant: "destructive", title: "No videos found", description: "No new videos found for your topic in the last 24 hours." });
      } else if (result?.status === "youtube_api_error") {
        toast({ variant: "destructive", title: "YouTube API Error", description: result?.error || "Could not reach YouTube. Check your API key." });
      } else if (result?.status === "already_processed") {
        toast({ title: "Already processed", description: "This video was already discovered. Try again later." });
      } else {
        toast({ title: "Agent completed", description: `Status: ${result?.status || "unknown"}` });
      }
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Agent Error", description: err.message });
    },
  });

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Content Agent Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your automated content discovery and generation engine.
          </p>
        </div>

        {/* Master Toggle – Global Stop Switch */}
        <Card className={`border-2 transition-colors ${isActive ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${isActive ? "bg-green-500/20" : "bg-destructive/20"}`}>
                <Bot className={`h-7 w-7 ${isActive ? "text-green-500" : "text-destructive"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Content Agent</h3>
                <p className="text-sm text-muted-foreground">
                  {isActive ? "Agent is actively scanning for content" : "Agent is OFF — no runs will be processed"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? "default" : "destructive"} className={`text-sm px-3 py-1 ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}`}>
                {isActive ? "Active" : "OFF"}
              </Badge>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-125" />
            </div>
          </CardContent>
        </Card>

        {/* Topic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Topic / Niche
            </CardTitle>
            <CardDescription>
              What topics should the agent scan YouTube for?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., AI productivity tools, SaaS marketing, crypto trading"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Be specific for better results. The agent searches YouTube for trending videos in this niche every 6 hours.
            </p>
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Target Platforms
            </CardTitle>
            <CardDescription>
              Which platforms should the agent generate content for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORM_OPTIONS.map((platform) => (
              <div
                key={platform.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => togglePlatform(platform.id)}
              >
                <Checkbox
                  checked={platforms.includes(platform.id)}
                  onCheckedChange={() => togglePlatform(platform.id)}
                />
                <span className="text-lg font-mono w-6 text-center">{platform.icon}</span>
                <span className="font-medium">{platform.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Get a digest email when your agent discovers new trending videos.
                </p>
              </div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !topic.trim()}
            className="flex-1"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending || !topic.trim() || !isActive}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            {runNowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Now
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
