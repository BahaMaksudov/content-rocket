import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { YouTubeInput } from "@/components/dashboard/YouTubeInput";
import { GenerationSettings } from "@/components/dashboard/GenerationSettings";
import { ContentOutput } from "@/components/dashboard/ContentOutput";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { PremiumModal } from "@/components/PremiumModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useCredits } from "@/hooks/use-credits";
import { trackGenerationStarted, trackUpgradeClicked } from "@/lib/posthog";
import { toast as sonnerToast } from "sonner";

export interface GeneratedContent {
  twitterHooks: string[];
  linkedinPost: string;
  shortFormScripts: Array<{ title: string; script: string; duration: string }>;
  blogPost: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { openCheckout, loading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transcript, setTranscript] = useState("");
  const [transcriptMethod, setTranscriptMethod] = useState<"auto" | "manual" | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<string | null>(null);
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [upgradeProcessed, setUpgradeProcessed] = useState(false);
  
  // Unified credits tracking
  const { canUseCredits, useCredit, refreshCredits } = useCredits();
  
  // Global Reach state
  const [globalReachEnabled, setGlobalReachEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("spanish");
  
  // Ref for scrolling to content output
  const contentOutputRef = useRef<HTMLDivElement>(null);
  // Ref for scrolling to YouTube input
  const youtubeInputRef = useRef<HTMLDivElement>(null);

  // Handle upgrade query parameter from landing page
  useEffect(() => {
    const upgradeTier = searchParams.get("upgrade") as "pro" | "agency" | null;
    
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
      globalReachEnabled,
      targetLanguage: globalReachEnabled ? targetLanguage : null,
    });

    try {
      const selectedVoice = brandVoices?.find(v => v.id === selectedBrandVoice);
      
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          transcript,
          tone,
          audience,
          brandVoice: selectedVoice ? {
            name: selectedVoice.name,
            writingStyle: selectedVoice.writing_style,
            tone: selectedVoice.tone,
            keyPhrases: selectedVoice.key_phrases,
            targetAudience: selectedVoice.target_audience,
          } : null,
          translateTo: globalReachEnabled ? targetLanguage : null,
        },
      });

      if (error) {
        // Check for insufficient credits error from edge function
        if (error.message?.includes("INSUFFICIENT_CREDITS") || 
            error.context?.status === 402 ||
            (typeof error.message === 'string' && error.message.includes("402"))) {
          // Refresh credits to sync UI state
          await refreshCredits();
          setShowCreditsModal(true);
          return;
        }
        throw error;
      }

      // Also check for error in data response (edge function might return error in body)
      if (data?.error) {
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

      // Save to history
      await supabase.from("generations").insert({
        user_id: user!.id,
        youtube_url: youtubeUrl,
        video_title: videoTitle,
        transcript,
        transcript_method: transcriptMethod,
        brand_voice_id: selectedBrandVoice,
        tone,
        audience,
        twitter_hooks: data.twitterHooks,
        linkedin_post: data.linkedinPost,
        short_form_scripts: data.shortFormScripts,
        blog_post: data.blogPost,
        target_language: globalReachEnabled ? targetLanguage : null,
      });

      // Use one credit after successful generation (this also refreshes UI)
      await useCredit();

      toast({
        title: "All assets generated!",
        description: globalReachEnabled 
          ? `Content created and translated to ${targetLanguage}. Saved to history.`
          : "Your multi-platform content has been saved to history.",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      
      // Check for 402/insufficient credits in catch block as well
      const errorMessage = error?.message || "";
      if (errorMessage.includes("INSUFFICIENT_CREDITS") || 
          errorMessage.includes("402") ||
          error?.context?.status === 402) {
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
                onCreditUsed={refreshCredits}
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
              globalReachEnabled={globalReachEnabled}
              setGlobalReachEnabled={setGlobalReachEnabled}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
            />
          </div>

          {/* Right column - Output */}
          <div className="lg:col-span-2" ref={contentOutputRef}>
            <ContentOutput
              content={generatedContent}
              isGenerating={isGenerating}
              onUpdateContent={handleUpdateContent}
              targetLanguage={globalReachEnabled ? targetLanguage : null}
            />
          </div>
        </div>
      </div>
      
      {/* Credits exhausted modal */}
      <PremiumModal 
        open={showCreditsModal} 
        onOpenChange={setShowCreditsModal}
        feature="generation-limit"
      />
    </AppLayout>
  );
}
