import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { YouTubeInput } from "@/components/dashboard/YouTubeInput";
import { GenerationSettings } from "@/components/dashboard/GenerationSettings";
import { ContentOutput } from "@/components/dashboard/ContentOutput";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { BulkUpload } from "@/components/dashboard/BulkUpload";
import { PremiumModal } from "@/components/PremiumModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useCredits } from "@/hooks/use-credits";
import { useFetchTracking } from "@/hooks/use-fetch-tracking";
import { trackGenerationStarted, trackUpgradeClicked } from "@/lib/posthog";
import { toast as sonnerToast } from "sonner";
import { DEFAULT_BRAND_VOICES, isDefaultVoiceId, getDefaultVoiceById } from "@/lib/default-brand-voices";
import { useSyncPaymentHistoryOnce } from "@/hooks/use-sync-payment-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Layers, Lock } from "lucide-react";
import { TopTestimonialsWidget } from "@/components/social-proof/TopTestimonialsWidget";

const STORAGE_KEY = "vidlogic_dashboard_state";

interface PersistedDashboardState {
  generatedContent: GeneratedContent | null;
  youtubeUrl: string;
  videoTitle: string;
  transcript: string;
  transcriptMethod: "auto" | "manual" | null;
  contentActiveTab: string;
}

function loadPersistedState(): PersistedDashboardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDashboardState;
    // Only persist generated content and active tab — input state resets on mount
    return {
      generatedContent: parsed.generatedContent,
      youtubeUrl: "",
      videoTitle: "",
      transcript: "",
      transcriptMethod: null,
      contentActiveTab: parsed.contentActiveTab ?? "twitter",
    };
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedDashboardState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded – ignore */ }
}

export interface GeneratedContent {
  twitterHooks: string[];
  linkedinPost: string;
  shortFormScripts: Array<{ title: string; script: string; duration: string }>;
  blogPost: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { openCheckout, loading: subscriptionLoading, isAgency } = useSubscription();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore persisted state on mount
  const persisted = useRef(loadPersistedState());

  const [transcript, setTranscript] = useState(persisted.current?.transcript ?? "");
  const [transcriptMethod, setTranscriptMethod] = useState<"auto" | "manual" | null>(persisted.current?.transcriptMethod ?? null);
  const [videoTitle, setVideoTitle] = useState(persisted.current?.videoTitle ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(persisted.current?.youtubeUrl ?? "");
  // Default to "The Friendly Peer" preset
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<string | null>("default_friendly_peer");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(persisted.current?.generatedContent ?? null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showBulkUpgradeModal, setShowBulkUpgradeModal] = useState(false);
  const [upgradeProcessed, setUpgradeProcessed] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [includeSocialProof, setIncludeSocialProof] = useState(false);
  const [fairUseConfirmed, setFairUseConfirmed] = useState(false);
  const [contentActiveTab, setContentActiveTab] = useState(persisted.current?.contentActiveTab ?? "twitter");

  // Persist state whenever generated content or active content tab changes
  const persistState = useCallback(() => {
    savePersistedState({
      generatedContent,
      youtubeUrl,
      videoTitle,
      transcript,
      transcriptMethod,
      contentActiveTab,
    });
  }, [generatedContent, youtubeUrl, videoTitle, transcript, transcriptMethod, contentActiveTab]);

  useEffect(() => {
    persistState();
  }, [persistState]);

  // One-time backfill so Billing shows historical invoices (e.g. Feb 1) even if the webhook
  // wasn't configured at the time of payment.
  useSyncPaymentHistoryOnce();
  
  // Unified credits tracking
  const { canUseCredits, useCredit, refreshCredits } = useCredits();
  // Fetch count tracking for same-video credit protection
  const { resetFetchCount } = useFetchTracking();
  
  // Target language state (always used now)
  const [targetLanguage, setTargetLanguage] = useState("english");
  
  // Ref for scrolling to content output
  const contentOutputRef = useRef<HTMLDivElement>(null);
  // Ref for scrolling to YouTube input
  const youtubeInputRef = useRef<HTMLDivElement>(null);

  // Handle upgrade query parameter from landing page
  useEffect(() => {
    const upgradeTier = searchParams.get("upgrade") as "starter" | "pro" | "agency" | null;
    
    if (upgradeTier && !subscriptionLoading && !upgradeProcessed) {
      setUpgradeProcessed(true);
      
      // Clear the upgrade param from URL
      searchParams.delete("upgrade");
      setSearchParams(searchParams, { replace: true });
      
      // Track and trigger checkout
      trackUpgradeClicked(upgradeTier, "landing_page_redirect");
      
      openCheckout(upgradeTier).catch((error) => {
        console.error("Checkout error from landing redirect:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to start checkout";
        sonnerToast.error(errorMessage);
      });
    }
  }, [searchParams, setSearchParams, subscriptionLoading, upgradeProcessed, openCheckout]);
  // Fetch brand voices and auto-select default
  const { data: brandVoices } = useQuery({
    queryKey: ["brandVoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_voices")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Auto-select default brand voice if none selected
      if (data && data.length > 0 && !selectedBrandVoice) {
        const defaultVoice = data.find(v => v.is_default);
        if (defaultVoice) {
          setSelectedBrandVoice(defaultVoice.id);
        }
      }
      
      return data;
    },
    enabled: !!user,
  });

  const handleTranscriptFetched = (text: string, method: "auto" | "manual", title?: string) => {
    // Clear previous generated content when fetching a new transcript
    setGeneratedContent(null);
    setContentActiveTab("twitter");
    setTranscript(text);
    setTranscriptMethod(method);
    if (title) setVideoTitle(title);
  };

  const handleGenerate = async () => {
    if (!transcript) {
      toast({
        variant: "destructive",
        title: "No transcript",
        description: "Please fetch or paste a transcript first.",
      });
      return;
    }

    // Check if user can generate (credit check)
    if (!canUseCredits) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    
    // Track generation started event
    trackGenerationStarted({
      hasYoutubeUrl: !!youtubeUrl,
      transcriptMethod,
      hasBrandVoice: !!selectedBrandVoice,
      tone,
      audience,
      targetLanguage,
    });

    try {
      // Build brand voice data - check if it's a default voice or user voice
      let brandVoiceData = null;
      
      if (selectedBrandVoice) {
        if (isDefaultVoiceId(selectedBrandVoice)) {
          // Use the default voice description
          const defaultVoice = getDefaultVoiceById(selectedBrandVoice);
          if (defaultVoice) {
            brandVoiceData = {
              name: defaultVoice.name,
              writingStyle: defaultVoice.description, // The full description becomes the writing style
              tone: null,
              keyPhrases: null,
              targetAudience: null,
            };
          }
        } else {
          // Use the user's custom voice from database
          const selectedVoice = brandVoices?.find(v => v.id === selectedBrandVoice);
          if (selectedVoice) {
            brandVoiceData = {
              name: selectedVoice.name,
              writingStyle: selectedVoice.writing_style || selectedVoice.description,
              tone: selectedVoice.tone,
              keyPhrases: selectedVoice.key_phrases,
              targetAudience: selectedVoice.target_audience,
            };
          }
        }
      }
      
      // Log social proof toggle state for debugging
      const socialProofUserId = includeSocialProof ? user?.id : undefined;
      console.log("Social Proof toggle:", includeSocialProof, "| userId sent to AI:", socialProofUserId);

      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          transcript,
          tone,
          audience,
          brandVoice: brandVoiceData,
          translateTo: targetLanguage !== "english" ? targetLanguage : null,
          userId: socialProofUserId,
        },
      });

