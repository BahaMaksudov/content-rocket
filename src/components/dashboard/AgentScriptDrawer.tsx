import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HookLab } from "@/components/dashboard/viral/HookLab";
import { SceneBreakdown } from "@/components/dashboard/viral/SceneBreakdown";
import { CaptionsSection } from "@/components/dashboard/viral/CaptionsSection";
import { ProductionGuideModal } from "@/components/dashboard/ProductionGuideModal";
import { CopyButton } from "@/components/dashboard/viral/CopyButton";
import { Copy, Download, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import type { ViralScriptResult, HookOption, SceneRow } from "@/components/dashboard/viral/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AgentScriptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: {
    id: string;
    plan_id: string;
    hook: string | null;
    script_body: any;
    caption: string | null;
    hashtags: string[] | null;
    created_at: string;
  } | null;
  plan: {
    id: string;
    topic: string;
    hook_type: string | null;
    day_number: number;
  } | null;
  goal: {
    platform: string;
    tone: string;
  } | null;
  /** Navigate between days */
  onNavigate?: (direction: "prev" | "next") => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parseScriptBody(scriptBody: any): ViralScriptResult | null {
  if (!scriptBody) return null;
  const data = typeof scriptBody === "string" ? JSON.parse(scriptBody) : scriptBody;

  // The script_body may already be a ViralScriptResult or a wrapper
  const hooks: HookOption[] = (data.hooks || []).map((h: any, i: number) => ({
    id: h.id ?? i + 1,
    text: h.text || h,
    style: h.style || "hook",
  }));

  const scenes: SceneRow[] = (data.scenes || []).map((s: any) => ({
    time: s.time || s.timing || "",
    script: s.script || s.dialogue || "",
    visual: s.visual || s.visuals || "",
  }));

  const overlays: string[] = data.overlays || data.onScreenOverlays || [];
  const socialCaption: string = data.socialCaption || data.caption || "";
  const hashtags: string[] = data.hashtags || [];

  return { hooks, scenes, overlays, socialCaption, hashtags };
}

function mapPlatform(platform: string): "tiktok" | "youtube-shorts" | "instagram-reels" {
  const p = platform.toLowerCase();
  if (p.includes("youtube")) return "youtube-shorts";
  if (p.includes("instagram") || p.includes("reel")) return "instagram-reels";
  return "tiktok";
}

function mapTone(tone: string): "hype" | "educational" | "funny" | "mysterious" {
  const t = tone.toLowerCase();
  if (t.includes("hype") || t.includes("entertaining") || t.includes("motivational")) return "hype";
  if (t.includes("funny") || t.includes("comedy")) return "funny";
  if (t.includes("mysterious") || t.includes("storytelling")) return "mysterious";
  return "educational";
}

