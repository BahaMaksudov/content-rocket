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
  const [streamingText, setStreamingText] = useState("");
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
      
      // Use streaming for real-time feedback
      setStreamingText("");
      setGeneratedContent(null);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
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
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503 || errorData?.code === "AI_CREDITS_EXHAUSTED") {
          toast({
            variant: "destructive",
            title: "AI service credits exhausted",
            description: "This project's AI service has run out of credits. Please add more credits to resume generating content.",
          });
          return;
        }
        
        if (response.status === 429) {
          toast({
            variant: "destructive",
            title: "Rate limit exceeded",
            description: "Please wait a moment and try again.",
          });
          return;
        }
        
        throw new Error(errorData?.error || "Generation failed");
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalContent: GeneratedContent | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === "delta") {
                  setStreamingText(prev => prev + parsed.content);
                } else if (parsed.type === "status") {
                  // Show translation status
                  sonnerToast.info(parsed.message);
                } else if (parsed.type === "complete") {
                  finalContent = parsed.content;
                  setGeneratedContent(parsed.content);
                  setStreamingText("");
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Skip malformed JSON lines
                if (data !== "[DONE]" && data.trim()) {
                  console.log("Skipping non-JSON line:", data);
                }
              }
            }
          }
        }
      }

      if (!finalContent) {
        throw new Error("No content received from stream");
      }
      
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
        twitter_hooks: finalContent.twitterHooks,
        linkedin_post: finalContent.linkedinPost,
        short_form_scripts: finalContent.shortFormScripts,
        blog_post: finalContent.blogPost,
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
              streamingText={streamingText}
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