      if (error) {
        const status = error?.context?.status;
        const message = typeof error?.message === "string" ? error.message : "";

        // Project-level AI gateway exhaustion (NOT user credits)
        if (
          status === 402 ||
          status === 503 ||
          message.includes("AI_CREDITS_EXHAUSTED") ||
          message.toLowerCase().includes("ai credits exhausted")
        ) {
          toast({
            variant: "destructive",
            title: "AI service credits exhausted",
            description:
              "This project’s AI service has run out of credits. Please add more credits to resume generating content.",
          });
          return;
        }

        // (Optional) If we ever enforce user credits server-side, handle it explicitly by code.
        if (message.includes("INSUFFICIENT_CREDITS")) {
          await refreshCredits();
          setShowCreditsModal(true);
          return;
        }

        throw error;
      }

      // Also check for error in data response (edge function might return error in body)
      if (data?.error) {
        if (data.code === "AI_CREDITS_EXHAUSTED" || String(data.error).toLowerCase().includes("ai service credits")) {
          toast({
            variant: "destructive",
            title: "AI service credits exhausted",
            description:
              "This project’s AI service has run out of credits. Please add more credits to resume generating content.",
          });
          return;
        }

        if (data.code === "INSUFFICIENT_CREDITS" || data.error?.includes("INSUFFICIENT_CREDITS")) {
          await refreshCredits();
          setShowCreditsModal(true);
          return;
        }

        throw new Error(data.error);
      }

      setGeneratedContent(data);
      
