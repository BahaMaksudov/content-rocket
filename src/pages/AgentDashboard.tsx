import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgentScriptDrawer } from "@/components/dashboard/AgentScriptDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Rocket, Check, Eye, Loader2, Target, CalendarDays, Zap, 
  ThumbsUp, ThumbsDown, ArrowLeft, History, Archive, ChevronRight, Lock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type AgentGoal = {
  id: string;
  niche: string;
  platform: string;
  videos_per_week: number;
  tone: string;
  created_at: string;
  batch_status: string;
  batch_progress: number;
  goal_status?: string;
  start_date?: string | null;
  end_date?: string | null;
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
  const { isPaid, openCheckout } = useSubscription();
  const { useCredit, getLatestCredits, refreshCredits, canUseCredits, creditsAvailable } = useCredits();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<AgentGoal | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [scripts, setScripts] = useState<Record<string, AgentScript>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingScript, setGeneratingScript] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const batchRunningRef = useRef(false);

  // Onboarding form
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("educational");
  const [videosPerWeek, setVideosPerWeek] = useState(7);

  // Feedback
  const [feedback, setFeedback] = useState<Record<string, { rating: string; comment?: string }>>({});
  const [downvoteOpen, setDownvoteOpen] = useState<string | null>(null);

  // Slide-over
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // History
  const [archivedGoals, setArchivedGoals] = useState<AgentGoal[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingArchivedGoal, setViewingArchivedGoal] = useState<AgentGoal | null>(null);
  const [archivedPlans, setArchivedPlans] = useState<ContentPlan[]>([]);
  const [archivedScripts, setArchivedScripts] = useState<Record<string, AgentScript>>({});
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Sync breadcrumb view param
  useEffect(() => {
    if (loading) return;
    let view = "setup";
    if (viewingArchivedGoal) {
      view = "history";
    } else if (goal && !showOnboarding) {
      view = "weekly";
    }
    navigate(`/agent?view=${view}`, { replace: true });
  }, [goal, showOnboarding, loading, navigate, viewingArchivedGoal]);

  const fetchData = useCallback(async (skipLoadingState = false) => {
    if (!user) return null;
    if (!skipLoadingState) setLoading(true);

    // Fetch latest ACTIVE goal
    const { data: goals } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("user_id", user.id)
      .filter("goal_status", "eq", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    // Fetch archived goals
    const { data: archived } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("user_id", user.id)
      .filter("goal_status", "eq", "archived")
      .order("created_at", { ascending: false });

    if (archived) {
      setArchivedGoals(archived as AgentGoal[]);
    }

    let currentGoal: AgentGoal | null = null;
    let currentPlans: ContentPlan[] = [];

    if (goals && goals.length > 0) {
      const g = goals[0] as AgentGoal;
      currentGoal = g;
      setGoal(g);

      // Fetch plans for this goal
      const { data: planData } = await supabase
        .from("content_plans")
        .select("*")
        .eq("goal_id", g.id)
        .order("day_number", { ascending: true });

      if (planData) {
        currentPlans = planData as ContentPlan[];
        setPlans(currentPlans);

        // Fetch scripts for completed plans
        const completedIds = currentPlans
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
        const allPlanIds = currentPlans.map((p) => p.id);
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
    } else {
      setGoal(null);
      setPlans([]);
      setScripts({});
    }

    if (!skipLoadingState) setLoading(false);
    return { goal: currentGoal, plans: currentPlans };
  }, [user]);

  // Initial load + auto-resume batch if interrupted
  useEffect(() => {
    const init = async () => {
      const result = await fetchData();
      if (result?.goal?.batch_status === "generating" && !batchRunningRef.current) {
        const pending = result.plans.filter((p) => p.status === "pending");
        if (pending.length > 0) {
          toast.info("Resuming batch generation...");
          runBatch(result.goal, pending);
        } else {
          await supabase
            .from("agent_goals")
            .update({ batch_status: "idle", batch_progress: 0 })
            .eq("id", result.goal.id);
        }
      }
    };
    init();
  }, [fetchData]);

  const archiveCurrentGoal = async () => {
    if (!goal) return;
    await supabase
      .from("agent_goals")
      .update({ 
        goal_status: "archived", 
        end_date: new Date().toISOString() 
      } as any)
      .eq("id", goal.id);
  };

  const handleOnboard = async () => {
    if (!niche.trim()) {
      toast.error("Please enter your niche");
      return;
    }
    setGenerating(true);

    try {
      // Archive existing active goal first
      if (goal) {
        await archiveCurrentGoal();
      }

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
      setShowOnboarding(false);
      setViewingArchivedGoal(null);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const loadArchivedGoalData = async (archivedGoal: AgentGoal) => {
    setLoadingArchive(true);
    setViewingArchivedGoal(archivedGoal);
    setShowHistory(false);

    const { data: planData } = await supabase
      .from("content_plans")
      .select("*")
      .eq("goal_id", archivedGoal.id)
      .order("day_number", { ascending: true });

    const loadedPlans = (planData || []) as ContentPlan[];
    setArchivedPlans(loadedPlans);

    const completedIds = loadedPlans.filter((p) => p.status === "completed").map((p) => p.id);
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
        setArchivedScripts(map);
      }
    } else {
      setArchivedScripts({});
    }

    setLoadingArchive(false);
  };

  const generateScriptForPlan = async (plan: ContentPlan, skipCreditCheck = false) => {
    // Deduct 1 credit before generating (unless already handled by batch caller)
    if (!skipCreditCheck) {
      const success = await useCredit();
      if (!success) {
        toast.error("No credits remaining — upgrade to continue.", {
          action: { label: "Upgrade", onClick: () => navigate("/billing") },
          duration: 6000,
        });
        throw new Error("INSUFFICIENT_CREDITS");
      }
    }

    setGeneratingScript(plan.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

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

      await supabase.from("agent_scripts").insert({
        plan_id: plan.id,
        user_id: user!.id,
        hook: scriptResult.hook || scriptResult.hooks?.[0] || plan.topic,
        script_body: scriptResult,
        caption: scriptResult.caption || null,
        hashtags: scriptResult.hashtags || null,
      });

      await supabase
        .from("content_plans")
        .update({ status: "completed" })
        .eq("id", plan.id);

      toast.success(`Script generated for Day ${plan.day_number}!`);
      await fetchData();
    } catch (e: any) {
      if (e.message !== "INSUFFICIENT_CREDITS") {
        toast.error(e.message || "Failed to generate script");
      }
      throw e;
    } finally {
      setGeneratingScript(null);
    }
  };

  const updateBatchStatus = async (goalId: string, status: string, progress: number) => {
    await supabase
      .from("agent_goals")
      .update({ batch_status: status, batch_progress: progress })
      .eq("id", goalId);
  };

  const runBatch = async (currentGoal: AgentGoal, pending: ContentPlan[]) => {
    if (batchRunningRef.current) return;
    batchRunningRef.current = true;
    setBatchGenerating(true);
    setBatchTotal(pending.length);
    setBatchProgress(0);

    await updateBatchStatus(currentGoal.id, "generating", 0);
    let successCount = 0;

    for (const plan of pending) {
      // Check credits before each script in the batch
      const creditOk = await useCredit();
      if (!creditOk) {
        toast.error(
          `Ran out of credits after ${successCount} script${successCount !== 1 ? "s" : ""}. Upgrade to finish the remaining ${pending.length - successCount - (successCount === 0 ? 0 : 0)} days.`,
          { action: { label: "Upgrade", onClick: () => navigate("/billing") }, duration: 8000 }
        );
        break;
      }

      try {
        await generateScriptForPlan(plan, true); // skip inner credit check — already deducted
        successCount++;
        setBatchProgress(successCount);
        await updateBatchStatus(currentGoal.id, "generating", successCount);
      } catch {
        // individual error already toasted
      }
    }

    await updateBatchStatus(currentGoal.id, "idle", 0);
    setBatchGenerating(false);
    batchRunningRef.current = false;

    if (successCount > 0) {
      toast.success(`Generated ${successCount} script${successCount > 1 ? "s" : ""}!`);
    }
    await fetchData(true);
    // Refresh credits sidebar display
    await refreshCredits();
  };

  const handleBatchGenerate = async () => {
    const pending = plans.filter((p) => p.status === "pending");
    if (pending.length === 0) {
      toast.info("All scripts are already generated!");
      return;
    }
    if (!goal) return;

    // Pre-flight credit check
    const latest = await getLatestCredits();
    const available = latest?.creditsAvailable ?? creditsAvailable;
    if (available < pending.length) {
      if (available <= 0) {
        toast.error("No credits remaining — upgrade to generate scripts.", {
          action: { label: "Upgrade", onClick: () => navigate("/billing") },
          duration: 6000,
        });
        return;
      }
      toast.warning(
        `You have ${Number.isInteger(available) ? available : available.toFixed(1)} credit${available !== 1 ? "s" : ""} but need ${pending.length}. The batch will stop when credits run out.`,
        { duration: 6000 }
      );
    }

    await runBatch(goal, pending);
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
    if (scripts[plan.id]) {
      setViewingPlanId(plan.id);
      setSheetOpen(true);
    }
  };

  const openArchivedScript = (plan: ContentPlan) => {
    if (archivedScripts[plan.id]) {
      setViewingPlanId(plan.id);
      setSheetOpen(true);
    }
  };

  const completedPlans = plans.filter((p) => p.status === "completed");
  const viewingPlan = viewingArchivedGoal 
    ? archivedPlans.find((p) => p.id === viewingPlanId) || null
    : plans.find((p) => p.id === viewingPlanId) || null;
  const activeScripts = viewingArchivedGoal ? archivedScripts : scripts;
  const viewingScript = viewingPlanId ? activeScripts[viewingPlanId] || null : null;
  const activePlansForNav = viewingArchivedGoal 
    ? archivedPlans.filter((p) => p.status === "completed")
    : completedPlans;
  const viewingIndex = activePlansForNav.findIndex((p) => p.id === viewingPlanId);

  const handleDrawerNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? viewingIndex - 1 : viewingIndex + 1;
    if (newIndex >= 0 && newIndex < activePlansForNav.length) {
      setViewingPlanId(activePlansForNav[newIndex].id);
    }
  };

  const getWeekLabel = (g: AgentGoal) => {
    const start = g.start_date ? new Date(g.start_date) : new Date(g.created_at);
    const end = g.end_date ? new Date(g.end_date) : null;
    const startStr = format(start, "MMM d");
    const endStr = end ? format(end, "MMM d") : "present";
    return `Week of ${startStr} – ${endStr}`;
  };

  const getMonthLabel = (g: AgentGoal) => {
    const d = g.start_date ? new Date(g.start_date) : new Date(g.created_at);
    return format(d, "MMMM yyyy");
  };

  const groupedArchived = archivedGoals.reduce<Record<string, AgentGoal[]>>((acc, g) => {
    const month = getMonthLabel(g);
    if (!acc[month]) acc[month] = [];
    acc[month].push(g);
    return acc;
  }, {});

  // Determine which data to render in the grid
  const isViewingArchive = !!viewingArchivedGoal;
  const displayPlans = isViewingArchive ? archivedPlans : plans;
  const displayScripts = isViewingArchive ? archivedScripts : scripts;
  const displayGoal = isViewingArchive ? viewingArchivedGoal : goal;

  const exitArchiveView = () => {
    setViewingArchivedGoal(null);
    setArchivedPlans([]);
    setArchivedScripts({});
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-48 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Card key={i} className="border-border bg-card">
                <CardHeader className="pb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </CardHeader>
                <CardContent className="pt-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }


  // === ONBOARDING VIEW ===
  if (!goal || showOnboarding) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto px-4 pt-2 pb-5">
          {goal && (
            <div className="w-full text-left mb-2">
              <button
                onClick={() => setShowOnboarding(false)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Weekly Plan
              </button>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-2">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Launch Your Content Agent</h1>
              <p className="text-sm text-muted-foreground">Tell us about your content goals and we'll plan your entire week.</p>
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
        {/* Viewing Archive Banner */}
        <AnimatePresence>
          {isViewingArchive && viewingArchivedGoal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <Archive className="h-4 w-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Viewing Archive: {getWeekLabel(viewingArchivedGoal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {viewingArchivedGoal.niche} · {viewingArchivedGoal.platform} · Read-only
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exitArchiveView}
                className="border-primary/30 text-primary hover:bg-primary/10 flex-shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Return to Current Week
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {!isViewingArchive && (
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
              {(pendingCount > 0 || batchGenerating) && (
                <Button
                  onClick={handleBatchGenerate}
                  disabled={batchGenerating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  {batchGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating {batchProgress}/{batchTotal}...</>
                  ) : (
                    <><Rocket className="h-4 w-4 mr-2" /> Generate Entire Week ({pendingCount})</>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowHistory(true)}
                className="border-border text-muted-foreground hover:text-foreground"
                title="Plan History"
              >
                <History className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowOnboarding(true);
                  setNiche("");
                }}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <Zap className="h-4 w-4 mr-1" /> New Plan
              </Button>
            </div>
          </motion.div>
        )}

        {/* Weekly Grid */}
        {loadingArchive ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {displayPlans.map((plan, i) => {
                const isCompleted = plan.status === "completed";
                const isGenerating = generatingScript === plan.id;
                const dayLabel = DAY_LABELS[plan.day_number - 1] || `Day ${plan.day_number}`;
                const hasScript = !!displayScripts[plan.id];

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={`relative overflow-hidden transition-all duration-300 ${
                        isViewingArchive
                          ? isCompleted
                            ? "border-muted-foreground/20 bg-muted/30"
                            : "border-border bg-card opacity-60"
                          : isCompleted
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:border-primary/20 bg-card"
                      }`}
                    >
                      {isCompleted && !isViewingArchive && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
                      )}

                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              isCompleted && !isViewingArchive
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {dayLabel}
                          </Badge>
                          {isCompleted && (
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                              isViewingArchive ? "bg-muted" : "bg-primary/20"
                            }`}>
                              <Check className={`h-3.5 w-3.5 ${
                                isViewingArchive ? "text-muted-foreground" : "text-primary"
                              }`} />
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
                        {isViewingArchive ? (
                          isCompleted && hasScript ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => openArchivedScript(plan)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> View Script
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not generated</span>
                          )
                        ) : isCompleted ? (
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
        )}
      </div>

      {/* Script Drawer */}
      <AgentScriptDrawer
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        script={viewingScript}
        plan={viewingPlan}
        goal={displayGoal}
        onNavigate={handleDrawerNavigate}
        canNavigatePrev={viewingIndex > 0}
        canNavigateNext={viewingIndex < activePlansForNav.length - 1}
      />

      {/* History Drawer */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-primary" />
              Plan History
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="px-4 py-4 space-y-6">
              {!isPaid ? (
                /* Free user: blurred preview with upgrade CTA */
                <div className="relative">
                  <div className="blur-[6px] pointer-events-none select-none opacity-60 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 border border-transparent">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">Sample Niche #{i}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Week of Jan {i} – Jan {i + 6}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">TikTok · 7 videos</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Plan History is a paid feature</p>
                    <p className="text-xs text-muted-foreground mb-4 text-center px-4">
                      Upgrade to access your full archive of previous content weeks.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => { setShowHistory(false); openCheckout("starter"); }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Unlock History
                    </Button>
                  </div>
                </div>
              ) : archivedGoals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Archive className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No archived plans yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Previous weeks will appear here.</p>
                </div>
              ) : (
                Object.entries(groupedArchived).map(([month, goals]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      {month}
                    </p>
                    <div className="space-y-1.5">
                      {goals.map((ag) => {
                        const isSelected = viewingArchivedGoal?.id === ag.id;
                        return (
                          <button
                            key={ag.id}
                            onClick={() => {
                              loadArchivedGoalData(ag);
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              isSelected
                                ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                                : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                                  {ag.niche}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {getWeekLabel(ag)}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {ag.platform} · {ag.videos_per_week} videos
                                </p>
                              </div>
                              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${
                                isSelected ? "text-primary" : "text-muted-foreground"
                              }`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
