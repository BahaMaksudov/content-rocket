import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Mic, Lock, Crown, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductionGuideModal } from "./ProductionGuideModal";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
import { PremiumModal } from "@/components/PremiumModal";
import { HookLab } from "./viral/HookLab";
import { SceneBreakdown } from "./viral/SceneBreakdown";
import { CaptionsSection } from "./viral/CaptionsSection";
import type { ViralScriptResult, Duration, Tone, Platform } from "./viral/types";
import { DURATION_OPTIONS, TONE_OPTIONS, PLATFORM_OPTIONS } from "./viral/types";

const VIRAL_STORAGE_KEY = "vidlogic_viral_script_v2";
const VIRAL_HISTORY_KEY = "vidlogic_viral_history";

export type { ViralScriptResult as ViralScriptContent };

type RegeneratingSection = "hooks" | "scenes" | "captions" | null;

type PersistedViralScript = {
  topic: string;
  duration: Duration;
  tone: Tone;
  platform: Platform;
  voiceMode: boolean;
  result: ViralScriptResult | null;
};

function loadPersistedViralScript(): PersistedViralScript {
  try {
    const raw = localStorage.getItem(VIRAL_STORAGE_KEY);
    if (!raw) {
      return { topic: "", duration: "30s", tone: "hype", platform: "tiktok", voiceMode: false, result: null };
    }
    const parsed = JSON.parse(raw);
    if (parsed?.hooks && parsed?.scenes) {
      return { topic: "", duration: "30s", tone: "hype", platform: "tiktok", voiceMode: false, result: parsed as ViralScriptResult };
    }
    return {
      topic: parsed?.topic ?? "",
      duration: parsed?.duration ?? "30s",
      tone: parsed?.tone ?? "hype",
      platform: parsed?.platform ?? "tiktok",
      voiceMode: parsed?.voiceMode ?? false,
      result: parsed?.result ?? null,
    };
  } catch {
    return { topic: "", duration: "30s", tone: "hype", platform: "tiktok", voiceMode: false, result: null };
  }
}

function isResultSavedToHistory(result: ViralScriptResult): boolean {
  try {
    const raw = localStorage.getItem(VIRAL_HISTORY_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(entries)) return false;
    const target = JSON.stringify(result);
    return entries.some((entry) => JSON.stringify(entry?.result) === target);
  } catch {
    return false;
  }
}

/** PRO badge overlay for locked features */
function ProBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-[inherit] cursor-pointer group transition-all hover:bg-background/70"
    >
      <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-1.5 px-3 py-1 text-xs shadow-lg group-hover:scale-105 transition-transform">
        <Crown className="h-3 w-3" />
        PRO
      </Badge>
    </button>
  );
}