      // Scroll to top of content output after generation
      setTimeout(() => {
        contentOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      // Save to history - ensure brand_voice_id is a valid UUID or null
      // Default voice IDs (like "default_friendly_peer") are not in the database
      const isDefaultVoice = selectedBrandVoice && isDefaultVoiceId(selectedBrandVoice);
      const brandVoiceIdForDb = isDefaultVoice ? null : selectedBrandVoice;
      
      await supabase.from("generations").insert({
        user_id: user!.id,
        youtube_url: youtubeUrl || null,
        video_title: videoTitle || null,
        transcript: transcript || null,
        transcript_method: transcriptMethod || null,
        brand_voice_id: brandVoiceIdForDb,
        tone: tone || null,
        audience: audience || null,
        twitter_hooks: data.twitterHooks,
        linkedin_post: data.linkedinPost,
        short_form_scripts: data.shortFormScripts,
        blog_post: data.blogPost,
        target_language: targetLanguage !== "english" ? targetLanguage : null,
        social_proof_used: includeSocialProof,
      } as any);

      // Use one credit after successful generation (this also refreshes UI)
      await useCredit();

      // Reset the fetch counter for this URL — generation resets the "same-video" clock
      if (youtubeUrl) {
        await resetFetchCount(youtubeUrl);
      }

      toast({
        title: "All assets generated!",
        description: targetLanguage !== "english"
          ? `Content created in ${targetLanguage}. Saved to history.`
          : "Your multi-platform content has been saved to history.",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      
      const status = error?.context?.status;
      const errorMessage = typeof error?.message === "string" ? error.message : "";

      // Project-level AI gateway exhaustion (NOT user credits)
      if (
        status === 402 ||
        status === 503 ||
        errorMessage.includes("AI_CREDITS_EXHAUSTED") ||
        errorMessage.toLowerCase().includes("ai credits exhausted")
      ) {
        toast({
          variant: "destructive",
          title: "AI service credits exhausted",
          description:
            "This project’s AI service has run out of credits. Please add more credits to resume generating content.",
        });
        return;
      }

      if (errorMessage.includes("INSUFFICIENT_CREDITS")) {
        await refreshCredits();
        setShowCreditsModal(true);
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: errorMessage || "Failed to generate content. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateContent = (updated: GeneratedContent) => {
    setGeneratedContent(updated);
  };

  const scrollToYouTubeInput = () => {
    youtubeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner for Pro/Agency users */}
        <WelcomeBanner onScrollToInput={scrollToYouTubeInput} />
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Dashboard</h1>
          <p className="text-muted-foreground">
            Transform your YouTube videos into multi-platform content with batch processing
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => {
          if (v === "bulk" && !isAgency) {
            setShowBulkUpgradeModal(true);
            return;
          }
          setActiveTab(v as "single" | "bulk");
        }}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Single Video
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2 relative">
              <Layers className="h-4 w-4" />
              Bulk Upload
              {!isAgency && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left column - Input & Settings */}
              <div className="lg:col-span-1 space-y-6">
                <div ref={youtubeInputRef}>
                  <YouTubeInput
                    onTranscriptFetched={handleTranscriptFetched}
                    transcript={transcript}
                    transcriptMethod={transcriptMethod}
                    youtubeUrl={youtubeUrl}
                    setYoutubeUrl={setYoutubeUrl}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    fairUseConfirmed={fairUseConfirmed}
                    setFairUseConfirmed={setFairUseConfirmed}
                    hasPersistedContent={!!generatedContent}
                  />
                </div>
                
                <GenerationSettings
                  brandVoices={brandVoices || []}
                  selectedBrandVoice={selectedBrandVoice}
                  setSelectedBrandVoice={setSelectedBrandVoice}
                  tone={tone}
                  setTone={setTone}
                  audience={audience}
                  setAudience={setAudience}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  hasTranscript={!!transcript}
                  targetLanguage={targetLanguage}
                  setTargetLanguage={setTargetLanguage}
                  includeSocialProof={includeSocialProof}
                  setIncludeSocialProof={setIncludeSocialProof}
                  fairUseConfirmed={fairUseConfirmed}
                  setFairUseConfirmed={setFairUseConfirmed}
                />

                {/* Social Proof Widget */}
                <TopTestimonialsWidget />
              </div>

              {/* Right column - Output */}
              <div className="lg:col-span-2" ref={contentOutputRef}>
                <ContentOutput
                  content={generatedContent}
                  isGenerating={isGenerating}
                  onUpdateContent={handleUpdateContent}
                  targetLanguage={targetLanguage !== "english" ? targetLanguage : null}
                  youtubeUrl={youtubeUrl || null}
                  activeTab={contentActiveTab}
                  onActiveTabChange={setContentActiveTab}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            {/* Full-width workspace - no grid split */}
            <BulkUpload
              tone={tone}
              audience={audience}
              brandVoice={selectedBrandVoice ? (
                isDefaultVoiceId(selectedBrandVoice) 
                  ? getDefaultVoiceById(selectedBrandVoice)
                  : brandVoices?.find(v => v.id === selectedBrandVoice)
              ) : undefined}
              targetLanguage={targetLanguage}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Credits exhausted modal */}
      <PremiumModal 
        open={showCreditsModal} 
        onOpenChange={setShowCreditsModal}
        feature="generation-limit"
      />

      {/* Bulk processing upgrade modal */}
      <PremiumModal 
        open={showBulkUpgradeModal} 
        onOpenChange={setShowBulkUpgradeModal}
        feature="bulk-processing"
      />
    </AppLayout>
  );
}