export function AgentScriptDrawer({
  open,
  onOpenChange,
  script,
  plan,
  goal,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
}: AgentScriptDrawerProps) {
  const { user } = useAuth();
  const [productionGuideOpen, setProductionGuideOpen] = useState(false);
  const [regeneratingHooks, setRegeneratingHooks] = useState(false);
  const [regeneratingScenes, setRegeneratingScenes] = useState(false);
  const [regeneratingCaptions, setRegeneratingCaptions] = useState(false);
  const [localScriptBody, setLocalScriptBody] = useState<any>(null);

  // Use localScriptBody if we've regenerated, otherwise use script prop
  const activeBody = localScriptBody ?? script?.script_body;
  const parsed = parseScriptBody(activeBody);

  // Reset local overrides when script changes
  if (script && localScriptBody && script.script_body !== localScriptBody) {
    // Only reset if the source script changed (different plan)
  }

  const platform = mapPlatform(goal?.platform || "TikTok");
  const tone = mapTone(goal?.tone || "educational");
  const dayLabel = plan ? (DAY_LABELS[plan.day_number - 1] || `Day ${plan.day_number}`) : "";

  const handleRegenerateSection = async (section: "hooks" | "scenes" | "captions") => {
    if (!script || !plan || !goal || !user) return;

    const setLoading = section === "hooks" ? setRegeneratingHooks
      : section === "scenes" ? setRegeneratingScenes
      : setRegeneratingCaptions;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-viral-section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            section,
            topic: plan.topic,
            platform: goal.platform,
            tone: goal.tone,
            currentResult: activeBody,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Regeneration failed");
      }

      const newData = await res.json();
      const current = typeof activeBody === "string" ? JSON.parse(activeBody) : { ...activeBody };

      if (section === "hooks" && newData.hooks) current.hooks = newData.hooks;
      if (section === "scenes" && newData.scenes) current.scenes = newData.scenes;
      if (section === "captions") {
        if (newData.overlays) current.overlays = newData.overlays;
        if (newData.socialCaption) current.socialCaption = newData.socialCaption;
        if (newData.hashtags) current.hashtags = newData.hashtags;
      }

      // Save updated script to DB
      await supabase
        .from("agent_scripts")
        .update({ script_body: current })
        .eq("id", script.id);

      setLocalScriptBody(current);
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} regenerated!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate");
    } finally {
      setLoading(false);
    }
  };

  // Build full script text for copy
  const buildFullScript = (): string => {
    if (!parsed) return "";
    const parts: string[] = [];
    if (plan) parts.push(`📌 Topic: ${plan.topic}\n`);
    if (parsed.hooks.length > 0) {
      parts.push("🎣 HOOKS:");
      parsed.hooks.forEach((h, i) => parts.push(`  ${i + 1}. [${h.style}] ${h.text}`));
      parts.push("");
    }
    if (parsed.scenes.length > 0) {
      parts.push("🎬 SCENE BREAKDOWN:");
      parsed.scenes.forEach((s) => {
        parts.push(`  ⏱️ ${s.time}`);
        parts.push(`  🎙️ ${s.script}`);
        parts.push(`  🎬 ${s.visual}`);
        parts.push("");
      });
    }
    if (parsed.overlays.length > 0) {
      parts.push(`🎯 OVERLAYS: ${parsed.overlays.join(" | ")}\n`);
    }
    if (parsed.socialCaption) {
      parts.push(`🏷️ CAPTION: ${parsed.socialCaption}`);
    }
    if (parsed.hashtags.length > 0) {
      parts.push(`# ${parsed.hashtags.join(" ")}`);
    }
    return parts.join("\n");
  };

  const handleExportJSON = () => {
    if (!activeBody) return;
    const blob = new Blob([JSON.stringify(activeBody, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `script-${plan?.topic?.slice(0, 30).replace(/\s+/g, "-") || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto p-0" side="right">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <SheetHeader className="space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {plan && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                      {dayLabel}
                    </Badge>
                  )}
                  {plan?.hook_type && (
                    <Badge variant="outline" className="text-xs">
                      {plan.hook_type}
                    </Badge>
                  )}
                </div>

                {/* Navigation arrows */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canNavigatePrev}
                    onClick={() => onNavigate?.("prev")}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canNavigateNext}
                    onClick={() => onNavigate?.("next")}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <SheetTitle className="text-lg text-foreground mt-2 leading-snug">
                {plan?.topic || "Generated Script"}
              </SheetTitle>
            </SheetHeader>

            {/* Action bar */}
            <div className="flex items-center gap-2 mt-3">
              <CopyButton text={buildFullScript()} className="gap-1.5 text-xs" />
              <span className="text-xs text-muted-foreground">Copy All</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportJSON}>
                    Download JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(buildFullScript());
                    toast.success("Full script copied!");
                  }}>
                    Copy as Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setProductionGuideOpen(true)}
              >
                <Clapperboard className="h-3.5 w-3.5" /> Production Guide
              </Button>
            </div>
          </div>

          {/* Content */}
          {parsed ? (
            <div className="px-6 py-6 space-y-6">
              {/* Hooks */}
              {parsed.hooks.length > 0 && (
                <HookLab
                  hooks={parsed.hooks}
                  onRegenerate={() => handleRegenerateSection("hooks")}
                  isRegenerating={regeneratingHooks}
                />
              )}

              {/* Scene Breakdown */}
              {parsed.scenes.length > 0 && (
                <SceneBreakdown
                  scenes={parsed.scenes}
                  selectedDuration="30s"
                  topic={plan?.topic || ""}
                  tone={tone}
                  platform={platform}
                  result={parsed}
                  onRegenerate={() => handleRegenerateSection("scenes")}
                  isRegenerating={regeneratingScenes}
                  hideSave
                />
              )}

              {/* Captions & Overlays */}
              {(parsed.overlays.length > 0 || parsed.socialCaption || parsed.hashtags.length > 0) && (
                <CaptionsSection
                  overlays={parsed.overlays}
                  socialCaption={parsed.socialCaption}
                  hashtags={parsed.hashtags}
                  onRegenerate={() => handleRegenerateSection("captions")}
                  isRegenerating={regeneratingCaptions}
                />
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <p>No script data available.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ProductionGuideModal open={productionGuideOpen} onOpenChange={setProductionGuideOpen} />
    </>
  );
}
