import { useState, useEffect, useCallback } from "react";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Bot, Zap, Globe, Loader2, Play, Mail, Clock, Gauge, RefreshCw, Youtube, LinkIcon, CheckCircle, ExternalLink, Unlink } from "lucide-react";

const PLATFORM_OPTIONS = [
  { id: "x", label: "X (Twitter)", icon: "𝕏" },
  { id: "linkedin", label: "LinkedIn", icon: "in" },
];

// PKCE helpers
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function storeOAuthState(payload: Record<string, string>): string {
  const id = crypto.randomUUID().slice(0, 8);
  localStorage.setItem(`oauth_state_${id}`, JSON.stringify(payload));
  return id;
}

function markPendingOAuth(platform: "x" | "linkedin", stateId: string) {
  localStorage.setItem("oauth_pending_platform", platform);
  localStorage.setItem("oauth_pending_state", stateId);
  localStorage.setItem("oauth_pending_started_at", String(Date.now()));
}

export default function AgentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["x", "linkedin"]);
  const [isActive, setIsActive] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [frequencyHours, setFrequencyHours] = useState(12);
    const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(85);
    const [remixChannelEnabled, setRemixChannelEnabled] = useState(false);
    const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [disconnectTarget, setDisconnectTarget] = useState<"x" | "linkedin" | null>(null);

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

  const xConnected = !!(settings as any)?.x_refresh_token;
  const xUsername = (settings as any)?.x_username || "";
  const linkedinConnected = !!(settings as any)?.linkedin_access_token;
  const linkedinName = (settings as any)?.linkedin_name || "";

  useEffect(() => {
    if (settings) {
      setTopic(settings.topic || "");
      setPlatforms((settings.platforms as string[]) || ["x", "linkedin"]);
      setIsActive(settings.is_active || false);
      setEmailNotifications((settings as any).email_notifications !== false);
      setFrequencyHours((settings as any).frequency_hours ?? 12);
      setAutoPilotEnabled((settings as any).auto_pilot_enabled === true || (settings as any).auto_post_enabled === true);
      setConfidenceThreshold((settings as any).confidence_threshold ?? 85);
      setRemixChannelEnabled((settings as any).remix_channel_enabled === true);
      setYoutubeChannelId((settings as any).youtube_channel_id || "");
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
        frequency_hours: frequencyHours,
        auto_pilot_enabled: autoPilotEnabled,
        auto_post_enabled: autoPilotEnabled,
        confidence_threshold: confidenceThreshold,
        remix_channel_enabled: remixChannelEnabled,
        youtube_channel_id: youtubeChannelId.trim() || null,
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
      } else if (result?.status === "auto_published") {
        toast({ title: "🚀 Auto-Published!", description: `Confidence: ${result?.confidence_score}% — Content was auto-approved.` });
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

  const connectX = useCallback(async () => {
    try {
      const { data: config, error: cfgError } = await supabase.functions.invoke("get-oauth-config");
      if (cfgError) throw cfgError;
      const clientId = config?.x_client_id || "";
      if (!clientId) {
        toast({ variant: "destructive", title: "Configuration Error", description: "X Client ID not configured on the server." });
        return;
      }

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      if (codeChallenge.length !== 43) {
        throw new Error("Invalid PKCE challenge length.");
      }

      const redirectUri = `${window.location.origin}/oauth/social/callback`;
      const scopes = "tweet.read tweet.write users.read offline.access";
      const stateId = storeOAuthState({ platform: "x" });

      // Use localStorage for better resilience across new tabs/windows.
      localStorage.setItem(`oauth_x_verifier_${stateId}`, codeVerifier);
      localStorage.setItem("x_code_verifier", codeVerifier); // backward-compatible fallback
      markPendingOAuth("x", stateId);

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes,
        state: stateId,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
      window.location.href = authUrl;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to start X connection." });
    }
  }, [toast]);

  const connectLinkedIn = useCallback(async () => {
    try {
      const { data: config, error: cfgError } = await supabase.functions.invoke("get-oauth-config");
      if (cfgError) throw cfgError;
      const clientId = config?.linkedin_client_id || "";
      if (!clientId) {
        toast({ variant: "destructive", title: "Configuration Error", description: "LinkedIn Client ID not configured on the server." });
        return;
      }

      const redirectUri = `${window.location.origin}/oauth/social/callback`;
      const state = storeOAuthState({ platform: "linkedin" });
      markPendingOAuth("linkedin", state);
      const scopes = "openid profile w_member_social";
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
      window.location.href = authUrl;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to start LinkedIn connection." });
    }
  }, [toast]);

  const disconnectMutation = useMutation({
    mutationFn: async (platform: "x" | "linkedin") => {
      const updates: Record<string, null> =
        platform === "x"
          ? { x_refresh_token: null, x_username: null }
          : { linkedin_access_token: null, linkedin_name: null, linkedin_expires_at: null };

      const { error } = await supabase
        .from("agent_settings")
        .update(updates as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      return platform;
    },
    onSuccess: (platform) => {
      queryClient.invalidateQueries({ queryKey: ["agent-settings"] });
      toast({
        title: `${platform === "x" ? "X (Twitter)" : "LinkedIn"} disconnected successfully.`,
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleDisconnectConfirm = () => {
    if (disconnectTarget) {
      disconnectMutation.mutate(disconnectTarget);
    }
    setDisconnectTarget(null);
  };

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
      <div className="max-w-2xl mx-auto space-y-6 px-0 sm:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Settings className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            Content Agent Settings
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Configure your automated content discovery and generation engine.
          </p>
        </div>

        {/* Master Toggle */}
        <Card className={`border-2 transition-colors ${isActive ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-green-500/20" : "bg-destructive/20"}`}>
                <Bot className={`h-6 w-6 sm:h-7 sm:w-7 ${isActive ? "text-green-500" : "text-destructive"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Content Agent</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isActive ? "Agent is actively scanning for content" : "Agent is OFF — no runs will be processed"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <Badge variant={isActive ? "default" : "destructive"} className={`text-sm px-3 py-1 ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}`}>
                {isActive ? "Active" : "OFF"}
              </Badge>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-125" />
            </div>
          </CardContent>
        </Card>

        {/* Social Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5 text-primary" />
              Social Connections
            </CardTitle>
            <CardDescription>
              Connect your social accounts to enable direct publishing from the Agent Queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* X Connection Card */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${xConnected ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${xConnected ? "bg-green-500/15" : "bg-muted"}`}>
                    <span className="text-lg font-bold font-mono">𝕏</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">X (Twitter)</span>
                      {xConnected && (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-500 border-green-500/30 text-[11px] px-2 py-0">
                          <span className="mr-1 text-green-400">●</span> Connected
                        </Badge>
                      )}
                    </div>
                    {xConnected && xUsername ? (
                      <div>
                        <p className="text-sm text-muted-foreground truncate">@{xUsername}</p>
                        {autoPilotEnabled && (
                          <p className="text-[11px] text-amber-500 mt-0.5">Active: High-confidence posts will be sent automatically.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Post threads and tweets automatically</p>
                    )}
                  </div>
                </div>
                {xConnected ? (
                  <Button size="sm" variant="ghost" onClick={() => setDisconnectTarget("x")} disabled={disconnectMutation.isPending} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Unlink className="h-4 w-4 mr-1.5" /> Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={connectX} className="bg-foreground text-background hover:bg-foreground/90 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Connect
                  </Button>
                )}
              </div>
            </div>

            {/* LinkedIn Connection Card */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${linkedinConnected ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${linkedinConnected ? "bg-green-500/15" : "bg-muted"}`}>
                    <span className="text-lg font-bold text-[#0A66C2]">in</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">LinkedIn</span>
                      {linkedinConnected && (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-500 border-green-500/30 text-[11px] px-2 py-0">
                          <span className="mr-1 text-green-400">●</span> Connected
                        </Badge>
                      )}
                    </div>
                    {linkedinConnected && linkedinName ? (
                      <div>
                        <p className="text-sm text-muted-foreground truncate">{linkedinName}</p>
                        {autoPilotEnabled && (
                          <p className="text-[11px] text-amber-500 mt-0.5">Active: High-confidence posts will be sent automatically.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Share posts to your LinkedIn profile</p>
                    )}
                  </div>
                </div>
                {linkedinConnected ? (
                  <Button size="sm" variant="ghost" onClick={() => setDisconnectTarget("linkedin")} disabled={disconnectMutation.isPending} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Unlink className="h-4 w-4 mr-1.5" /> Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={connectLinkedIn} className="bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disconnect Confirmation Dialog */}
        <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {disconnectTarget === "x" ? "X (Twitter)" : "LinkedIn"}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to disconnect? This will stop all scheduled posts to this platform.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Auto-Pilot Mode */}
        <Card className={`border-2 transition-colors ${autoPilotEnabled ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gauge className="h-5 w-5 text-amber-500" />
              Auto-Pilot Mode
              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">NEW</Badge>
            </CardTitle>
            <CardDescription>
              When enabled, the agent will automatically publish high-confidence content to your connected social accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-pilot" className="cursor-pointer">Auto-Pilot Mode</Label>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  When enabled, the agent will automatically publish content that scores above the {confidenceThreshold}% confidence threshold directly to your connected social accounts.
                </p>
              </div>
              <Switch id="auto-pilot" checked={autoPilotEnabled} onCheckedChange={setAutoPilotEnabled} />
            </div>
            {autoPilotEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={(v) => setConfidenceThreshold(v[0])}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Content scoring ≥ {confidenceThreshold}% will be auto-published. Lower = more auto-publishes, higher = stricter quality gate.
                </p>
              </div>
            )}
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
              Be specific for better results. The agent searches YouTube for trending videos in this niche.
            </p>
          </CardContent>
        </Card>

        {/* Channel Remixer */}
        <Card className={`border-2 transition-colors ${remixChannelEnabled ? "border-red-500/50 bg-red-500/5" : ""}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-red-500" />
              Channel Remixer
              <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">NEW</Badge>
            </CardTitle>
            <CardDescription>
              Remix your own top-performing YouTube videos into fresh X and LinkedIn content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="remix-channel" className="cursor-pointer">Enable Remix My Channel</Label>
              <Switch id="remix-channel" checked={remixChannelEnabled} onCheckedChange={setRemixChannelEnabled} />
            </div>
            {remixChannelEnabled && (
              <div className="space-y-2">
                <Label htmlFor="yt-channel-id" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500" />
                  YouTube Channel ID
                </Label>
                <Input
                  id="yt-channel-id"
                  placeholder="e.g., UCxxxxxxxxxxxxxxxxxxxxxxx"
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find your Channel ID at YouTube Studio → Settings → Channel → Advanced settings. The agent will scan your top 3 videos from the last 90 days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discovery Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Discovery Frequency
            </CardTitle>
            <CardDescription>
              How often should the agent scan for new trending videos?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={String(frequencyHours)} onValueChange={(v) => setFrequencyHours(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">
                  ⚡ High Intensity (6 Hours) — Fast-moving niches
                </SelectItem>
                <SelectItem value="12">
                  ⚖️ Balanced (12 Hours) — Recommended
                </SelectItem>
                <SelectItem value="24">
                  🌿 Daily (24 Hours) — Evergreen & credit-saving
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Higher frequency uses more credits. Choose based on how fast your niche moves.
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
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Email Notifications</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Get a digest email when your agent discovers new trending videos.
                </p>
              </div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="self-end sm:self-auto" />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !topic.trim()}
            className="flex-1 w-full sm:w-auto"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending || !topic.trim() || !isActive}
            className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/10"
          >
            {runNowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Now
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