export function ViralScriptGenerator() {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const { creditsAvailable, creditLimit, useCredit, useHalfCredit, refreshCredits } = useCredits();
  const persistedRef = useRef<PersistedViralScript>(loadPersistedViralScript());

  const [topic, setTopic] = useState(persistedRef.current.topic);
  const [duration, setDuration] = useState<Duration>(persistedRef.current.duration);
  const [tone, setTone] = useState<Tone>(persistedRef.current.tone);
  const [platform, setPlatform] = useState<Platform>(persistedRef.current.platform);
  const [voiceMode, setVoiceMode] = useState(persistedRef.current.voiceMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState<RegeneratingSection>(null);
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);
  const [result, setResult] = useState<ViralScriptResult | null>(persistedRef.current.result);
  const outputRef = useRef<HTMLDivElement>(null);

  // Guide modal
  const [showGuide, setShowGuide] = useState(false);
  // Upsell modal state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"viral-voice-mode" | "viral-scene-blueprint" | "viral-platform-tone" | "viral-regeneration">("viral-voice-mode");

  // Tier capabilities
  const isFree = tier === "free";
  const isStarter = tier === "starter";
  const isPro = tier === "pro" || tier === "agency";
  const canUseToneSelector = true; // available to all tiers
  const canUsePlatformSelector = true; // available to all tiers
  const canUseVoiceMode = true; // available to all tiers
  const canUseSceneBlueprint = !isFree; // starter+ (basic), pro+ (full)
  const canUseRegeneration = isPro; // pro+ only for unlimited regen
  const maxHooks = isFree ? 3 : isStarter ? 5 : 999;

  const openUpgradeModal = (feature: typeof upgradeFeature) => {
    setUpgradeFeature(feature);
    setShowUpgrade(true);
  };

  useEffect(() => {
    if (!result) return;
    localStorage.setItem(VIRAL_STORAGE_KEY, JSON.stringify({ topic, duration, tone, platform, voiceMode, result }));
  }, [result, topic, duration, tone, platform, voiceMode]);

  useEffect(() => {
    setIsSavedToHistory(result ? isResultSavedToHistory(result) : false);
  }, [result]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ variant: "destructive", title: "Enter a topic", description: "Please enter a topic or idea first." });
      return;
    }

    // Deduct 1 credit
    const creditUsed = await useCredit();
    if (!creditUsed) {
      toast({ variant: "destructive", title: "No credits remaining", description: "Please upgrade your plan to continue generating." });
      return;
    }

    setIsGenerating(true);
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      // Get a fresh session so we send a valid JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast({ variant: "destructive", title: "Please sign in", description: "You must be signed in to generate scripts." });
        setIsGenerating(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-viral-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          duration,
          tone: canUseToneSelector ? tone : "hype",
          platform: canUsePlatformSelector ? platform : "tiktok",
          voiceMode: canUseVoiceMode ? voiceMode : false,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast({ variant: "destructive", title: "AI credits exhausted", description: "Please add more credits to continue." });
          return;
        }
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Request failed (${response.status})`);
      }

      const data = await response.json();

      if (data?.error) throw new Error(data.error);
      setResult(data as ViralScriptResult);
      setIsSavedToHistory(false);

      await refreshCredits();
      const remaining = Math.max(0, creditsAvailable - 1);
      toast({ title: "Script generated!", description: `1 credit used. ${remaining} remaining.` });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: any) {
      console.error("Viral script error:", err);
      toast({ variant: "destructive", title: "Generation failed", description: err.message || "Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: "hooks" | "scenes" | "captions") => {
    if (!result) return;

    // Free users can't regenerate at all; starter users get limited
    if (!canUseRegeneration) {
      openUpgradeModal("viral-regeneration");
      return;
    }

    // Deduct credit for regeneration
    const creditUsed = await useHalfCredit();
    if (!creditUsed) {
      toast({ variant: "destructive", title: "No credits remaining", description: "Please upgrade your plan to continue." });
      return;
    }

    const topicForRegeneration = topic.trim() || "Viral video topic";

    setRegenerating(section);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-viral-section", {
        body: { section, topic: topicForRegeneration, tone, platform, duration, currentResult: result },
      });

      if (error) {
        const status = error?.context?.status;
        const message = typeof error?.message === "string" ? error.message : "";
        if (status === 402 || message.includes("AI_CREDITS_EXHAUSTED")) {
          toast({ variant: "destructive", title: "AI credits exhausted", description: "Please add more credits to continue." });
          return;
        }
        throw error;
      }

      if (data?.error) throw new Error(data.error);

      setResult((prev) => {
        if (!prev) return prev;
        if (section === "hooks" && data.hooks) return { ...prev, hooks: data.hooks };
        if (section === "scenes" && data.scenes) return { ...prev, scenes: data.scenes };
        if (section === "captions") {
          return { ...prev, ...(data.overlays && { overlays: data.overlays }), ...(data.socialCaption && { socialCaption: data.socialCaption }), ...(data.hashtags && { hashtags: data.hashtags }) };
        }
        return prev;
      });

      setIsSavedToHistory(false);
      await refreshCredits();
      const remaining = Math.max(0, creditsAvailable - 0.5);
      const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);
      toast({ title: "Section regenerated!", description: `0.5 credit used. ${fmt(remaining)} remaining.` });
    } catch (err: any) {
      console.error(`Regenerate ${section} error:`, err);
      toast({ variant: "destructive", title: "Regeneration failed", description: err.message || "Please try again." });
    } finally {
      setRegenerating(null);
    }
  };

  // Limit hooks displayed for free/starter
  const displayedHooks = result?.hooks ? result.hooks.slice(0, maxHooks) : [];
  const hasHiddenHooks = result?.hooks && result.hooks.length > maxHooks;

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Viral Script Creator
          </CardTitle>
          <CardDescription>
            Enter a topic and generate a high-energy script optimized for TikTok, Reels & Shorts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration, Tone & Voice Mode */}
          <div className="flex flex-wrap items-start gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Duration</label>
              <div className="flex rounded-full bg-slate-800 p-1 w-fit">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      duration === opt.value
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone - locked for free */}
            <div className="relative">
              {!canUseToneSelector && <ProBadge onClick={() => openUpgradeModal("viral-platform-tone")} />}
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Tone
                {!canUseToneSelector && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground/50" />}
              </label>
              <div className={`flex flex-wrap gap-2 ${!canUseToneSelector ? "opacity-40 pointer-events-none" : ""}`}>
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                      tone === opt.value
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform - locked for free */}
            <div className="relative">
              {!canUsePlatformSelector && <ProBadge onClick={() => openUpgradeModal("viral-platform-tone")} />}
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Platform
                {!canUsePlatformSelector && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground/50" />}
              </label>
              <div className={`flex flex-wrap gap-2 ${!canUsePlatformSelector ? "opacity-40 pointer-events-none" : ""}`}>
                {PLATFORM_OPTIONS.map((opt) => {
                  const brandStyles: Record<string, string> = {
                    "tiktok": "border-pink-500 bg-gradient-to-r from-[#ff0050]/15 to-[#00f2ea]/15 text-pink-400 shadow-[0_0_10px_rgba(255,0,80,0.4)]",
                    "youtube-shorts": "border-red-500 bg-red-500/15 text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.4)]",
                    "instagram-reels": "border-fuchsia-500 bg-gradient-to-r from-[#f58529]/15 via-[#dd2a7b]/15 to-[#8134af]/15 text-fuchsia-400 shadow-[0_0_10px_rgba(221,42,123,0.4)]",
                  };
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPlatform(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                        platform === opt.value
                          ? brandStyles[opt.value]
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <span className="mr-1">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Mode - pro+ only */}
            <div className="relative flex flex-col justify-end">
              {!canUseVoiceMode && <ProBadge onClick={() => openUpgradeModal("viral-voice-mode")} />}
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Voice
                {!canUseVoiceMode && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground/50" />}
              </label>
              <div className={`flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 ${!canUseVoiceMode ? "opacity-40 pointer-events-none" : ""}`}>
                <Mic className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="voice-mode" className="text-sm cursor-pointer select-none">
                  Voice-Optimized
                </Label>
                <Switch
                  id="voice-mode"
                  checked={voiceMode}
                  onCheckedChange={setVoiceMode}
                  className="ml-1"
                  disabled={!canUseVoiceMode}
                />
              </div>
            </div>
          </div>

          <Textarea
            placeholder='e.g. "The future of AI agents" or "5 money habits that changed my life"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim() || creditsAvailable < 1}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      <div ref={outputRef}>
        {isGenerating && !result && (
          <Card className="border-border bg-card min-h-[400px] relative overflow-hidden">
            <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm rounded-[inherit]">
              <div className="text-center space-y-4">
                <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
                <div>
                  <p className="font-medium text-lg">Crafting your viral script…</p>
                  <p className="text-sm text-muted-foreground">Building hooks, scenes, overlays & captions</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <div className="relative">
            {/* Results header with guide button */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Your Script</h3>
              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                Quick Start Guide
              </button>
            </div>
            {isGenerating && (
              <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm rounded-xl">
                <div className="text-center space-y-4">
                  <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium text-lg">Crafting your viral script…</p>
                    <p className="text-sm text-muted-foreground">Building hooks, scenes, overlays & captions</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Hook Lab - show limited hooks for free/starter */}
              <div className="relative">
                <HookLab
                  hooks={displayedHooks}
                  onRegenerate={canUseRegeneration ? () => handleRegenerateSection("hooks") : undefined}
                  isRegenerating={regenerating === "hooks"}
                />
                {hasHiddenHooks && (
                  <div className="mt-2 px-4 pb-3">
                    <button
                      onClick={() => openUpgradeModal("viral-regeneration")}
                      className="w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-center text-sm text-muted-foreground hover:bg-primary/10 transition-colors"
                    >
                      <Crown className="inline h-3.5 w-3.5 mr-1.5 text-primary" />
                      {result.hooks.length - maxHooks} more hooks available — <span className="text-primary font-medium">Upgrade to unlock</span>
                    </button>
                  </div>
                )}
                {!canUseRegeneration && result && (
                  <div className="mt-2 px-4 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUpgradeModal("viral-regeneration")}
                      className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      🔄 Regenerate Hooks
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20 text-primary">PRO</Badge>
                    </Button>
                  </div>
                )}
              </div>

              {/* Scene-by-Scene Blueprint - locked for free */}
              {canUseSceneBlueprint ? (
                <SceneBreakdown
                  scenes={result.scenes}
                  selectedDuration={duration}
                  topic={topic.trim() || "Untitled viral script"}
                  tone={tone}
                  platform={platform}
                  result={result}
                  onRegenerate={canUseRegeneration ? () => handleRegenerateSection("scenes") : undefined}
                  isRegenerating={regenerating === "scenes"}
                  isSavedToHistory={isSavedToHistory}
                  onSavedToHistory={() => setIsSavedToHistory(true)}
                />
              ) : (
                <Card className="border-border bg-card relative overflow-hidden">
                  <ProBadge onClick={() => openUpgradeModal("viral-scene-blueprint")} />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base opacity-40">
                      <span>🎬</span> Scene-by-Scene Blueprint
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="opacity-30 blur-[2px] pointer-events-none">
                    <div className="space-y-3">
                      {result.scenes.slice(0, 2).map((scene, i) => (
                        <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="text-sm">{scene.script.slice(0, 60)}…</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Captions - available to all */}
              <CaptionsSection
                overlays={result.overlays}
                socialCaption={result.socialCaption}
                hashtags={result.hashtags}
                onRegenerate={canUseRegeneration ? () => handleRegenerateSection("captions") : undefined}
                isRegenerating={regenerating === "captions"}
              />

              {/* Regeneration locked notice for non-pro on captions */}
              {!canUseRegeneration && (
                <div className="px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openUpgradeModal("viral-regeneration")}
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    🔄 Regenerate Captions
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20 text-primary">PRO</Badge>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!result && !isGenerating && (
          <Card className="border-border bg-card min-h-[300px] flex items-center justify-center">
            <div className="text-center space-y-2 p-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No script generated yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enter a topic above and click "Generate Script" to create a viral video script
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Upsell Modal */}
      <PremiumModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={upgradeFeature}
        description={
          upgradeFeature === "viral-voice-mode"
            ? "Unlock Voice-Optimized scripts and Scene Blueprints with Pro."
            : upgradeFeature === "viral-scene-blueprint"
            ? "Get detailed Scene-by-Scene Blueprints with visual cues."
            : upgradeFeature === "viral-platform-tone"
            ? "Customize tone and platform for targeted viral content."
            : "Unlock unlimited section regeneration with Pro."
        }
        tier="pro"
      />
      <ProductionGuideModal open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}
