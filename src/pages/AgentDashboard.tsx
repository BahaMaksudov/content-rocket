import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Rocket, Check, Eye, Loader2, Target, CalendarDays, Zap, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

type AgentGoal = {
  id: string;
  niche: string;
  platform: string;
  videos_per_week: number;
  tone: string;
  created_at: string;
};

type ContentPlan = {
  id: string;
  goal_id: string;
  day_number: number;
  topic: string;
  hook_type: string | null;
  status: string;
  created_at: string;
};

type AgentScript = {
  id: string;
  plan_id: string;
  hook: string | null;
  script_body: any;
  caption: string | null;
  hashtags: string[] | null;
  created_at: string;
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AgentDashboard() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<AgentGoal | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [scripts, setScripts] = useState<Record<string, AgentScript>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingScript, setGeneratingScript] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Onboarding form
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("educational");
  const [videosPerWeek, setVideosPerWeek] = useState(7);

  // Feedback
  const [feedback, setFeedback] = useState<Record<string, { rating: string; comment?: string }>>({});
  const [downvoteOpen, setDownvoteOpen] = useState<string | null>(null);

  // Slide-over
  const [viewingScript, setViewingScript] = useState<AgentScript | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch latest goal
    const { data: goals } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (goals && goals.length > 0) {
      const g = goals[0] as AgentGoal;
      setGoal(g);

      // Fetch plans for this goal
      const { data: planData } = await supabase
        .from("content_plans")
        .select("*")
        .eq("goal_id", g.id)
        .order("day_number", { ascending: true });

      if (planData) {
        setPlans(planData as ContentPlan[]);

        // Fetch scripts for completed plans
        const completedIds = (planData as ContentPlan[])
          .filter((p) => p.status === "completed")
          .map((p) => p.id);

        if (completedIds.length > 0) {
          const { data: scriptData } = await supabase
            .from("agent_scripts")
            .select("*")
            .in("plan_id", completedIds);

          if (scriptData) {
            const map: Record<string, AgentScript> = {};
            (scriptData as AgentScript[]).forEach((s) => {
              map[s.plan_id] = s;
            });
            setScripts(map);
          }
        }

        // Fetch feedback for all plans
        const allPlanIds = (planData as ContentPlan[]).map((p) => p.id);
        if (allPlanIds.length > 0) {
          const { data: fbData } = await supabase
            .from("content_feedback")
            .select("plan_id, rating, comment")
            .in("plan_id", allPlanIds);

          if (fbData) {
            const fbMap: Record<string, { rating: string; comment?: string }> = {};
            (fbData as any[]).forEach((f) => {
              fbMap[f.plan_id] = { rating: f.rating, comment: f.comment };
            });
            setFeedback(fbMap);
          }
        }
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOnboard = async () => {
    if (!niche.trim()) {
      toast.error("Please enter your niche");
      return;
    }
    setGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-planner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            niche: niche.trim(),
            platform,
            videos_per_week: videosPerWeek,
            tone,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate plan");
      }

      toast.success("Content plan generated!");
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const generateScriptForPlan = async (plan: ContentPlan) => {
    setGeneratingScript(plan.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      // Call the viral script generator with the plan topic as context
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-viral-script`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            topic: plan.topic,
            platform: goal?.platform || "TikTok",
            tone: goal?.tone || "educational",
            voiceMode: true,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Script generation failed");
      }

      const scriptResult = await res.json();

      // Save to agent_scripts
      await supabase.from("agent_scripts").insert({
        plan_id: plan.id,
        user_id: user!.id,
        hook: scriptResult.hook || scriptResult.hooks?.[0] || plan.topic,
        script_body: scriptResult,
        caption: scriptResult.caption || null,
        hashtags: scriptResult.hashtags || null,
      });

      // Mark plan as completed
      await supabase
        .from("content_plans")
        .update({ status: "completed" })
        .eq("id", plan.id);

      toast.success(`Script generated for Day ${plan.day_number}!`);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate script");
    } finally {
      setGeneratingScript(null);
    }
  };

  const handleBatchGenerate = async () => {
    const pending = plans.filter((p) => p.status === "pending");
    if (pending.length === 0) {
      toast.info("All scripts are already generated!");
      return;
    }

    setBatchGenerating(true);
    let successCount = 0;

    for (const plan of pending) {
      try {
        await generateScriptForPlan(plan);
        successCount++;
      } catch {
        // individual error already toasted
      }
    }

    setBatchGenerating(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} script${successCount > 1 ? "s" : ""}!`);
    }
  };

  const submitFeedback = async (planId: string, rating: "up" | "down", comment?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("content_feedback").upsert(
        { user_id: user.id, plan_id: planId, rating, comment: comment || null },
        { onConflict: "user_id,plan_id" }
      );
      if (error) throw error;
      setFeedback((prev) => ({ ...prev, [planId]: { rating, comment } }));
      setDownvoteOpen(null);
      toast.success(rating === "up" ? "Thanks for the feedback!" : "Feedback saved");
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const openScript = (plan: ContentPlan) => {
    const script = scripts[plan.id];
    if (script) {
      setViewingScript(script);
      setSheetOpen(true);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // === ONBOARDING VIEW ===
  if (!goal) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Launch Your Content Agent</h1>
              <p className="text-muted-foreground">Tell us about your content goals and we'll plan your entire week.</p>
            </div>

            <Card className="border-primary/20 bg-card/80 backdrop-blur">
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="niche" className="text-foreground">Your Niche</Label>
                  <Input
                    id="niche"
                    placeholder="e.g. AI Tools, Fitness, Finance..."
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
                      <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="entertaining">Entertaining</SelectItem>
                      <SelectItem value="motivational">Motivational</SelectItem>
                      <SelectItem value="controversial">Controversial</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Videos Per Week</Label>
                  <Select value={String(videosPerWeek)} onValueChange={(v) => setVideosPerWeek(Number(v))}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} videos</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleOnboard}
                  disabled={generating || !niche.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Plan...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Generate My Content Plan</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // === WEEKLY GRID VIEW ===
  const pendingCount = plans.filter((p) => p.status === "pending").length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Your Content Week
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {goal.niche} · {goal.platform} · {goal.tone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Button
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {batchGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Rocket className="h-4 w-4 mr-2" /> Generate Entire Week ({pendingCount})</>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGoal(null);
                setPlans([]);
                setScripts({});
              }}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <Zap className="h-4 w-4 mr-1" /> New Plan
            </Button>
          </div>
        </motion.div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {plans.map((plan, i) => {
              const isCompleted = plan.status === "completed";
              const isGenerating = generatingScript === plan.id;
              const dayLabel = DAY_LABELS[plan.day_number - 1] || `Day ${plan.day_number}`;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`relative overflow-hidden transition-all duration-300 ${
                      isCompleted
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:border-primary/20 bg-card"
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            isCompleted
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {dayLabel}
                        </Badge>
                        {isCompleted && (
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-sm font-semibold text-foreground leading-snug mt-2">
                        {plan.topic}
                      </CardTitle>
                      {plan.hook_type && (
                        <CardDescription className="text-xs">
                          Hook: {plan.hook_type}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="pt-2 space-y-2">
                      {isCompleted ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => openScript(plan)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View Script
                          </Button>

                          {/* Feedback row */}
                          <div className="flex items-center justify-center gap-2 pt-1">
                            {feedback[plan.id] ? (
                              <span className="text-xs text-muted-foreground">
                                {feedback[plan.id].rating === "up" ? "👍" : "👎"} Feedback saved
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => submitFeedback(plan.id, "up")}
                                  className="p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                                  title="Good script"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                </button>

                                <Popover
                                  open={downvoteOpen === plan.id}
                                  onOpenChange={(open) => setDownvoteOpen(open ? plan.id : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                                      title="Bad script"
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2" side="top">
                                    <p className="text-xs font-medium text-foreground mb-2">What was wrong?</p>
                                    <div className="flex flex-col gap-1">
                                      {["Too long", "Wrong tone", "Boring"].map((reason) => (
                                        <button
                                          key={reason}
                                          onClick={() => submitFeedback(plan.id, "down", reason)}
                                          className="text-xs text-left px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          {reason}
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                          onClick={() => generateScriptForPlan(plan)}
                          disabled={isGenerating || batchGenerating}
                        >
                          {isGenerating ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Script</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Script Slide-Over */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground">Generated Script</SheetTitle>
          </SheetHeader>

          {viewingScript && (
            <div className="mt-6 space-y-5">
              {viewingScript.hook && (
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Hook</h3>
                  <p className="text-sm text-foreground">{viewingScript.hook}</p>
                </div>
              )}

              {viewingScript.script_body && (
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Script</h3>
                  <pre className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-4 border border-border">
                    {typeof viewingScript.script_body === "string"
                      ? viewingScript.script_body
                      : JSON.stringify(viewingScript.script_body, null, 2)}
                  </pre>
                </div>
              )}

              {viewingScript.caption && (
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Caption</h3>
                  <p className="text-sm text-foreground">{viewingScript.caption}</p>
                </div>
              )}

              {viewingScript.hashtags && viewingScript.hashtags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Hashtags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingScript.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
