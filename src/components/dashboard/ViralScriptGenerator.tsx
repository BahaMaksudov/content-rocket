import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HookLab } from "./viral/HookLab";
import { SceneBreakdown } from "./viral/SceneBreakdown";
import { CaptionsSection } from "./viral/CaptionsSection";
import type { ViralScriptResult, Duration, Tone, Platform } from "./viral/types";
import { DURATION_OPTIONS, TONE_OPTIONS, PLATFORM_OPTIONS } from "./viral/types";

const VIRAL_STORAGE_KEY = "vidlogic_viral_script_v2";

export type { ViralScriptResult as ViralScriptContent };

export function ViralScriptGenerator() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<Duration>("30s");
  const [tone, setTone] = useState<Tone>("hype");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [voiceMode, setVoiceMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ViralScriptResult | null>(() => {
    try {
      const raw = localStorage.getItem(VIRAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) localStorage.setItem(VIRAL_STORAGE_KEY, JSON.stringify(result));
  }, [result]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ variant: "destructive", title: "Enter a topic", description: "Please enter a topic or idea first." });
      return;
    }

    setIsGenerating(true);
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const { data, error } = await supabase.functions.invoke("generate-viral-script", {
        body: { topic: topic.trim(), duration, tone, platform, voiceMode },
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
      setResult(data as ViralScriptResult);
      toast({ title: "Script generated!", description: "Your viral video script is ready." });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: any) {
      console.error("Viral script error:", err);
      toast({ variant: "destructive", title: "Generation failed", description: err.message || "Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Tone</label>
              <div className="flex flex-wrap gap-2">
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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Platform</label>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col justify-end">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Voice</label>
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="voice-mode" className="text-sm cursor-pointer select-none">
                  Voice-Optimized
                </Label>
                <Switch
                  id="voice-mode"
                  checked={voiceMode}
                  onCheckedChange={setVoiceMode}
                  className="ml-1"
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
            disabled={isGenerating || !topic.trim()}
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
              <HookLab hooks={result.hooks} />
              <SceneBreakdown scenes={result.scenes} />
              <CaptionsSection
                overlays={result.overlays}
                socialCaption={result.socialCaption}
                hashtags={result.hashtags}
              />
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
    </div>
  );
}
