import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Volume2, Loader2, Lock, Crown, Rocket, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  getVoiceById, 
  getDefaultVoice, 
  getVoicesForTier,
} from "@/lib/voice-archetypes";
import { AudioPlayer } from "./AudioPlayer";
import { PremiumModal } from "@/components/PremiumModal";
import { useAudioCredits } from "@/hooks/use-audio-credits";

interface VoiceGeneratorProps {
  scriptText: string;
  targetLanguage?: string | null;
}

export function VoiceGenerator({ scriptText, targetLanguage }: VoiceGeneratorProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const { tier, isPro, isAgency, loading: subscriptionLoading } = useSubscription();
  const { minutesRemaining, totalMinutes, hasMinutes, refreshAudioCredits, loading: audioLoading } = useAudioCredits();
  
  const [selectedVoiceId, setSelectedVoiceId] = useState(getDefaultVoice().id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isFreeUser = tier === "free";
  const isPaidUser = !isFreeUser;
  const voices = getVoicesForTier(tier);

  // Language restriction: only English is supported
  const currentLang = (targetLanguage || "english").toLowerCase();
  const isEnglish = currentLang === "english";
  const isLanguageBlocked = isPaidUser && !isEnglish;
  const isLimitReached = isPaidUser && !hasMinutes;

  // Determine if button should be disabled
  const isButtonDisabled = isGenerating || subscriptionLoading || audioLoading || isLanguageBlocked || isLimitReached;

  // Validate and clean the script text
  const getCleanScriptText = (): string => {
    if (!scriptText) return '';
    if (typeof scriptText === 'string') return scriptText.trim();
    if (Array.isArray(scriptText)) {
      return (scriptText as unknown[])
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            return String(obj.text || obj.snippet || obj.content || '');
          }
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    if (typeof scriptText === 'object') {
      const obj = scriptText as Record<string, unknown>;
      return String(obj.text || obj.snippet || obj.content || '').trim();
    }
    return '';
  };

  const handleGenerateAudio = async () => {
    if (isFreeUser) {
      setShowUpgradeModal(true);
      return;
    }

    if (isLanguageBlocked) {
      toast({
        title: "Language not supported",
        description: "Voice generation is currently only available for English.",
        variant: "destructive",
      });
      return;
    }

    if (isLimitReached) {
      setShowUpgradeModal(true);
      return;
    }

    const cleanText = getCleanScriptText();
    
    if (!cleanText || cleanText.length < 10) {
      toast({
        title: "No script content",
        description: "Please generate a script first before converting to audio.",
        variant: "destructive",
      });
      return;
    }

    const voice = getVoiceById(selectedVoiceId);
    if (!voice) {
      toast({
        title: "Voice not found",
        description: "Please select a valid voice.",
        variant: "destructive",
      });
      return;
    }

    if (voice.tier === "agency" && !isAgency) {
      toast({
        title: "Agency voice",
        description: "This voice is only available to Agency users.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setAudioUrl(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token || session?.access_token;

      if (!accessToken) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use voice generation.",
          variant: "destructive",
        });
        return;
      }

      const makeRequest = async (token: string) =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: cleanText,
            voiceId: voice.voiceId,
            performancePrompt: voice.performancePrompt,
            targetLanguage: "english",
          }),
        });

      let response = await makeRequest(accessToken);
      let errorData: any = null;

      // Handle auth errors with retry
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        errorData = await response.json().catch(() => ({}));

        const isTierError =
          errorData?.code === "SUBSCRIPTION_REQUIRED" || errorData?.code === "AGENCY_REQUIRED";

        const looksLikeTokenError =
          !isTierError &&
          (typeof errorData?.error !== "string" || /token|jwt|expired|invalid/i.test(errorData.error));

        const shouldRefreshAndRetry = response.status === 401 || (response.status === 403 && looksLikeTokenError);

        if (shouldRefreshAndRetry) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          const refreshedToken = refreshed?.session?.access_token;
          if (!refreshError && refreshedToken) {
            accessToken = refreshedToken;
            response = await makeRequest(accessToken);
            if (!response.ok) {
              errorData = await response.json().catch(() => ({}));
            }
          }
        }
      }

      if (!response.ok) {
        if (!errorData) {
          errorData = await response.json().catch(() => ({}));
        }

        if (response.status === 403 && errorData?.code === "SUBSCRIPTION_REQUIRED") {
          setShowUpgradeModal(true);
          throw new Error("Upgrade required to use voice generation");
        }

        if (response.status === 429 && errorData?.code === "AUDIO_LIMIT_EXCEEDED") {
          setShowUpgradeModal(true);
          throw new Error("Monthly audio limit reached");
        }

        if (response.status === 400 && errorData?.code === "LANGUAGE_NOT_SUPPORTED") {
          throw new Error("Voice generation is currently only available for English");
        }

        throw new Error(errorData?.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      setProgress(100);
      setAudioUrl(url);

      // Refresh audio credits to reflect new usage
      await refreshAudioCredits();
      
      toast({
        title: "Audio generated!",
        description: `Your script is now voiced by ${voice.name}.`,
      });

    } catch (error) {
      console.error("Audio generation error:", error);
      
      if (error instanceof Error && !error.message.includes("Upgrade") && !error.message.includes("limit reached")) {
        toast({
          title: "Audio generation failed",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setProgress(0);
  };

  // If audio is generated, show the player
  if (audioUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Audio generated with {getVoiceById(selectedVoiceId)?.name}</span>
        </div>
        <AudioPlayer audioUrl={audioUrl} onReset={handleReset} />
      </div>
    );
  }

  // Determine button label and tooltip
  const getButtonContent = () => {
    if (isGenerating) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      );
    }
    if (isFreeUser) {
      return (
        <>
          <Lock className="h-4 w-4 mr-2" />
          Convert to Audio
        </>
      );
    }
    if (isLimitReached) {
      return (
        <>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Limit Reached
        </>
      );
    }
    if (isLanguageBlocked) {
      return (
        <>
          <Lock className="h-4 w-4 mr-2" />
          Convert to Audio
        </>
      );
    }
    return (
      <>
        <Volume2 className="h-4 w-4 mr-2" />
        Convert to Audio
      </>
    );
  };

  const getTooltipMessage = (): string | null => {
    if (isLanguageBlocked) return "Voice generation is currently only available for English";
    if (isLimitReached) return "Monthly audio limit reached. Upgrade your plan for more minutes.";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  // Show generation controls
  return (
    <>
      <div className="space-y-3">
        {/* Voice Selection, Generate Button & Minutes Remaining */}
        <div className="flex flex-wrap items-center gap-4">
          <Select 
            value={selectedVoiceId} 
            onValueChange={setSelectedVoiceId}
            disabled={isFreeUser}
          >
            <SelectTrigger className={`w-[260px] ${isFreeUser ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="Select Voice" />
            </SelectTrigger>
            <SelectContent className="z-[100] min-w-[280px]">
              {/* Standard Voices - Pro & Agency */}
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1 py-2">
                  <Crown className="h-3 w-3 text-primary" />
                  Character Voices
                </SelectLabel>
                {voices.standard.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id} className="py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>

              {/* Cloned Voices - Agency Only */}
              {isAgency && voices.cloned.length > 0 && (
                <>
                  <SelectSeparator className="my-2" />
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1 py-2">
                      <Rocket className="h-3 w-3 text-primary" />
                      Premium Cloned Voices
                    </SelectLabel>
                    {voices.cloned.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}

              {/* Show locked message for Pro users */}
              {isPro && !isAgency && (
                <>
                  <SelectSeparator className="my-2" />
                  <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Cloned voices available with Agency</span>
                  </div>
                </>
              )}
            </SelectContent>
          </Select>

          {/* Generate button with tooltip when disabled */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    onClick={handleGenerateAudio}
                    disabled={isButtonDisabled || getCleanScriptText().length < 10}
                    variant={isFreeUser || isLimitReached ? "outline" : "secondary"}
                    className={isFreeUser || isLanguageBlocked || isLimitReached ? "opacity-75" : ""}
                  >
                    {getButtonContent()}
                  </Button>
                </span>
              </TooltipTrigger>
              {tooltipMessage && (
                <TooltipContent>
                  <p>{tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Minutes Remaining indicator */}
          {isPaidUser && !audioLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {isLimitReached ? (
                  <span className="text-destructive font-medium">0 / {totalMinutes} min remaining</span>
                ) : (
                  <span>{minutesRemaining} / {totalMinutes} min remaining</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Free user hint */}
        {isFreeUser && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Voice generation is a Pro feature
          </p>
        )}

        {/* Language restriction message */}
        {isLanguageBlocked && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Voice generation is currently only available for English
          </p>
        )}

        {/* Limit reached message */}
        {isLimitReached && !isFreeUser && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Monthly audio limit reached. Upgrade your plan for more minutes.
          </p>
        )}

        {/* Model badge for paid users */}
        {isPaidUser && !isGenerating && !isLanguageBlocked && !isLimitReached && (
          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Volume2 className="h-2.5 w-2.5" />
            Powered by ElevenLabs Multilingual v2
          </p>
        )}

        {/* Progress Bar during generation */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Generating audio... {progress}%
            </p>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="voice-generation"
        description={
          isLimitReached
            ? "You've used all your audio minutes this month. Upgrade your plan to get more audio generation time!"
            : "Convert your scripts into professional AI-powered audio with 5 unique character voices. Upgrade to Pro to unlock this feature!"
        }
      />
    </>
  );
}
