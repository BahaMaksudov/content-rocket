import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { YouTubeInput } from "@/components/dashboard/YouTubeInput";
import { GenerationSettings } from "@/components/dashboard/GenerationSettings";
import { ContentOutput } from "@/components/dashboard/ContentOutput";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { PremiumModal } from "@/components/PremiumModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useGenerationCredits } from "@/hooks/use-generation-credits";

export interface GeneratedContent {
  twitterHooks: string[];
  linkedinPost: string;
  shortFormScripts: Array<{ title: string; script: string; duration: string }>;
  blogPost: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  
  // Generation credits tracking
  const { canGenerate, incrementCredits, refreshCredits } = useGenerationCredits();
  
  // Global Reach state
  const [globalReachEnabled, setGlobalReachEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("spanish");
  
  // Ref for scrolling to content output
  const contentOutputRef = useRef<HTMLDivElement>(null);
  // Ref for scrolling to YouTube input
  const youtubeInputRef = useRef<HTMLDivElement>(null);

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

    // Check if user can generate (free tier limit check)
    if (!canGenerate) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);

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

      if (error) throw error;

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
      });

      // Increment credits only after successful generation (this also refreshes UI)
      await incrementCredits();

      toast({
        title: "All assets generated!",
        description: globalReachEnabled 
          ? `Content created and translated to ${targetLanguage}. Saved to history.`
          : "Your multi-platform content has been saved to history.",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Failed to generate content. Please try again.",
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
